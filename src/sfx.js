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

var pulseWave = null;
exports.createPulse = (function(){
	var precomputedReal = new Float32Array([64,-41.7354838720833,-2.000000000000013,12.55666924235241,-4.218847493575595e-15,-9.107785803676917,-2.000000000000006,4.763142005118801,-2.1538326677728037e-14,-5.453202224414392,-2.0000000000000044,2.6135356813074284,-1.4432899320127035e-15,-4.027043204317771,-1.99999999999999,1.592402517738097,-1.9984014443252818e-15,-3.255963851929147,-2.000000000000006,0.9866587923433658,1.6653345369377348e-15,-2.765246870094198,-2.000000000000039,0.5791725679601756,1.7208456881689926e-14,-2.4198909034940805,-2.000000000000024,0.28138158003651326,-9.325873406851315e-15,-2.159277907333491,-2.0000000000000036,0.05033284623987221,8.859085136287789e-14,-1.9520791467009704,-1.9999999999999916,-0.13739406774328866,-6.356026815979021e-15,-1.7804076596538123,-2.000000000000057,-0.295720539134987,3.0309088572266774e-14,-1.6332430161775204,-1.9999999999999505,-0.4335069972696313,-3.042011087472929e-14,-1.5033576997994489,-1.9999999999999827,-0.5567304861091547,-8.604228440844963e-14,-1.3857425662711131,-2.000000000000107,-0.6696446226556567,1.7763568394002505e-15,-1.2767372701404007,-2.0000000000000835,-0.7754424906829002,-1.4876988529977098e-14,-1.1735164601379022,-1.999999999999978,-0.8766617638633364,-9.547918011776346e-14,-1.0737644315224733,-1.999999999999912,-0.9754513778910673,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
	var precomputedImag = new Float32Array([0,-39.735483872083314,-40.71093524997436,-14.556669242352424,9.992007221626409e-16,-7.107785803676901,-13.482904810829984,-6.763142005118814,7.271960811294775e-15,-3.453202224414375,-7.984447567540168,-4.613535681307404,1.0436096431476471e-14,-2.0270432043177973,-5.589625544980945,-3.5924025177380394,-2.220446049250313e-15,-1.2559638519291436,-4.2286447150972695,-2.9866587923433774,2.220446049250313e-16,-0.7652468700941705,-3.3367984111669924,-2.579172567960273,-6.772360450213455e-15,-0.4198909034941066,-2.696687826973418,-2.2813815800365647,-1.1102230246251565e-14,-0.15927790733345903,-2.206659951466887,-2.050332846239848,-2.3092638912203256e-14,0.047920853299072474,-1.8126943380382934,-1.8626059322566446,-3.4416913763379853e-15,0.21959234034603892,-1.4833010925440338,-1.7042794608649952,-1.4654943925052066e-14,0.3667569838224308,-1.1987538673638785,-1.566493002730366,-3.319566843629218e-14,0.4966423002007726,-0.9459295517827979,-1.4432695138908986,1.1146639167236572e-13,0.6142574337288379,-0.7156114426290645,-1.3303553773443595,9.214851104388799e-14,0.7232627298595596,-0.5009739203825436,-1.2245575093172396,7.93809462606987e-15,0.8264835398621697,-0.2966719750764519,-1.1233382361367166,-1.101063684671999e-13,0.9262355684774854,-0.09825369953883527,-1.0245486221088935,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);

	return function(destination){
		var ctx = getContext();
		if(!pulseWave){

			/*
			var count = 128;
			var vals2 = [];
			for (var i = 0; i < count; i++) {
				var x = i / count;
				var val = x < 0.25 ? -1 : 1;
				vals2.push(val);
			}

			var dft = new DFT(vals2.length);
			dft.forward(vals2);

			// DFT outputs Float64Array but only Float32Arrays are allowed in createPeriodicWave
			pulseWave = ctx.createPeriodicWave(
				new Float32Array(dft.real),
				new Float32Array(dft.imag)
			);
			*/

			pulseWave = ctx.createPeriodicWave(
				precomputedReal,
				precomputedImag
			);
		}

		var osc = ctx.createOscillator();
		osc.setPeriodicWave(pulseWave);
		osc.connect(destination);

		return osc;
	};
})();

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