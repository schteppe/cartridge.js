var utils = require('./utils');
var DFT = require('dsp.js/dsp').DFT;
var aWeight = require('a-weighting/a');

var context, masterGain;

var defaultSpeed = 16;
var minFrequency = 0;
var maxFrequency = 1000;
var maxEffects = 64;
var channels = [];
var effects = [];

var getContext = exports.getContext = function(){
	if(!context){
		context = new createAudioContext();
		masterGain = context.createGain();
		masterGain.gain.value = 0.1;
		masterGain.connect(context.destination);
	}
	return context;
};

exports.getMasterGain = function(){
	if(!masterGain){
		getContext();
	}
	return masterGain;
};

var oscillatorTypes = [
	'sine',
	'square',
	'triangle',
	'sawtooth'
];

exports.rms = {
	sine: 1 / Math.sqrt(2),
	square: 1,
	triangle: 1 / Math.sqrt(3),
	sawtooth: 1 / Math.sqrt(3),
	square25: 1 * Math.sqrt(0.25),
	white: 1 // ?
};

var allTypes = oscillatorTypes.concat([
	'square25',
	'white'
]);

exports.getOscillatorTypes = function(){
	return oscillatorTypes;
};

exports.getAllOscillatorTypes = function(){
	return allTypes;
};

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

	// Get the length by looking at the volume values
	var endPosition = 0;
	for(i=0; i<volumes.length; i++){
		if(volumes[i] > 0){
			endPosition = i + 1;
		}
	}
	if(endPosition === 0) return;

	var currentTime = getContext().currentTime;

	var prevType = null;
	for(j=offset; j<endPosition; j++){
		var type = allTypes[types[j]];
		var gain = channel.gains[type];
		var osc = channel.oscillators[type];
		var startTime = currentTime + j / speed;

		if(prevType !== type && prevType !== null){
			channel.gains[prevType].gain.setTargetAtTime(0, startTime, 0.00001);
		}

		var vol = volumes[j] / 255 * (1 / exports.rms[type]);

		if(osc.frequency){ // noise doesn't have frequency
			var frequency = frequencies[j] / 255 * (maxFrequency - minFrequency) + minFrequency;
			osc.frequency.setValueAtTime(frequency, startTime);
			//if(frequency !== 0) vol /= aWeight(frequency);
		}

		gain.gain.setValueAtTime(vol, startTime);

		prevType = type;
	}

	// Set the volume at the end to zero
	if(prevType !== null){
		var len = (endPosition - offset) / speed;
		var endTime = currentTime + len;
		channel.gains[prevType].gain.setTargetAtTime(0, endTime, 0.00001);
	}

	channel.occupiedUntil = endTime;
}

// Speed is 0 to 255
exports.asset = function(n, speed){
	effects[n].speed = (speed === undefined ? defaultSpeed : speed);
};
exports.asget = function(n){
	return effects[n] && effects[n].speed;
};

// volume is 0 to 255
exports.avset = function(n, offset, volume){ effects[n].volumes[offset] = (volume !== undefined ? volume : 0); };
exports.avget = function(n, offset){ return effects[n] && effects[n].volumes[offset]; };

// frequency is 0 to 255
exports.afset = function(n, offset, frequency){ effects[n].frequencies[offset] = (frequency !== undefined ? frequency : 0); };
exports.afget = function(n, offset){ return effects[n] && effects[n].frequencies[offset]; };

// wave is 0,1,2,3,4
exports.awset = function(n, offset, waveform){ effects[n].types[offset] = (waveform !== undefined ? waveform : 0); };
exports.awget = function(n, offset){ return effects[n] && effects[n].types[offset]; };

exports.sfx = function(n, channelIndex, offset){
	channelIndex = channelIndex !== undefined ? channelIndex : -1;
	offset = offset !== undefined ? offset : 0;

	var effect = effects[n];
	if(!effect){
		return false;
	}

	var contextTime = getContext().currentTime;
	if(channelIndex === -1){
		// Find good channel
		for(var i=0; i<channels.length; i++){
			var candidateIndex = i;
			if(channels[candidateIndex].occupiedUntil < contextTime){
				channelIndex = candidateIndex;
				break;
			}
		}
	} else if(!channels[channelIndex] || channels[channelIndex].occupiedUntil >= contextTime){
		return false;
	}

	if(!channels[channelIndex]){
		return false;
	}

	play(channels[channelIndex], effect.types, effect.frequencies, effect.volumes, effect.speed, offset);

	return true;
};

var whiteNoiseData = null;
exports.createWhiteNoise = function(destination) {
	var ctx = getContext();
	var bufferSize = 2 * ctx.sampleRate,
		noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate),
		output = noiseBuffer.getChannelData(0);

	if(!whiteNoiseData){
		whiteNoiseData = new Float32Array(bufferSize);
		for (var i = 0; i < bufferSize; i++) {
			whiteNoiseData[i] = Math.random() * 2 - 1;
		}
	}

	output.set(whiteNoiseData);

	var whiteNoise = ctx.createBufferSource();
	whiteNoise.buffer = noiseBuffer;
	whiteNoise.loop = true;

	whiteNoise.connect(destination);

	return whiteNoise;
};

var dft = null;
var pulseWave = null;
exports.createPulse = function(destination){
	var ctx = getContext();
	if(!dft){
		var count = 128;
		var vals2 = [];
		for (var i = 0; i < count; i++) {
			var x = i / count;
			var val = x < 0.25 ? -1 : 1;
			vals2.push(val);
		}

		dft = new DFT(vals2.length);
		dft.forward(vals2);

		// DFT outputs Float64Array but only Float32Arrays are allowed in createPeriodicWave
		pulseWave = ctx.createPeriodicWave(
			new Float32Array(dft.real),
			new Float32Array(dft.imag)
		);
	}

	var osc = ctx.createOscillator();
	osc.setPeriodicWave(pulseWave);
	osc.connect(destination);

	return osc;
};

function initChannels(){
	var ctx = getContext();

	for(var j=0; j<4; j++){
		var channel = {
			oscillators: {},
			gains: {},
			occupiedUntil: -1
		};
		channels.push(channel);

		// add 4 basic oscillators and gains to channel
		for(var i=0; i<oscillatorTypes.length; i++){
			var osc = ctx.createOscillator();
			var type = oscillatorTypes[i];
			osc.type = type;

			var gain = ctx.createGain();
			gain.gain.value = 0.0001;
			gain.connect(masterGain);

			osc.connect(gain);
			channel.oscillators[type] = osc;
			channel.gains[type] = gain;
		}

		// Add square25 / pulse
		var gain = ctx.createGain();
		gain.gain.value = 0.0001;
		gain.connect(masterGain);
		var square25 = exports.createPulse(gain);
		channel.oscillators.square25 = square25;
		channel.gains.square25 = gain;

		// Add white noise
		gain = ctx.createGain();
		gain.gain.value = 0.0001;
		gain.connect(masterGain);
		var whiteNoise = exports.createWhiteNoise(gain);
		channel.oscillators.white = whiteNoise;
		channel.gains.white = gain;
	}
}

function startChannels(time){
	channels.forEach(function(channel){
		for(var instrumentName in channel.oscillators){
			var oscillator = channel.oscillators[instrumentName];
			oscillator.start(time);
		}
	});
}

exports.iosFix = function(){
	initChannels();
	var time = getContext().currentTime;
	try {
		startChannels(time);
	} catch(err){
		console.error(err);
	}
};

for(var i=0; i<maxEffects; i++){
	effects.push({
		types: utils.zeros(maxEffects),
		frequencies: utils.zeros(maxEffects),
		volumes: utils.zeros(maxEffects),
		speed: defaultSpeed
	});
}

exports.global = {
	asset: exports.asset,
	asget: exports.asget,
	avset: exports.avset,
	avget: exports.avget,
	afset: exports.afset,
	afget: exports.afget,
	awset: exports.awset,
	awget: exports.awget,
	sfx: exports.sfx
};