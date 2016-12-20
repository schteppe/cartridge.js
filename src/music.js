var utils = require('./utils');

// pitch is 'A', 'A#', 'Ab', etc
// group is for example four beats of baseline
exports.notesetpitch = function(group, position, pitch){

};

// Octave is the "pitch multiplier", from 0 to 8 (more limits?)
exports.notesetoctave = function(group, position, octave){

};

// volume for a note
exports.notesetvolume = function(group, position, volume){

};

// set a group to be played in a channel
exports.musicsetpattern = function(pattern, channel, group){

};

// Set stop/repeat flags for a pattern: 1=stop, 2=catch, 4=throw
exports.musicsetflags = function(pattern, flags){

};