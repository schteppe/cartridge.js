var utils = require('./utils');

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

var channels = [];
for(var j=0; j<4; j++){
	var channel = {
		oscillators: {},
		gains: {},
		occupiedUntil: -1
	};
	channels.push(channel);

	// add oscillators and gains to channel
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
}

var maxEffects = 64;
var effects = [];
for(var i=0; i<maxEffects; i++){
	effects.push({
		types: utils.zeros(maxEffects),
		frequencies: utils.zeros(maxEffects),
		volumes: utils.zeros(maxEffects),
		speed: 1
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
	var osc = channel.oscillators[oscillatorTypes[types[offset+0]]];
	var gain = channel.gains[oscillatorTypes[types[offset+0]]];
	gain.gain.value = volumes[offset+0];
	osc.frequency.value = frequencies[offset+0];

	var len = (types.length - offset) / speed;
	var currentTime = context.currentTime;
	for(i=offset; i<types.length; i++){
		var type = oscillatorTypes[types[i]];
		osc = channel.oscillators[type];

		var startTime = currentTime + (len / types.length) * i;

		// Set other gains to zero
		for(j=0; j<oscillatorTypes.length; j++){
			gain = channel.gains[oscillatorTypes[j]];
			if(oscillatorTypes[j] !== type){
				gain.gain.setValueAtTime(0, startTime);
			} else {
				osc.frequency.setValueAtTime(frequencies[i], startTime);
				gain.gain.setValueAtTime(volumes[i], startTime);
			}
		}
	}

	// Set the volume at the end to zero
	var endTime = currentTime + len;
	for(j=0; j<oscillatorTypes.length; j++){
		gain = channel.gains[oscillatorTypes[j]];
		gain.gain.setValueAtTime(0, endTime);
	}

	channel.occupiedUntil = endTime;
}

exports.sfx = function(n, channelIndex, offset){
	channelIndex = channelIndex !== undefined ? channelIndex : -1;
	offset = offset !== undefined ? offset : 0;

	var effect = effects[n];
	if(!effect){
		return false;
	}

	if(channelIndex === -1){
		for(var i=0; i<channels.length; i++){
			var candidateIndex = i;
			if(channels[candidateIndex].occupiedUntil < context.currentTime){
				channelIndex = candidateIndex;
				break;
			}
		}
	} else if(channels[channelIndex].occupiedUntil >= context.currentTime){
		return false;
	}

	if(!channels[channelIndex]){
		return false;
	}

	play(channels[channelIndex], effect.types, effect.frequencies, effect.volumes, effect.speed, offset);

	return true;
};