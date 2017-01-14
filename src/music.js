var utils = require('./utils');
var sfx = require('./sfx');

/**
 * Equal Temperament Tuning
 * Source: http://www.phy.mtu.edu/~suits/notefreqs.html
 */
var frequencies = [
	261.63, 277.18, 277.18, 293.66, 311.13, 311.13, 329.63, 349.23, 369.99, 369.99, 392.00, 415.30, 415.30, 440.00, 466.16, 466.16, 493.88, 523.25, 554.37, 554.37, 587.33, 622.25, 622.25, 659.26, 698.46, 739.99, 739.99, 783.99, 830.61, 830.61, 880.00, 932.33, 932.33, 987.77, 1046.50, 1108.73, 1108.73, 1174.66, 1244.51, 1244.51, 1318.51, 1396.91, 1479.98, 1479.98, 1567.98, 1661.22, 1661.22, 1760.00, 1864.66, 1864.66, 1975.53, 2093.00, 2217.46, 2217.46, 2349.32, 2489.02, 2489.02, 2637.02, 2793.83, 2959.96, 2959.96, 3135.96, 3322.44, 3322.44, 3520.00, 3729.31, 3729.31, 3951.07, 4186.01];
var noteNames = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B".split(' ');
var PatternFlags = {
	ACTIVE: 1,
	THROW: 2,
	CATCH: 4,
	STOP: 8
};

// pitch: 0-16. Octave: 0-8
function getFrequency(pitch, octave){
	return frequencies[octave * noteNames.length + pitch];
}

var groups = [];
var patterns = utils.zeros(8 * (4 + 1)); // 4 channels (pointing to groups), 1 bitfield/flags

while(groups.length < 8){
	var group = {
		speed: 16,
		notes: utils.zeros(5 * 8 * 4) // pitch, octave, instrument, volume, effect
	};
	groups.push(group);
}

exports.gsset = function(group, speed){
	groups[group].speed = speed;
};

exports.gsget = function(group){
	return groups[group].speed;
};

exports.npset = function(group, position, pitch){
	if(pitch < 0 || pitch > noteNames.length) throw new Error('Pitch out of range');
	groups[group].notes[5 * position + 0] = pitch;
};

exports.npget = function(group, position){
	return groups[group].notes[5 * position + 0];
};

exports.nnget = function(note){
	return noteNames[note % 17];
};

// Octave is the "pitch multiplier", from 0 to 8 (more limits?)
exports.noset = function(group, position, octave){
	if(octave < 0 || octave > 8) throw new Error('Octave out of range');
	groups[group].notes[5 * position + 1] = octave;
};

exports.noget = function(group, position){
	return groups[group].notes[5 * position + 1];
};

// volume for a note
exports.nvset = function(group, position, volume){
	groups[group].notes[5 * position + 3] = volume;
};

exports.nvget = function(group, position){
	return groups[group].notes[5 * position + 3];
};

// instrument for a note
exports.niset = function(group, position, instrument){
	groups[group].notes[5 * position + 2] = instrument;
};

exports.niget = function(group, position){
	return groups[group].notes[5 * position + 2];
};

// Set a group to be played in a channel in a pattern.
exports.mgset = function(pattern, channel, group){
	patterns[pattern * 5 + 1 + channel] = group;
};

exports.mgget = function(pattern, channel){
	return patterns[pattern * 5 + 1 + channel];
};

// Set flags for a pattern
exports.mfset = function(pattern, flags){
	patterns[pattern * 5 + 0] = flags;
};

// Get flags
exports.mfget = function(pattern){
	return patterns[pattern * 5 + 0];
};

// Create audio stuff
// TODO: share with sfx - create a class?
var context = sfx.getContext();
var masterGain = sfx.getMasterGain();
var channels = [];
var oscillatorTypes = sfx.getOscillatorTypes();
var allTypes = sfx.getAllOscillatorTypes();
for(var j=0; j<4; j++){ // one for each channel in the music
	var channel = {
		instruments: {},
		gains: {}
	};
	channels.push(channel);

	// add 4 basic instruments and gains to channel
	for(var i=0; i<oscillatorTypes.length; i++){
		var osc = context.createOscillator();
		var type = oscillatorTypes[i];
		osc.type = type;

		var gain = context.createGain();
		gain.gain.value = 0;
		gain.connect(masterGain);

		osc.connect(gain);
		channel.instruments[type] = osc;
		channel.gains[type] = gain;
		osc.start(context.currentTime);
	}

	// Add square25 / pulse
	var gain = context.createGain();
	gain.gain.value = 0;
	gain.connect(masterGain);
	var square25 = sfx.createPulse(gain);
	channel.instruments.square25 = square25;
	channel.gains.square25 = gain;
	square25.start(context.currentTime);

	// Add white noise
	gain = context.createGain();
	gain.gain.value = 0;
	gain.connect(masterGain);
	var whiteNoise = sfx.createWhiteNoise(gain);
	channel.instruments.white = whiteNoise;
	channel.gains.white = gain;
	whiteNoise.start(context.currentTime);
}

// preview play a group
exports.group = function(groupIndex, channelIndex){
	scheduleGroup(groupIndex, channelIndex||0, context.currentTime);
};

function scheduleGroup(groupIndex, channelIndex, time){
	var i,j;
	var group = groups[groupIndex];
	var channel = channels[channelIndex];
	var speed = group.speed;
	for(var i=0; i < 32; i++){ // all rows in the group
		var volume = nvget(groupIndex, i);
		var pitch = npget(groupIndex, i);
		var octave = noget(groupIndex, i);
		var instrument = niget(groupIndex, i);
		if(volume === 0){
			continue;
		}
		var startPosition = i;
		var endPosition = i+1;
		while(nvget(groupIndex, endPosition) === volume && niget(groupIndex, endPosition) === instrument && npget(groupIndex, endPosition) === pitch && endPosition < 32){
			endPosition++;
		}
		var startTime = time + startPosition / speed;
		var endTime = time + endPosition / speed;

		var osc = channel.instruments[allTypes[instrument]];
		var gain = channel.gains[allTypes[instrument]];

		if(osc.frequency){ // noise doesn't have frequency
			var frequency = getFrequency(pitch, octave);
			osc.frequency.setValueAtTime(frequency, startTime);
		}
		gain.gain.setValueAtTime(volume / 7, startTime);
		gain.gain.setValueAtTime(0, endTime);

		i = endPosition - 1;
	}
}

// Play or stop music
exports.music = function(patternIndex, fade, channelmask){
	fade = fade !== undefined ? fade : 0;
	channelmask = channelmask !== undefined ? channelmask : 0;
	if(patternIndex === -1){
		stop(fade);
		return;
	}

	// schedule all groups
	var startTime = context.currentTime;
	for(var patternIndex=0; patternIndex < 8; patternIndex++){
		/*var flags = mfget(patternIndex);
		if(!(flags & PatternFlags.ACTIVE)) continue;
		*/
		for(var channelIndex=0; channelIndex < channels.length; channelIndex++){
			var groupIndex = mgget(patternIndex, channelIndex);
			var speed = gsget(groupIndex);
			scheduleGroup(groupIndex, channelIndex, startTime);
		}
	}
};

function stop(fade){
	var currentTime = context.currentTime;
	for(var channelIndex=0; channelIndex<channels.length; channelIndex++){
		var channel = channels[channelIndex];
		for(var i=0; i<allTypes.length; i++){
			var instrument = channel.instruments[allTypes[i]];
			if(instrument.frequency){
				instrument.frequency.cancelAllScheduledValues();
			}
			instrument.gain.cancelAllScheduledValues();
			instrument.gain.setValueAtTime(0, currentTime);
		}
	}
}