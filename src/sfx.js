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

var context = new createAudioContext();
var masterGain = context.createGain();
masterGain.gain.value = 1;
masterGain.connect(context.destination);

// oscillators
var oscillatorTypes = [
	'sine',
	'square',
	'triangle',
	'sawtooth'
];
var oscillators = {};
var gains = {};
for(var i=0; i<oscillatorTypes.length; i++){
	var osc = context.createOscillator();
	var type = oscillatorTypes[i];
	osc.type = type;

	var gain = context.createGain();
	gain.gain.value = 0;
	gain.connect(masterGain);

	osc.connect(gain);
	oscillators[type] = osc;
	gains[type] = gain;
	osc.start(context.currentTime);
}

exports.play = function(types, frequencies, volumes, speed){
	var osc = oscillators[types[0]];
	var gain = gains[types[0]];
	gain.gain.value = volumes[0];
	osc.frequency.value = frequencies[0];

	var len = types.length / speed;
	var currentTime = context.currentTime;
	for(var i=0; i<types.length; i++){
		var type = types[i];
		osc = oscillators[type];

		var startTime = currentTime + (len / types.length) * i;

		// Set other gains to zero
		for(var j=0; j<oscillatorTypes.length; j++){
			gain = gains[oscillatorTypes[j]];
			if(oscillatorTypes[j] !== type){
				gain.gain.setValueAtTime(0, startTime);
			} else {
				console.log(i, startTime, osc.type, frequencies[i], volumes[i]);
				osc.frequency.setValueAtTime(frequencies[i], startTime);
				gain.gain.setValueAtTime(volumes[i], startTime);
			}
		}
	}

	// Set the volume at the end to zero
	var endTime = currentTime + len;
	console.log(len);
	for(var j=0; j<oscillatorTypes.length; j++){
		gain = gains[oscillatorTypes[j]];
		gain.gain.setValueAtTime(0, endTime);
		console.log('set end to zero', endTime, 0);
	}
};