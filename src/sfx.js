var utils = require('./utils');
var DFT = require('dsp.js/dsp').DFT;
var minFrequency = 0;
var maxFrequency = 1000;

var context = new createAudioContext();
var masterGain = context.createGain();
masterGain.gain.value = 1;
masterGain.connect(context.destination);

var oscillatorTypes = [
	'sine',
	'square',
	'triangle',
	'sawtooth'
];

var allTypes = oscillatorTypes.concat([
	'square25',
	'white'
]);

var channels = [];
for(var j=0; j<4; j++){
	var channel = {
		oscillators: {},
		gains: {},
		occupiedUntil: -1
	};
	channels.push(channel);

	// add 4 basic oscillators and gains to channel
	for(var i=0; i<oscillatorTypes.length; i++){
		var osc = context.createOscillator();
		var type = oscillatorTypes[i];
		osc.type = type;

		var gain = context.createGain();
		gain.gain.value = 0;
		gain.connect(masterGain);

		osc.connect(gain);
		channel.oscillators[type] = osc;
		channel.gains[type] = gain;
		osc.start(context.currentTime);
	}

	// Add square25 / pulse
	var gain = context.createGain();
	gain.gain.value = 0;
	gain.connect(masterGain);
	var square25 = createPulse(gain);
	channel.oscillators.square25 = square25;
	channel.gains.square25 = gain;
	square25.start(context.currentTime);

	// Add white noise
	gain = context.createGain();
	gain.gain.value = 0;
	gain.connect(masterGain);
	var whiteNoise = createWhiteNoise(gain);
	channel.oscillators.white = whiteNoise;
	channel.gains.white = gain;
	whiteNoise.start(context.currentTime);
}

var maxEffects = 64;
var effects = [];
for(var i=0; i<maxEffects; i++){
	effects.push({
		types: utils.zeros(maxEffects),
		frequencies: utils.zeros(maxEffects),
		volumes: utils.zeros(maxEffects),
		speed: 16
	});
}

function createAudioContext(desiredSampleRate) {
	var AudioCtor = window.AudioContext || window.webkitAudioContext;
	desiredSampleRate = typeof desiredSampleRate === 'number' ? desiredSampleRate : 44100;
	var context = new AudioCtor();
	// Check if hack is necessary. Only occurs in iOS6+ devices
	// and only when you first boot the iPhone, or play a audio/video
	// with a different sample rate
	if (/(iPhone|iPad)/i.test(navigator.userAgent) && context.sampleRate !== desiredSampleRate) {
		var buffer = context.createBuffer(1, 1, desiredSampleRate);
		var dummy = context.createBufferSource();
		dummy.buffer = buffer;
		dummy.connect(context.destination);
		dummy.start(0);
		dummy.disconnect();
		context.close();
		// dispose old context
		context = new AudioCtor();
	}
	return context;
}

function play(channel, types, frequencies, volumes, speed, offset){
	var i,j;
	var osc = channel.oscillators[allTypes[types[offset+0]]];
	var gain = channel.gains[allTypes[types[offset+0]]];
	gain.gain.value = volumes[offset+0] / 255;
	if(osc.frequency){ // noises dont have frequency
		osc.frequency.value = frequencies[offset+0] / 255 * (maxFrequency - minFrequency) + minFrequency;
	}

	// Get the length by looking at the volume values
	var endPosition = 0;
	for(i=0; i<volumes.length; i++){
		if(volumes[i]){
			endPosition = i + 1;
		}
	}
	if(endPosition === 0) return;

	var currentTime = context.currentTime;
	for(i=offset; i<endPosition; i++){
		var type = allTypes[types[i]];
		osc = channel.oscillators[type];

		var startTime = currentTime + i / speed;

		for(j=0; j<allTypes.length; j++){
			gain = channel.gains[allTypes[j]];

			// Set other gains to zero
			if(allTypes[j] !== type){
				gain.gain.setValueAtTime(0, startTime);
			} else {
				if(osc.frequency){ // noise doesn't have frequency
					osc.frequency.setValueAtTime(frequencies[i] / 255 * (maxFrequency - minFrequency) + minFrequency, startTime);
				}
				var vol = volumes[i] / 255;
				gain.gain.setValueAtTime(vol, startTime);
			}
		}
	}

	// Set the volume at the end to zero
	var len = (endPosition-offset) / speed;
	var endTime = currentTime + len;
	for(j=0; j<allTypes.length; j++){
		gain = channel.gains[allTypes[j]];
		gain.gain.setValueAtTime(0, endTime);
	}

	channel.occupiedUntil = endTime;
}

// Speed is 0 to 255
exports.asset = function(n, speed){ effects[n].speed = speed; };
exports.asget = function(n){ return effects[n].speed; };

// volume is 0 to 255
exports.avset = function(n, offset, volume){ effects[n].volumes[offset] = volume; };
exports.avget = function(n, offset){ return effects[n].volumes[offset]; };

// frequency is 0 to 255
exports.afset = function(n, offset, frequency){ effects[n].frequencies[offset] = frequency; };
exports.afget = function(n, offset){ return effects[n].frequencies[offset]; };

// wave is 0,1,2,3,4
exports.awset = function(n, offset, waveform){ effects[n].types[offset] = waveform; };
exports.awget = function(n, offset){ return effects[n].types[offset]; };

exports.sfx = function(n, channelIndex, offset){
	channelIndex = channelIndex !== undefined ? channelIndex : -1;
	offset = offset !== undefined ? offset : 0;

	var effect = effects[n];
	if(!effect){
		return false;
	}

	var contextTime = context.currentTime;
	if(channelIndex === -1){
		// Find good channel
		for(var i=0; i<channels.length; i++){
			var candidateIndex = i;
			if(channels[candidateIndex].occupiedUntil < contextTime){
				channelIndex = candidateIndex;
				break;
			}
		}
	} else if(channels[channelIndex].occupiedUntil >= contextTime){
		return false;
	}

	if(!channels[channelIndex]){
		return false;
	}

	play(channels[channelIndex], effect.types, effect.frequencies, effect.volumes, effect.speed, offset);

	return true;
};

function createWhiteNoise(destination) {
	var bufferSize = 2 * context.sampleRate,
		noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate),
		output = noiseBuffer.getChannelData(0);
	for (var i = 0; i < bufferSize; i++) {
		output[i] = Math.random() * 2 - 1;
	}

	var whiteNoise = context.createBufferSource();
	whiteNoise.buffer = noiseBuffer;
	whiteNoise.loop = true;

	whiteNoise.connect(destination);

	return whiteNoise;
}

function createPulse(destination){
	var count = 128;
	var vals2 = [];
	for (var i = 0; i < count; i++) {
		var x = i / count;
		var val = x < 0.25 ? -1 : 1;
		vals2.push(val);
	}

 	var a = new DFT(vals2.length);
	a.forward(vals2);
	var hornTable = context.createPeriodicWave(
		new Float32Array(a.real), // DFT outputs Float64Array but only Float32Arrays are allowed in createPeriodicWave
		new Float32Array(a.imag)
	);

	osc = context.createOscillator();
	osc.setPeriodicWave(hornTable);
	osc.connect(destination);

	return osc;
}
