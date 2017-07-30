var utils = require('./utils');
var sfx = require('./sfx');
var aWeight = require('a-weighting/a');

/**
 * Equal Temperament Tuning
 * Source: http://www.phy.mtu.edu/~suits/notefreqs.html
 */
var frequencies = [
	130.81,  138.59,  138.59,  146.83,  155.56,  155.56,  164.81,  174.61,  185.00,  185.00,  196.00,  207.65,  207.65,  220.00,  233.08,  233.08,  246.94,
	261.63,  277.18,  277.18,  293.66,  311.13,  311.13,  329.63,  349.23,  369.99,  369.99,  392.00,  415.30,  415.30,  440.00,  466.16,  466.16,  493.88,
	523.25,  554.37,  554.37,  587.33,  622.25,  622.25,  659.26,  698.46,  739.99,  739.99,  783.99,  830.61,  830.61,  880.00,  932.33,  932.33,  987.77,
	1046.50, 1108.73, 1108.73, 1174.66, 1244.51, 1244.51, 1318.51, 1396.91, 1479.98, 1479.98, 1567.98, 1661.22, 1661.22, 1760.00, 1864.66, 1864.66, 1975.53,
	2093.00, 2217.46, 2217.46, 2349.32, 2489.02, 2489.02, 2637.02, 2793.83, 2959.96, 2959.96, 3135.96, 3322.44, 3322.44, 3520.00, 3729.31, 3729.31, 3951.07, 4186.01];
var noteNames = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B".split(' ');
var PatternFlags = {
	CONTINUE: 1,
	JUMP: 2,
	STOP: 4
};

// pitch: 0-16. Octave: 0-8
function getFrequency(pitch, octave){
	return frequencies[octave * noteNames.length + pitch];
}

var groups = [];
var maxPatterns = 64;
var maxGroups = 64;
var patterns = utils.zeros(maxPatterns * (4 + 1)); // 4 channels (pointing to groups), 1 bitfield/flags

var playState = {
	pattern: -1,
	nextPattern: -1,
	bufferedUntil: 0,
	bufferedUntilLowRes: 0, // Use low res timer if possible, because context.currentTime is slow on some devices
	patternLength: 0,
	startTime: 0,
	startTimeLowRes: 0
};

while(groups.length < maxGroups){
	var group = {
		speed: 16,
		notes: utils.zeros(5 * 8 * 4) // pitch, octave, instrument, volume, effect
	};
	groups.push(group);
}

exports.gsset = function(group, speed){
	speed = speed !== undefined ? speed : 16;
	groups[group].speed = speed;
};

exports.gsget = function(group){
	if(group >= groups.length) return;
	return groups[group].speed;
};

exports.npset = function(group, position, pitch){
	pitch = pitch !== undefined ? pitch : 0;
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
	octave = octave !== undefined ? octave : 0;
	if(octave < 0 || octave > 8) throw new Error('Octave out of range');
	groups[group].notes[5 * position + 1] = octave;
};

exports.noget = function(group, position){
	return groups[group].notes[5 * position + 1];
};

// volume for a note
exports.nvset = function(group, position, volume){
	volume = volume !== undefined ? volume : 0;
	groups[group].notes[5 * position + 3] = volume;

	// If volume is zero, set the other data to zero
	if(volume === 0){
		exports.npset(group, position, 0);
		exports.noset(group, position, 0);
		exports.niset(group, position, 0);
	}
};

exports.nvget = function(group, position){
	return groups[group].notes[5 * position + 3];
};

// instrument for a note
exports.niset = function(group, position, instrument){
	instrument = instrument !== undefined ? instrument : 0;
	groups[group].notes[5 * position + 2] = instrument;
};

exports.niget = function(group, position){
	return groups[group].notes[5 * position + 2];
};

// effect for a note
exports.neset = function(group, position, effect){
	effect = effect !== undefined ? effect : 0;
	groups[group].notes[5 * position + 4] = effect;
};

exports.neget = function(group, position){
	return groups[group].notes[5 * position + 4];
};

// Set a group to be played in a channel in a pattern.
exports.mgset = function(pattern, channel, group){
	group = group !== undefined ? group : 0;
	channel = channel !== undefined ? channel : 0;
	patterns[pattern * 5 + 1 + channel] = group;
};

exports.mgget = function(pattern, channel){
	return patterns[pattern * 5 + 1 + channel];
};

// Set flags for a pattern
exports.mfset = function(pattern, flags){
	flags = flags !== undefined ? flags : 0;
	patterns[pattern * 5 + 0] = flags;
};

// Get flags
exports.mfget = function(pattern){
	return patterns[pattern * 5 + 0];
};

var channels = [];
var allTypes = sfx.getAllOscillatorTypes();
var oscillatorTypes = sfx.getOscillatorTypes();

// Create audio stuff
function initChannels(){
	// TODO: share with sfx - create a class?
	var context = sfx.getContext();
	var masterGain = sfx.getMasterGain();
	var cTime = context.currentTime;
	for(var j=0; j<4; j++){ // one for each channel in the music
		var channel = {
			instruments: {},
			gains: {},
			volumeMultipliers: {}
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
			channel.volumeMultipliers[type] = 1 / sfx.rms[type];
		}

		// Add square25 / pulse
		var gain = context.createGain();
		gain.gain.value = 0;
		gain.connect(masterGain);
		var square25 = sfx.createPulse(gain);
		channel.instruments.square25 = square25;
		channel.gains.square25 = gain;
		channel.volumeMultipliers.square25 = 1 / sfx.rms.square25;

		// Add white noise
		gain = context.createGain();
		gain.gain.value = 0;
		gain.connect(masterGain);
		var whiteNoise = sfx.createWhiteNoise(gain);
		channel.instruments.white = whiteNoise;
		channel.gains.white = gain;
		channel.volumeMultipliers.white = 1 / sfx.rms.white;
	}
}

function startChannels(time){
	channels.forEach(function(channel){
		for(var instrumentName in channel.instruments){
			var oscillator = channel.instruments[instrumentName];
			oscillator.start(time);
		}
	});
}

exports.iosFix = function(){
	initChannels();
	var time = sfx.getContext().currentTime;
	try {
		startChannels(time);
	} catch(err){
		console.error(err);
	}
};

// preview play a group
exports.group = function(groupIndex, channelIndex){
	scheduleGroup(groupIndex, channelIndex||0, sfx.getContext().currentTime);
};

function scheduleGroup(groupIndex, channelIndex, time){
	var i,j;
	var group = groups[groupIndex];
	var channel = channels[channelIndex];
	var speed = group.speed;
	for(i=0; i < 32; i++){ // all rows in the group
		var volume = nvget(groupIndex, i);
		var pitch = npget(groupIndex, i);
		var octave = noget(groupIndex, i);
		var instrument = niget(groupIndex, i);
		var effect = neget(groupIndex, i);
		if(volume === 0){
			continue;
		}
		var startPosition = i;
		var endPosition = i+1;

		/*
		while(
			nvget(groupIndex, endPosition) === volume &&
			niget(groupIndex, endPosition) === instrument &&
			npget(groupIndex, endPosition) === pitch &&
			noget(groupIndex, endPosition) === octave &&
			neget(groupIndex, endPosition) === 0 &&
			endPosition < 32
		){
			endPosition++;
		}
		*/

		var startTime = time + startPosition / speed;
		var endTime = time + endPosition / speed;

		if(effect === 1){
			// make note slightly shorter
			startTime = time + (startPosition + 0.0) / speed;
			endTime = time + (endPosition - 0.25) / speed;
		}

		var osc = channel.instruments[allTypes[instrument]];
		var gain = channel.gains[allTypes[instrument]];
		var volumeMultiplier = channel.volumeMultipliers[allTypes[instrument]];

		if(osc.frequency){ // noise doesn't have frequency
			var frequency = getFrequency(pitch, octave);

			if(effect === 2 && startPosition !== 0){
				// slide frequency
				osc.frequency.linearRampToValueAtTime(frequency, startTime);
			} else {
				osc.frequency.setValueAtTime(frequency, startTime);
			}
			//if(frequency !== 0) volumeMultiplier /= aWeight(frequency);
		}
		gain.gain.setValueAtTime(volumeMultiplier * volume / 7, startTime);
		gain.gain.setValueAtTime(0, endTime-0.000001);

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

	var startTime = sfx.getContext().currentTime;

	playState.pattern = patternIndex;
	playState.nextPattern = getNextPattern(patternIndex);
	playState.patternLength = getPatternLength(patternIndex);
	playState.startTime = startTime;
	playState.startTimeLowRes = Date.now()/1000;
	playState.bufferedUntil = startTime + playState.patternLength;
	playState.bufferedUntilLowRes = Date.now()/1000 + playState.patternLength;

	// schedule groups in all channels
	for(var channelIndex=0; channelIndex < channels.length; channelIndex++){
		var groupIndex = mgget(patternIndex, channelIndex);
		scheduleGroup(groupIndex, channelIndex, startTime);
	}
};

// TODO: fade
function stop(fade){
	fade = fade !== undefined ? fade : 0;

	playState.pattern = -1;
	playState.nextPattern = -1;

	var currentTime = sfx.getContext().currentTime;
	for(var channelIndex=0; channelIndex<channels.length; channelIndex++){
		var channel = channels[channelIndex];
		for(var i=0; i<allTypes.length; i++){
			var instrument = channel.instruments[allTypes[i]];
			var gain = channel.gains[allTypes[i]];
			if(instrument.frequency){
				instrument.frequency.cancelScheduledValues(currentTime + fade);
			}
			gain.gain.cancelScheduledValues(currentTime + fade);
			gain.gain.linearRampToValueAtTime(0, currentTime + fade);
		}
	}
}

exports.update = function(){
	if(playState.pattern === -1){
		// Not playing
		return;
	}

	if(playState.nextPattern === -1){
		// No next pattern to buffer
		return;
	}

	var currentTime = Date.now()/1000;

	if(currentTime < playState.bufferedUntilLowRes - playState.patternLength * 0.5){
		// Already buffered enough
		return;
	}

	// schedule groups in all channels for the next 32 notes
	for(var channelIndex=0; channelIndex < channels.length; channelIndex++){
		var groupIndex = mgget(playState.nextPattern, channelIndex);
		scheduleGroup(groupIndex, channelIndex, playState.startTime + playState.patternLength);
	}

	// Update playState, set next pattern as current
	var prevPatternLength = playState.patternLength;
	playState.pattern = playState.nextPattern;
	playState.patternLength = getPatternLength(playState.pattern);
	playState.startTime += prevPatternLength;
	playState.startTimeLowRes += prevPatternLength;
	playState.bufferedUntil = playState.startTime + playState.patternLength;
	playState.bufferedUntilLowRes = playState.startTimeLowRes + playState.patternLength;
	playState.nextPattern = getNextPattern(playState.pattern);
};

function getNextPattern(currentPattern){
	var nextPattern = (currentPattern + 1) % maxPatterns;
	var flags = mfget(currentPattern);
	if(flags & PatternFlags.JUMP){
		var i = currentPattern-1;
		while(!(mfget(i) & PatternFlags.CONTINUE)){
			i--;
		}
		nextPattern = Math.max(0,i);
	} else if(flags & PatternFlags.STOP){
		nextPattern = -1;
	} else if(playState.nextPattern !== -1 && getPatternLength(playState.nextPattern) === 0){
		nextPattern = -1;
	}
	return nextPattern;
}

function getPatternLength(patternIndex){
	var totalLength = 0;
	for(var channelIndex=0; channelIndex < channels.length; channelIndex++){
		var groupIndex = mgget(patternIndex, channelIndex);
		if(groupIndex === 0) continue;
		var speed = gsget(groupIndex);
		totalLength = Math.max(totalLength, 32/speed);
	}
	return totalLength;
}
