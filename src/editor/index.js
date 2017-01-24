var utils = require('../utils');

var editorModes = ['game', 'sprite', 'map', 'sfx', 'code', 'track', 'pattern', 'help', 'run'];
var editor = {
	modes: editorModes,
	mode: editorModes[0],
	loading: false,
	dirty: true,
	lastmx: 0,
	lastmy: 0,
	previousScroll: 0,
	keysdown: {},
	draw: null
};

function resizeHandler(){
	editor.dirty = true;
}
window.addEventListener("resize", resizeHandler);
window.addEventListener("mozfullscreenchange", resizeHandler);

var sprites = {
	current: 1, // Because zero is "empty sprite"
	panx: 0,
	pany: 0,
	x: function(){ return 0; },
	y: function(){ return flr(3 * height() / 4); },
	w: function(){ return width(); },
	h: function(){ return ceil(height() / 4); }
};

var viewport = {
	x: 1,
	y: 8,
	sx: function(){ return flr((width() * 0.6) / cellwidth()); },
	sy: function(){ return flr(((height()-sprites.h()-8) * 0.9) / cellheight()); }
};

var track = {
	x: function(){ return 1; },
	y: function(){ return 8+16+16; },
	width: function(){ return width() - 3; },
	height: function(){ return height() - 9; },
	note: 0
};

function track_click(track, mx, my){
	var x = track.x();
	var y = track.y();
	var fontWidth = 4;
	var fontHeight = 8;
	var w = 6*fontWidth + 1;
	var column = Math.floor((mx - x) / w);
	var row = Math.floor((my - y) / fontHeight);
	if(column >= 0 && column < 4 && row >= 0 && row < 8){
		track.note = column * 8 + row;
		return true;
	}
	return false;
}

function track_draw(track){
	var x = track.x();
	var y = track.y();
	var fontWidth = 4;
	var fontHeight = 8;
	var n = 0;
	for(var i=0; i<4; i++){
		var w = 6*fontWidth + 1;
		var x0 = x+i*(w+1);

		// 4 columns
		track_drawpart(x0, y, track.note, trackGroupSelector.current, n*8, n*8+8);

		n++;
	}
}

function track_drawpart(x, y, highlightedNote, trackIndex, start, end){
	var fontWidth = 4;
	var fontHeight = 8;
	var w = 6*fontWidth + 1;

	// Background
	rectfill(x,y,x+w-1,y+fontHeight*(end-start));

	for(var j=start; j<end; j++){
		var y0 = y + (j-start)*fontHeight;

		var pitch = npget(trackIndex, j);
		var volume = nvget(trackIndex, j);
		var octave = noget(trackIndex, j);
		var instrument = niget(trackIndex, j);

		// Highlight selected
		if(highlightedNote === j){
			rectfill(x, y0, x+w-1, y0+fontHeight-1, 5);
		}

		// Pitch, 2 chars
		var noteName = volume === 0 ? '-' : nnget(pitch);
		print(noteName, x+1, y0+1,7);

		// octave
		print(volume === 0 ? '-' : (octave+1), x+1+fontWidth*2, y0+1,6);

		// Instrument
		print(volume === 0 ? '-' : (instrument+1), x+1+fontWidth*3, y0+1,14);

		// Volume
		print(volume === 0 ? '-' : (volume+1), x+1+fontWidth*4, y0+1,12);

		// Effect (not yet supported)
		print('-', x+1+fontWidth*5, y0+1,13);
	}
}

var keyToNote = {
	Z: 0, // C
	S: 1, // C#
	X: 3, // D
	D: 4, // D#
	C: 6, // E
	V: 7, // F
	G: 8, // F#
	B: 10, // G
	H: 11, // G#
	N: 13, // A
	J: 14, // A#
	M: 16, // B

	Q: 17 + 0, // C
	"2": 17 + 1, // C#
	W: 17 + 3, // D
	"3": 17 + 4, // D#
	E: 17 + 6, // E
	R: 17 + 7, // F
	"5": 17 + 8, // F#
	T: 17 + 10, // G
	"6": 17 + 11, // G#
	Y: 17 + 13, // A
	"7": 17 + 14, // A#
	U: 17 + 16 // B
};

function track_keypress(track, evt){
	if(evt.ctrlKey || evt.metaKey || evt.altKey) return;

	var char = String.fromCharCode(evt.charCode).toUpperCase();
	if(evt.keyCode === 32){ // space
		group(trackGroupSelector.current);
	} else if(keyToNote[char] !== undefined){
		var pitch = keyToNote[char] % 17;
		var octaveAdd = Math.floor(keyToNote[char] / 17);
		var octave = Math.min(octaveButtons.current + octaveAdd, 3);
		npset(trackGroupSelector.current, track.note, pitch);
		niset(trackGroupSelector.current, track.note, waveformButtons.current);
		nvset(trackGroupSelector.current, track.note, trackVolumeButtons.current);
		noset(trackGroupSelector.current, track.note, octave);
		track.note = (track.note+1)%32;
	}
}

var pattern = {
	x: function(){ return 1; },
	y: function(){ return 16+8; },
	width: function(){ return width() - 3; },
	height: function(){ return height() - 9; }
};

var trackSelector0 = {
	x: function(){ return 1; },
	y: function(){ return 16; },
	current: 0,
	padding: 1,
	min: function(){ return 0; },
	max: function(){ return 63; },
	prefix: '',
	postfix: ''
};

var trackSelector1 = {
	x: function(){ return 27; },
	y: trackSelector0.y,
	current: 0,
	padding: trackSelector0.padding,
	min: trackSelector0.min,
	max: trackSelector0.max,
	prefix: '',
	postfix: ''
};

var trackSelector2 = {
	x: function(){ return 53; },
	y: trackSelector0.y,
	current: 0,
	padding: trackSelector0.padding,
	min: trackSelector0.min,
	max: trackSelector0.max,
	prefix: '',
	postfix: ''
};

var trackSelector3 = {
	x: function(){ return 79; },
	y: trackSelector0.y,
	current: 0,
	padding: trackSelector0.padding,
	min: trackSelector0.min,
	max: trackSelector0.max,
	prefix: '',
	postfix: ''
};

function pattern_draw(pattern){
	var x = pattern.x();
	var y = pattern.y();
	var fontWidth = 4;
	var fontHeight = 8;
	var w = 6*fontWidth + 1;
	var numRows = Math.floor((pattern.height()-y) / fontHeight);

	// Render the 4 channels
	for(var channelIndex=0; channelIndex<4; channelIndex++){
		var trackIndex = mgget(patternSelector.current, channelIndex);
		track_drawpart(x + (w+1) * channelIndex, y, -1, trackIndex, 0, numRows);
	}
}

function pattern_keypress(track, evt){
	if(evt.ctrlKey || evt.metaKey || evt.altKey) return;

	if(evt.keyCode === 32){ // space
		music(patternSelector.current);
	}
}

function viewport_draw(viewport){
	var sx = ssx(sprites.current);
	var sy = ssy(sprites.current);
	var x = sx * cellwidth();
	var y = sy * cellheight();
	for(var i=0; i<cellwidth(); i++){
		for(var j=0; j<cellheight(); j++){
			var col = sget(x+i, y+j);
			rectfill(
				viewport.x + i * viewport.sx(),
				viewport.y + j * viewport.sy(),
				viewport.x + (i+1) * viewport.sx()-1,
				viewport.y + (j+1) * viewport.sy()-1,
				col
			);
		}
	}
}

var code = {
	x: 1,
	y: 8,
	margin: 1,
	initialized: false,
	width: function(){ return width() - 2; },
	height: function(){ return height() - 9; },
	fontHeight: 6,
	fontWidth: 4,
	ccol: 0, // cursor
	crow: 0,
	wcol: 0, // window position
	wrow: 0,
	cursorVisible: true,
	textColor: 7,
	bgColor: 5,
	errorBgColor: 4,
	currentLineBgColor: 4,
	keywordColor: 14,
	literalColor: 12,
	apiColor: 11,
	commentColor: 13,
	identifierColor: 6,
	errorMessage: '',
	syntaxTree: null,
	syntaxTreeDirty: true,
	syntaxComments: [],
	cartridgeIdentifiers: [
		"abs",
		"alpha",
		"assert",
		"atan2",
		"btn",
		"btnp",
		"camera",
		"canvas",
		"cartridge",
		"ceil",
		"cellheight",
		"cellwidth",
		"clamp",
		"clip",
		"cls",
		"codeget",
		"codeset",
		"color",
		"cos",
		"fget",
		"fit",
		"flr",
		"fset",
		"fullscreen",
		"height",
		"load",
		"map",
		"max",
		"mget",
		"mid",
		"min",
		"mix",
		"mousebtn",
		"mousex",
		"mousey",
		"mset",
		"palget",
		"palset",
		"palt",
		"pget",
		"print",
		"pset",
		"rect",
		"rectfill",
		"rnd",
		"save",
		"sfx",
		"sget",
		"sgn",
		"sin",
		"spr",
		"sqrt",
		"sset",
		"time",
		"width",
		"inf",
		"log",
		"nan",
		"def"
	]
};

var mapPanX = 0;
var mapPanY = 0;

var palette = {
	n: function(){
		var n = 2;
		var palsize = 0;
		while(palget(palsize) !== undefined) palsize++;
		while(n*n<palsize) n *= 2;
		return n;
	},
	sx: function(){
		return flr((width() * 0.4) / this.n());
	},
	sy: function(){
		return flr((height() * 0.3) / this.n());
	},
	x: function(){ return width() - palette.sx() * this.n() - 1; },
	y: function(){ return 8; },
	current: 1
};

var flags = {
	x: function(){ return palette.x(); },
	y: function(){ return palette.y() + palette.sy() * palette.n() + 1; },
	current: function(newFlags){
		if(newFlags === undefined){
			return fget(sprites.current);
		} else {
			fset(sprites.current, newFlags);
		}
	}
};

var patternEndButtons = {
	x: function(){ return 56; },
	y: function(){ return 8; },
	options: ['none', 'cont', 'back', 'stop'],
	current: 0,
	padding: 6
};

var saveLoadButtons = {
	x: function(){ return 25; },
	y: function(){ return 13; },
	options: ['save', 'load', 'reset'],
	padding: 8
};

var slotButtons = {
	x: function(){ return 5; },
	y: function(){ return 38; },
	num: 8,
	padding: 1
};

var saveButtons = {
	x: function(){ return 5; },
	y: function(){ return 57; },
	num: slotButtons.num,
	padding: slotButtons.padding
};

var waveformButtons = {
	x: function(){ return width() - 60; },
	y: function(){ return 8; },
	num: 6,
	current: 4,
	padding: 2
};

var octaveButtons = {
	x: function(){ return width() - 24; },
	y: function(){ return 16; },
	num: 4,
	current: 0,
	padding: 0
};

var trackVolumeButtons = {
	x: function(){ return width() - 48; },
	y: function(){ return 16+8; },
	num: 8,
	current: 7,
	padding: 0
};

var topButtons = {
	x: function(){ return 0; },
	y: function(){ return 0; },
	options: ['CRT', 'SPR', 'MAP', 'SFX', '.JS', 'TRK', 'MUS', 'HLP', 'RUN'],
	current: 0,
	bgColor: 7,
	textColor: 0,
	padding: 4
};

var toolButtons = {
	x: function(){ return 1; },
	y: function(){ return viewport.y + viewport.sy() * cellheight() + 1; },
	options: ['draw','fill'],
	current: 0,
	padding: 6
};

var speedSelector = {
	x: function(){ return 1; },
	y: function(){ return 16; },
	current: 1,
	padding: 6,
	min: function(){ return 1; },
	max: function(){ return 64; },
	prefix: '',
	postfix: 'X'
};

var trackSpeedSelector = {
	x: function(){ return 1; },
	y: function(){ return 16; },
	current: 16,
	padding: 6,
	min: function(){ return 1; },
	max: function(){ return 64; },
	prefix: '',
	postfix: 'X'
};

var patternSelector = {
	x: function(){ return 30; },
	y: function(){ return 8; },
	current: 0,
	padding: 0,
	min: function(){ return 0; },
	max: function(){
		var maxPatterns = 0;
		while(mfget(maxPatterns+1) !== undefined) maxPatterns++;
		return maxPatterns;
	},
	prefix: '',
	postfix: ''
};

var sfxSelector = {
	x: function(){ return 1; },
	y: function(){ return 8; },
	current: 0,
	padding: 6,
	min: function(){ return 0; },
	max: function(){ return 63; },
	prefix: '',
	postfix: ''
};

var trackGroupSelector = {
	x: function(){ return 1; },
	y: function(){ return 8; },
	current: 1,
	padding: 6,
	min: function(){ return 1; },
	max: function(){
		var maxTracks = 0;
		while(gsget(maxTracks+1) !== undefined) maxTracks++;
		return maxTracks;
	},
	prefix: '',
	postfix: ''
};

var spriteSheetPageSelector = {
	x: function(){ return sprites.x() + sprites.w() - 1 - 30; },
	y: function(){ return sprites.y() - 7; },
	current: 0,
	padding: 2,
	min: function(){ return 0; },
	max: function(){ return ssget() === 16 ? 3 : 15; },
	prefix: '',
	postfix: ''
};

var resolutionSelectorX = {
	x: function(){ return 50; },
	y: function(){ return 80; },
	current: width(),
	padding: 4,
	min: function(){ return 128; },
	max: function(){ return 512; },
	prefix: '',
	postfix: ''
};

var resolutionSelectorY = {
	x: function(){ return 50; },
	y: function(){ return 88; },
	current: height(),
	padding: resolutionSelectorX.padding,
	min: resolutionSelectorX.min,
	max: resolutionSelectorX.max,
	prefix: '',
	postfix: ''
};

var spriteSheetSizeButtons = {
	x: function(){ return 80; },
	y: function(){ return 98; },
	options: [16,32],
	current: ssget() === 16 ? 0 : 1,
	padding: 2
};

var spriteSizeButtons = {
	x: function(){ return 80; },
	y: function(){ return 106; },
	options: [8,16,32],
	current: [8,16,32].indexOf(cellwidth()),
	padding: 2
};

function intsel_draw(intsel){
	var padding = intsel.padding;
	var numDigits = intsel.max().toString().length;
	var chars = ['<', intsel.prefix + intsel.current + intsel.postfix, '>'];
	for(var i=0; i<3; i++){
		var x0 = intsel.x() + i * (6 + padding*2);
		rectfill(
			x0, intsel.y(),
			intsel.x() + 5+padding*2 + i * (6+padding*2)-1, intsel.y()+6,
			6
		);
		var x1 = intsel.x() + 1 + padding + i * (6 + padding*2);
		print(
			chars[i],
			(x0+1) + padding - (chars[i].length-1) * 2, intsel.y()+1,
			0
		);
	}
}

function intsel_click(intsel, x, y){
	if(utils.inrect(x,y,intsel.x(),intsel.y(), 3 * (intsel.padding * 2 + 6),7)){
		var speed = editor.keysdown[16] ? 10 : 1;
		var button = flr((x-intsel.x()) / (intsel.padding * 2 + 6));
		if(button === 0){
			intsel.current -= speed;
		} else if(button === 2){
			intsel.current += speed;
		}
		intsel.current = clamp(intsel.current, intsel.min(), intsel.max());
		return true;
	}
	return false;
}

var pitches = {
	x: function(){ return 0; },
	y: function(){ return 40; },
	w: function(){ return width(); },
	h: function(){ return flr(height() / 2); }
};

var volumes = {
	x: function(){ return pitches.x(); },
	y: function(){ return pitches.y() + pitches.h() + 2; },
	w: function(){ return pitches.w(); },
	h: function(){ return flr(height() / 6); }
};

// Helpers
function ssx(n){ return n % ssget(); }
function ssy(n){ return Math.floor(n / ssget()) % (ssget() * ssget()); }

function mousemovehandler(forceMouseDown){
	switch(editor.mode){
	case 'sprite':
		if(mousebtn(1) || forceMouseDown){
			// Draw on sprite
			var x = flr((mousex()-viewport.x) / viewport.sx());
			var y = flr((mousey()-viewport.y) / viewport.sy());

			if(sprites.current !== 0 && utils.inrect(x, y, 0, 0, cellwidth(), cellheight())){
				if(toolButtons.current === 0){
					// Draw!
					sset(
						ssx(sprites.current) * cellwidth() + x,
						ssy(sprites.current) * cellheight() + y,
						palette.current
					);
					editor.dirty = true;
				} else if(toolButtons.current === 1){
					// Fill!
					var x0 = ssx(sprites.current) * cellwidth();
					var y0 = ssy(sprites.current) * cellheight();
					var fillx = x0 + x;
					var filly = y0 + y;
					utils.floodfill(
						sget,
						sset,
						fillx,
						filly,
						sget(fillx, filly),
						palette.current,
						x0, x0 + cellwidth()-1,
						y0, y0 + cellheight()-1
					);
					editor.dirty = true;
				}
			}
		} else if(editor.keysdown[32] || mousebtn(2) || mousebtn(3)){
			// Pan sprite view
			var dx = mousex() - editor.lastmx;
			var dy = mousey() - editor.lastmy;
			sprites.panx -= dx;
			sprites.pany -= dy;

			// clamp panning
			sprites_clamp_pan(sprites);

			editor.dirty = true;
		}
		break;

	case 'map':
		var dx = mousex() - editor.lastmx;
		var dy = mousey() - editor.lastmy;
		if(utils.inrect(mousex(), mousey(), 0, 8, width(), spriteSheetPageSelector.y()-9)){
			if(editor.keysdown[32] || mousebtn(2) || mousebtn(3)){
				// Pan map
				// TODO: clamp panning
				mapPanX += dx;
				mapPanY += dy;
				editor.dirty = true;
			} else if((forceMouseDown || mousebtn(1))){
				// Draw on map
				mset(
					flr((mousex() - mapPanX) / cellwidth()),
					flr((mousey() - mapPanY) / cellheight()),
					sprites.current
				);
				editor.dirty = true;
			}
		} else if(editor.keysdown[32] || mousebtn(2) || mousebtn(3)){
			// Pan sprite view
			sprites.panx -= dx;
			sprites.pany -= dy;

			// clamp panning
			sprites_clamp_pan(sprites);

			editor.dirty = true;
		}
		break;

	case 'sfx':
		if(mousebtn(1) || mousebtn(3) || forceMouseDown){
			var n = flr(mousex() / width() * 32);
			var pitch = flr((pitches.h() - mousey() + pitches.y()) / pitches.h() * 255);
			var vol = flr((volumes.h() - mousey() + volumes.y()) / volumes.h() * 255);

			// Within editing area?
			if(clamp(n,0,32) === n && clamp(pitch,0,255) === pitch){
				if(mousebtn(1)){
					// Draw pitch
					if(avget(sfxSelector.current, n) === 0){
						// User probably want full volumes
						avset(sfxSelector.current, n, 255);
					}
					afset(sfxSelector.current, n, pitch);
					awset(sfxSelector.current, n, waveformButtons.current);
				} else if(mousebtn(3)){
					// Delete
					afset(sfxSelector.current, n, 0);
					avset(sfxSelector.current, n, 0);
				}
				editor.dirty = true;
			} else if(clamp(n,0,32) === n && clamp(vol,0,255) === vol){
				avset(sfxSelector.current, n, vol);
				editor.dirty = true;
			}
		}
		break;
	}
}

function scrollhandler(delta){
	switch(editor.mode){
		case 'code':
			code.crow -= delta;
			code_clamp_crow(code);
			code_clamp_ccol(code);
			break;
	}
}

editor.click = window._click = function _click(){
	var mode = editor.mode;
	var mx = mousex();
	var my = mousey();
	mousemovehandler(true);
	if(mode === 'sprite'){
		if(palette_click(palette,mx,my)){
			editor.dirty = true;
		} else if(flags_click(flags,mx,my)){
			editor.dirty = true;
		} else if(buttons_click(toolButtons,mx,my)){
			// tool switcher
			editor.dirty = true;
		}
	}

	if(mode === 'sprite' || mode === 'map'){
		// Sprite select
		var spritesHeight = sprites.h();
		if(my >= sprites.y()){
			var cw = cellwidth();
			var ch = cellheight();

			var spriteX = flr((mx+sprites.panx) / cw);
			var spriteY = flr((my-sprites.y()+sprites.pany) / ch);
			if(spriteX < ssget() && spriteY < ssget()){
				sprites.current = spriteX + spriteY * ssget();
				editor.dirty = true;
			}
		} else if(intsel_click(spriteSheetPageSelector, mx, my)){

			// Convert to panx/pany values
			var n = spriteSheetPageSelector.current * 4 * 16;
			var viewX = 0;
			var viewY = 4 * spriteSheetPageSelector.current;
			if(ssget() === 32){
				viewX = (spriteSheetPageSelector.current % 2) * 16;
				viewY = flr(spriteSheetPageSelector.current/2) * 4;
				n = viewY * 32 + viewX;
			}
			sprites.panx = viewX*cellwidth();
			sprites.pany = viewY*cellheight();
			sprites_clamp_pan(sprites);

			editor.dirty = true;
		}
	} else if(mode === 'sfx'){
		if(buttons_click(waveformButtons,mx,my)){
			editor.dirty = true;
		}
		if(intsel_click(speedSelector, mx, my)){
			asset(sfxSelector.current, speedSelector.current);
			editor.dirty = true;
		}
		if(intsel_click(sfxSelector, mx, my)){
			editor.dirty = true;
		}
	}

	// top mode switcher
	if(buttons_click(topButtons,mx,my)){
		if(editor.modes[topButtons.current] === 'run'){
			code_run(code);
			editor.dirty = true;
		} else {
			editor.mode = editor.modes[topButtons.current];
		}
		editor.dirty = true;
	}

	if(editor.mode === 'code' && code_click(code,mx,my)){
		editor.dirty = true;
	} else if(editor.mode === 'game'){
		if(buttons_click(slotButtons,mx,my)){
			if(load('slot' + slotButtons.current)){
				alert('Loaded game from slot ' + (slotButtons.current + 1) + '.');
			} else {
				alert('Could not load game from slot ' + (slotButtons.current + 1) + '.');
			}
			editor.dirty = true;
			code.syntaxTreeDirty = true;
			slotButtons.current = -1;
		}

		if(buttons_click(saveLoadButtons,mx,my)){
			switch(saveLoadButtons.current){
				case 0: save('game.json'); break;
				case 1: openfile(); break;
				case 2: reset(); break;
			}
			saveLoadButtons.current = -1;
			editor.dirty = true;
		}

		if(buttons_click(saveButtons,mx,my)){
			save('slot' + saveButtons.current);
			alert('Saved game to slot ' + (saveButtons.current + 1) + '.');
			editor.dirty = true;
			saveButtons.current = -1;
		}

		if(intsel_click(resolutionSelectorX, mx, my)){
			width(resolutionSelectorX.current);
			editor.dirty = true;
		}

		if(intsel_click(resolutionSelectorY, mx, my)){
			height(resolutionSelectorY.current);
			editor.dirty = true;
		}
		if(buttons_click(spriteSheetSizeButtons,mx,my)){
			ssset(spriteSheetSizeButtons.current === 0 ? 16 : 32);
			sprites_clamp_pan(sprites);
			editor.dirty = true;
		}
		if(buttons_click(spriteSizeButtons,mx,my)){
			var newSize = spriteSizeButtons.options[spriteSizeButtons.current];
			cellwidth(newSize);
			cellheight(newSize);
			clearSprite(0);
			sprites_clamp_pan(sprites);
			editor.dirty = true;
		}
	} else if(editor.mode === 'track'){
		if(intsel_click(trackSpeedSelector, mx, my)){
			gsset(trackGroupSelector.current, trackSpeedSelector.current);
			editor.dirty = true;
		} else if(intsel_click(trackGroupSelector, mx, my)){
			editor.dirty = true;
		} else if(buttons_click(waveformButtons,mx,my)){
			editor.dirty = true;
		} else if(buttons_click(octaveButtons,mx,my)){
			editor.dirty = true;
		} else if(buttons_click(trackVolumeButtons,mx,my)){
			editor.dirty = true;
		} else if(track_click(track,mx,my)){
			editor.dirty = true;
		}
	} else if(editor.mode === 'pattern'){
		if(buttons_click(patternEndButtons, mx, my)){
			mfset(patternSelector.current, {0: 0, 1:1, 2:2, 3:4}[patternEndButtons.current]);
			editor.dirty = true;
		} else if(intsel_click(patternSelector, mx, my)){
			editor.dirty = true;
		} else if(intsel_click(trackSelector0, mx, my)){
			mgset(patternSelector.current, 0, trackSelector0.current);
			editor.dirty = true;
		} else if(intsel_click(trackSelector1, mx, my)){
			mgset(patternSelector.current, 1, trackSelector1.current);
			editor.dirty = true;
		} else if(intsel_click(trackSelector2, mx, my)){
			mgset(patternSelector.current, 2, trackSelector2.current);
			editor.dirty = true;
		} else if(intsel_click(trackSelector3, mx, my)){
			mgset(patternSelector.current, 3, trackSelector3.current);
			editor.dirty = true;
		}
	}
};

var editorLoad = window._init = function _init(){

	setInterval(function(){
		save('autosave');
	}, 10000);

	if(!load('autosave')){
		// TODO: Load default JSON
		code_set([
			'var x=10,y=10;',
			'function _draw(){',
			'  cls();',
			'  map(0,0,0,0,16,15);',
			'  spr(1,x,y);',
			'  if(btn(0)) x--;',
			'  if(btn(1)) x++;',
			'  if(btn(2)) y--;',
			'  if(btn(3)) y++;',
			'  if(btn(4) && !btnp(4)) sfx(0);',
			'}'
		].join('\n').toLowerCase());
	}

	editor.dirty = true;
	code.syntaxTreeDirty = true;
};

editor.draw = window._draw = function _draw(){
	if(editor.loading) return;

	// Mouse move
	var mx = mousex();
	var my = mousey();
	if(!(editor.lastmx === mx && editor.lastmy === my)){
		mousemovehandler();
		editor.dirty = true;
	}
	editor.lastmx = mx;
	editor.lastmy = my;

	// mouse scroll
	var currentScroll = mousescroll();
	if(currentScroll !== editor.previousScroll){
		var delta = currentScroll - editor.previousScroll;
		scrollhandler(delta);
		editor.dirty = true;
	}
	editor.previousScroll = currentScroll;

	if(!editor.dirty) return;
	editor.dirty = false;

	rectfill(0, 0, width(), height(), 7);

	topButtons.current = editor.modes.indexOf(editor.mode);

	switch(editor.mode){
	case 'code':
		code_draw(code);
		break;
	case 'sprite':
		viewport_draw(viewport);
		sprites_draw(sprites);
		palette_draw(palette);
		buttons_draw(toolButtons);
		intsel_draw(spriteSheetPageSelector);
		var currentText = "sprite "+sprites.current;
		print(currentText, spriteSheetPageSelector.x()-currentText.length*4-1, spriteSheetPageSelector.y()+1, 0);
		flags_draw(flags);
		break;
	case 'map':
		map(0, 0, mapPanX, mapPanY, 128, 32);
		rect(mapPanX-1, mapPanY-1, mapPanX+cellwidth()*128, mapPanY+cellheight()*32, 0);
		sprites_draw(sprites);
		intsel_draw(spriteSheetPageSelector);
		break;
	case 'sfx':
		pitches_draw(pitches, 0);
		pitches_draw(volumes, 1, 0);
		buttons_draw(waveformButtons);
		speedSelector.current = asget(sfxSelector.current);
		intsel_draw(speedSelector);
		intsel_draw(sfxSelector);
		break;
	case 'game':
		print("Load slot:", 5,29);
		buttons_draw(slotButtons);
		print("Save in slot:", 5,50);
		buttons_draw(saveButtons);

		print("file:", 5,14);
		buttons_draw(saveLoadButtons);

		print('Resolution:', 5,80);
		resolutionSelectorX.current = width();
		resolutionSelectorY.current = height();
		intsel_draw(resolutionSelectorX);
		intsel_draw(resolutionSelectorY);

		print('spritesheet size:', 5,99);
		spriteSheetSizeButtons.current = (ssget() === 16 ? 0 : 1);
		buttons_draw(spriteSheetSizeButtons);

		print('sprite size:', 5,106);
		spriteSizeButtons.current = spriteSizeButtons.options.indexOf(cellwidth());
		buttons_draw(spriteSizeButtons);

		break;

	case 'track':
		track_draw(track);
		intsel_draw(trackGroupSelector);
		trackSpeedSelector.current = gsget(trackGroupSelector.current);
		intsel_draw(trackSpeedSelector);
		buttons_draw(waveformButtons);
		print("octave", width() - 60, 17);
		buttons_draw(octaveButtons);
		print("vol", width() - 60, 25);
		buttons_draw(trackVolumeButtons);
		break;

	case 'pattern':
		print("pattern",1,9);
		pattern_draw(pattern);
		intsel_draw(patternSelector);

		var patternFlags = mfget(patternSelector.current);
		patternEndButtons.current = 0;
		if(patternFlags & 1) patternEndButtons.current = 1;
		if(patternFlags & 2) patternEndButtons.current = 2;
		if(patternFlags & 4) patternEndButtons.current = 3;
		buttons_draw(patternEndButtons);

		trackSelector0.current = mgget(patternSelector.current, 0);
		trackSelector1.current = mgget(patternSelector.current, 1);
		trackSelector2.current = mgget(patternSelector.current, 2);
		trackSelector3.current = mgget(patternSelector.current, 3);
		intsel_draw(trackSelector0);
		intsel_draw(trackSelector1);
		intsel_draw(trackSelector2);
		intsel_draw(trackSelector3);
		break;

	case 'help':
		print([
			"Cartridge.js is an open source",
			"retro game engine for the web.",
			"Use it to make cool pixel-",
			"style games!",
			"Use tabs above to get started:",
			"",
			"- CRT: Save/load game.",
			"- SPR: Sprite editor.",
			"- MAP: Map editor.",
			"- SFX: Sound effect editor.",
			"- .JS: JavaScript editor.",
			"- RUN: Run game (Esc=quit).",
			"",
			"Good luck! /schteppe"
		], 4,13);
		break;
	}

	drawtop();
	mouse_draw(mousex(), mousey());
};

function drawtop(){
	rectfill(0, 0, width(), 6, 0);
	buttons_draw(topButtons);
}

function buttons_draw(settings){
	var padding = settings.padding !== undefined ? settings.padding : 4;
	var num = settings.num || settings.options.length;
	var bgColor = settings.bgColor !== undefined ? settings.bgColor : 0;
	var textColor = settings.textColor !== undefined ? settings.textColor : 6;
	for(var i=0; i<num; i++){
		var x0 = settings.x() + i * (6 + padding*2);
		rectfill(
			x0, settings.y(),
			settings.x() + 5+padding*2 + i * (6+padding*2)-1, settings.y() + 6,
			settings.current === i ? bgColor : textColor
		);
		var text = settings.options !== undefined ? (settings.options[i]+'').toUpperCase() : ((i+1) + '');
		var x1 = settings.x()+1+padding + i * (6 + padding*2);
		print(
			text,
			settings.options !== undefined ? (x0+1) : x1, settings.y()+1,
			settings.current === i ? textColor : bgColor
		);
	}
}

function buttons_click(buttons,x,y){
	var num = buttons.num !== undefined ? buttons.num : buttons.options.length;
	if(utils.inrect(x,y,buttons.x(),buttons.y(), num * (buttons.padding * 2 + 6),7)){
		var button = flr((x-buttons.x()) / (buttons.padding * 2 + 6));
		if(buttons.current === button){
			return false;
		} else {
			buttons.current = button;
			return true;
		}
	}
	return false;
}

function flags_draw(flags){
	var x = flags.x();
	var y = flags.y();
	var size = 3;
	for(var i=0; i<8; i++){
		var rx = x + i * (size+3);
		var ry = y;
		var qx = x+(1+size) + i * (3+size);
		var qy = y+1+size;
		if((flags.current() & (1 << i)) !== 0)
			rectfill(rx, ry, qx, qy, 0);
		else
			rect(rx, ry, qx, qy, 0);
	}
}

function flags_click(flags, x, y){
	if(utils.inrect(x,y,flags.x(),flags.y(),6*8,5)){
		var flagIndex = flr((x-flags.x()) / 6);
		var oldFlags = flags.current();
		var clickedFlag = (1 << flagIndex);
		var newFlags = (oldFlags & clickedFlag) ? (oldFlags & (~clickedFlag)) : (oldFlags | clickedFlag);
		flags.current(newFlags);
		return true;
	} else {
		return false;
	}
}

function mouse_draw(x,y){
	rectfill(x-4, y, x+4, y);
	rectfill(x, y-4, x, y+4);
	rectfill(x, y, x, y, 4);
}

function sprites_draw(sprites){
	var offsetX = sprites.x();
	var offsetY = sprites.y();

	var cw = cellwidth();
	var ch = cellheight();

	rectfill(offsetX, offsetY, offsetX + sprites.w() - 1, offsetY + sprites.h() - 1, 0);
	clip(offsetX, offsetY, sprites.w(), sprites.h());
	spr(0, offsetX-sprites.panx, offsetY-sprites.pany, ssget(), ssget());

	// Rectangle around the current editing sprite
	var x = offsetX + (ssx(sprites.current)) * cw - sprites.panx;
	var y = offsetY + (ssy(sprites.current)) * ch - sprites.pany;
	rect(
		x-1, y-1,
		x+cw, y+ch,
		6
	);

	// Reset clip
	clip();
}

function sprites_clamp_pan(sprites){
	sprites.panx = clamp(sprites.panx, 0, Math.max(0,ssget()*cellwidth()-sprites.w()));
	sprites.pany = clamp(sprites.pany, 0, Math.max(0,ssget()*cellheight()-sprites.h()));
}

function palette_draw(palette){
	var x = palette.x();
	var y = palette.y();
	var sx = palette.sx();
	var sy = palette.sy();
	var current = palette.current;
	var n=0;
	var size = palette.n();
	for(var j=0; j<size; j++){
		for(var i=0; i<size; i++){
			if(palget(n) === undefined){
				break;
			}
			var rx = x+i*sx;
			var ry = y+j*sy;
			var rw = x+(i+1)*sx-1;
			var rh = y+(j+1)*sy-1;
			rectfill(rx, ry, rw, rh, n);
			if(current === n){
				rect(rx, ry, rw, rh, current === 0 ? 7 : 0);
			}
			n++;
		}
	}
}

function palette_click(palette,x,y){
	var n = palette.n();
	if(utils.inrect(x,y,palette.x(),palette.y(),palette.sx()*n,palette.sy()*n)){
		var px = flr((x-palette.x()) / palette.sx());
		var py = flr((y-palette.y()) / palette.sy());
		var newColor = px + n * py;
		if(palget(newColor) !== undefined && palette.current !== newColor){
			palette.current = newColor;
			return true;
		}
	}
	return false;
}

function pitches_draw(pitches, source, col){
	var x = pitches.x();
	var y = pitches.y();
	var w = pitches.w();
	var h = pitches.h();
	var pitchWidth = flr(w / 32);
	for(var i=0; i<32; i++){
		var x0 = x + i * pitchWidth + 1;
		var y0 = y + h - 1;
		var value = source === 1 ? (avget(sfxSelector.current,i) / 255) : (afget(sfxSelector.current,i) / 255);
		var pitch = flr(value * h);
		rectfill(x0, y0 - pitch, x0 + pitchWidth - 2, y0, col !== undefined ? col : awget(sfxSelector.current, i));
	}
}

function code_draw(code){
	var x = code.x;
	var y = code.y;
	var fontHeight = code.fontHeight;
	var fontWidth = code.fontWidth;
	var w = code.width();
	var h = code.height();
	var rows = flr(h / fontHeight);
	var cols = flr(w / fontWidth);

	// Background
	rectfill(
		x-code.margin,
		y-code.margin,
		x+w-1+code.margin,
		y+h-1+code.margin,
		code.bgColor
	);

	if(code.syntaxTreeDirty){
		code.syntaxComments.length = 0;
		try {
			code.syntaxTree = acorn.parse(codeget(), { onComment: code.syntaxComments });
		} catch(err){
			code.syntaxTree = { body: [] };
		}
		code.syntaxTreeDirty = false;
	}
	var codeArray = codeget().split('\n');

	code.crow = clamp(code.crow,0,codeArray.length-1);
	code.wrow = clamp(code.wrow,0,codeArray.length-1);
	if(code.crow < code.wrow) code.wrow = code.crow;
	if(code.crow > code.wrow + rows - 1) code.wrow = code.crow - rows + 1;
	if(code.ccol < code.wcol) code.wcol = code.ccol;
	if(code.ccol > code.wcol + cols - 1) code.wcol = code.ccol - cols + 1;

	// Highlight current row
	rectfill(
		x-code.margin,
		y-code.margin + (code.crow-code.wrow) * fontHeight,
		x+w-1+code.margin,
		y-code.margin + (code.crow-code.wrow+1) * fontHeight,
		code.currentLineBgColor
	);

	// Draw code
	var position = 0;
	for(var i=0; i<code.wrow; i++){
		var row = codeArray[i];
		position += row.length + 1;
	}
	for(var i=0; i+code.wrow < codeArray.length && h > (i+1) * fontHeight; i++){
		var row = codeArray[i + code.wrow];
		var rowY = y + i * fontHeight;
		var rowstart = position + code.wcol;
		var rowend = rowstart + (row.length - code.wcol);

		// Check if current line is in a block comment. Currently not working properly.
		var isInBlockComment = false;
		/*for(var j=0; j<syntaxComments.length; j++){
			var comment = syntaxComments[j];
			if(comment.end >= rowstart && comment.start <= rowend){
				isInBlockComment = true;
				break;
			}
		}*/
		print(row.substr(code.wcol, cols), x, rowY, isInBlockComment ? code.commentColor : code.textColor);

		// Any syntax highlighting on this row?
		var queue = code.syntaxTree.body.slice(0);
		queue.push.apply(queue, code.syntaxComments);
		function add(prop){
			if(!prop) return;
			if(prop instanceof acorn.Node){
				queue.push(prop);
			} else if(Array.isArray(prop)){
				prop.forEach(add);
			}
		}
		while(queue.length){
			var node = queue.pop();
			if(node.end < rowstart || node.start > rowend){
				// Node not visible
				continue;
			}
			var nodeX = x + (node.start - rowstart) * fontWidth;

			switch(node.type){
				case "Literal":
					print(node.raw, nodeX, rowY, code.literalColor);
					break;
				case "Identifier":
					var isApi = code.cartridgeIdentifiers.indexOf(node.name) !== -1;
					var color = isApi ? code.apiColor : code.identifierColor;
					print(node.name, nodeX, rowY, color);
					break;
				case "Line":
					print("//" + node.value, nodeX, rowY, code.commentColor);
					break;
				default:
					var keywords = {
						FunctionDeclaration: "function",
						ForStatement: "for",
						VariableDeclaration: "var",
						IfStatement: "if",
						DebuggerStatement: "debugger",
						WithStatement: "with",
						ReturnStatement: "return",
						BreakStatement: "break",
						ContinueStatement: "continue",
						SwitchStatement: "switch",
						SwitchCase: "case",
						ThrowStatement: "throw",
						TryStatement: "try",
						CatchClause: "catch",
						WhileStatement: "while",
						ForStatement: "for",
						ThisExpression: "this",
						NewExpression: "new"
					};
					var keyword = keywords[node.type];
					if(keyword){
						print(keyword, nodeX, rowY, code.keywordColor);
					}
					break;
			}
			utils.values(node).forEach(add);
		}

		position += row.length + 1;
	}

	// Draw cursor
	if(code.cursorVisible){
		rectfill(
			x + (code.ccol - code.wcol) * fontWidth,
			y + (code.crow - code.wrow) * fontHeight,
			x + (code.ccol+1-code.wcol) * fontWidth-2,
			y + (code.crow+1-code.wrow) * fontHeight-2,
			0
		);
	}

	// bottom info row
	var bottomColor = 0;
	var bottomTextColor = 7;
	var bottomText = "L" + (code.crow+1) + " C" + (code.ccol+1);
	if(code.errorMessage !== ''){
		bottomColor = 8;
		bottomTextColor = 0;
		bottomText = code.errorMessage;
		if(time() - code.errorTime > 3){
			code.errorMessage = '';
		}
	}
	rectfill(
		x-code.margin,
		y + h - fontHeight,
		x+w-1+code.margin,
		y + h,
		bottomColor
	);
	print(bottomText, x-code.margin+1, y + h - fontHeight+1, bottomTextColor);
}

window._error = function(info){
	console.error(info);
	code_stop(code);

	// Handle error
	editor.mode = 'code';
	code.ccol = info.column - 1;
	code.crow = info.line - 1;
	code.errorMessage = 'L' + info.column + ' C' + info.line + ' ' + info.message;
	code.errorTime = time();
	editor.dirty = true;
};

function code_run(code){
	// Run code in global scope
	code.previousMode = editor.mode;
	editor.mode = 'run';
	code.initialized = false;

	delete window._update;
	delete window._update60;
	delete window._init;
	delete window._kill;
	delete window._draw;
	delete window._click;

	try {
		run();
		// Manually run the init
		if(window._init){
			window._init();
		}
		code.initialized = true;
	} catch(err){
		// Stop and go back!
		code_stop(code);
		return true;
	}
	return false;
}

function code_stop(code){
	// reattach the global scope functions
	if(code.initialized){
		try {
			if(window._kill){
				window._kill();
			}
		} catch(err){
			console.error(err);
		}
	}
	delete window._update;
	delete window._update60;
	delete window._init;
	delete window._kill;
	delete window._click;

	editor.mode = code.previousMode;
	window._draw = editor.draw;
	window._click = editor.click;
	var oldCode = codeget();
	code_set("", false);
	run();
	code_set(oldCode, false);
	camera(0,0);
	clip(); // reset clip
	music(-1); // stop music
}

function code_click(code,x,y){
	if(!utils.inrect(x,y,code.x,code.y,code.width(),code.height())){
		return false;
	}

	var codeArray = codeget().split('\n');

	code.crow = flr((y - code.y + code.wrow * code.fontHeight) / code.fontHeight);
	code.crow = clamp(code.crow, 0, codeArray.length-1);

	code.ccol = flr((x - code.x + code.wcol * code.fontWidth) / code.fontWidth);
	code_clamp_ccol(code, codeArray);

	return true;
}

function code_clamp_ccol(code, codeArray){
	if(codeArray === undefined){
		codeArray = codeget().split('\n');
	}
	code.ccol = clamp(code.ccol, 0, codeArray[code.crow].length);
}

function code_clamp_crow(code, codeArray){
	if(codeArray === undefined){
		codeArray = codeget().split('\n');
	}
	code.crow = clamp(code.crow, 0, codeArray.length-1);
}

function code_set(str, updateCursor){
	updateCursor = updateCursor !== undefined ? updateCursor : true;
	codeset(str);
	if(updateCursor){
		code_clamp_crow(code);
		code_clamp_ccol(code);
	}
	code.syntaxTreeDirty = true;
}

function code_paste(code, str){
	var codeArray = codeget().split('\n');
	var newCode = str.toLowerCase().split('\n');

	// Insert first row at current position
	var before = codeArray[code.crow].substr(0,code.ccol);
	var after = codeArray[code.crow].substr(code.ccol);

	if(newCode.length === 1){
		codeArray[code.crow] = before + newCode[0] + after;
		code.ccol += newCode[0].length;
	} else if(codeArray.length > code.crow){
		codeArray[code.crow] = before + newCode[0];
		codeArray.splice.apply(codeArray, [code.crow+1, 0].concat(newCode.slice(1,newCode.length-1)).concat(newCode[newCode.length - 1] + after));
		code.crow += newCode.length - 1;
		code.ccol = newCode[0].length;
	}

	code_set(codeArray.join('\n'));
	editor.dirty = true;
}

function code_keydown(code, evt){

	var codeArray = codeget().split('\n');

	// Prevent tab'ing
	if(evt.which === 9) {
		codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, ' ');
		codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, ' ');
		code.ccol += 2;
		code_clamp_ccol(code, codeArray);
		evt.preventDefault();
	} else {
		var shouldJump = (evt.altKey && utils.isMac()) || (evt.ctrlKey && !utils.isMac());
		switch(evt.keyCode){
		case 37: // left
			if(code.ccol === 0 && code.crow > 0){
				code.crow--;
				code.ccol = codeArray[code.crow].length;
			} else {
				var amount = 1;
				if(shouldJump){
					var rowStr = codeArray[code.crow];
					while(code.ccol - amount > 0 && rowStr[code.ccol-amount-1].match(/[\s]/)) amount++;
					while(code.ccol - amount > 0 && rowStr[code.ccol-amount-1].match(/[a-z\d]/)) amount++;
				}
				code.ccol -= amount;
				code_clamp_ccol(code, codeArray);
			}
			break;
		case 39: // right
			if(code.ccol === codeArray[code.crow].length && code.crow !== codeArray.length-1){
				code.ccol=0;
				code.crow++;
				code_clamp_crow(code, codeArray);
			} else {
				var amount = 1;
				if(shouldJump){
					var rowStr = codeArray[code.crow];
					while(rowStr.length > code.ccol + amount && rowStr[code.ccol+amount].match(/[\s]/)) amount++;
					while(rowStr.length > code.ccol + amount && rowStr[code.ccol+amount].match(/[a-z\d]/)) amount++;
				}
				code.ccol += amount;
				code_clamp_ccol(code, codeArray);
			}
			break;
		case 38: // up
			code.crow--;
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 40: // down
			code.crow++;
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 8: // backspace
			if(code.ccol !== 0){
				var after = codeArray[code.crow].substr(code.ccol);
				var before = codeArray[code.crow].substr(0,code.ccol-1);
				codeArray[code.crow] = before + after;
				// Move cursor
				code.ccol--;
				code_clamp_ccol(code, codeArray);
			} else if(code.ccol === 0 && code.crow !== 0){
				// append to previous row
				var newCol = codeArray[code.crow-1].length;
				codeArray[code.crow-1] += codeArray[code.crow];
				codeArray.splice(code.crow, 1);
				code.crow -= 1;
				code.ccol = newCol;
			}
			break;
		case 46: // delete
			if(code.ccol !== codeArray[code.crow].length){
				var after = codeArray[code.crow].substr(code.ccol+1);
				var before = codeArray[code.crow].substr(0,code.ccol);
				codeArray[code.crow] = before + after;
			} else if(code.crow < codeArray.length-1){
				codeArray[code.crow] += codeArray[code.crow+1];
				codeArray.splice(code.crow+1,1);
			}
			break;
		case 33: // page up
			code.crow -= Math.floor(code.height() / code.fontHeight);
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 34: // page down
			code.crow += Math.floor(code.height() / code.fontHeight);
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 35: // end
			code.ccol = codeArray[code.crow].length;
			break;
		case 36: // home
			code.ccol = 0;
			break;
		}
	}

	code_set(codeArray.join('\n'));
}

function code_keypress(code, evt){
	var char = String.fromCharCode(evt.charCode).toUpperCase();
	var codeArray = codeget().split('\n');

	if(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="+-{}<>!;_|&*~\'%'.indexOf(char) !== -1){
		if(char === "'") char = '"'; // temp fix until ' is supported
		char = char.toLowerCase();
		if(codeArray[code.crow] === ''){
			codeArray[code.crow] = char;
			code.ccol = 1;
		} else {
			codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, char);
			code.ccol++;
			code_clamp_ccol(code, codeArray);
		}
	} else if(evt.keyCode === 11 && evt.ctrlKey){ // k - kill rest of the line
		codeArray[code.crow] = codeArray[code.crow].substr(0,code.ccol);
	} else if(evt.keyCode === 13){ // enter
		var after = codeArray[code.crow].substr(code.ccol);
		var before = codeArray[code.crow].substr(0,code.ccol);
		codeArray.splice(code.crow+1, 0, after);
		codeArray[code.crow] = before;
		// Move cursor
		code.ccol=0;
		code.crow++;
		code_clamp_crow(code, codeArray);
	}

	code_set(codeArray.join('\n'));
}

window.addEventListener('keyup', function(evt){
	editor.keysdown[evt.keyCode] = false;
});

function strInsertAt(str, index, character) {
	return str.substr(0, index) + character + str.substr(index+character.length-1);
}

function rotateSprite(spriteNumber){
	var pixels = [];
	var i,j;
	for(i=0; i<cellwidth(); i++){
		for(j=0; j<cellheight(); j++){
			var x = ssx(spriteNumber)*cellwidth() + i;
			var y = ssy(spriteNumber)*cellheight() + j;
			var newX = ssx(spriteNumber)*cellwidth() + cellwidth() - 1 - j;
			var newY = ssy(spriteNumber)*cellheight() + i;
			pixels.push(newX, newY, sget(x,y));
		}
	}
	for(i=0; i<pixels.length; i+=3){
		sset(pixels[i+0],pixels[i+1],pixels[i+2]);
	}
}

function clearSprite(spriteNumber){
	var i,j;
	for(i=0; i<cellwidth(); i++){
		for(j=0; j<cellheight(); j++){
			var x = ssx(spriteNumber)*cellwidth() + i;
			var y = ssy(spriteNumber)*cellheight() + j;
			sset(x, y, 0);
		}
	}
}

function flipSprite(spriteNumber, flipX){
	var pixels = [];
	var i,j,w=cellwidth(),h=cellheight();
	for(i=0; i<w; i++){
		for(j=0; j<h; j++){
			var x = ssx(spriteNumber)*w + i;
			var y = ssy(spriteNumber)*h + j;
			var newX = flipX ? ssx(spriteNumber)*w + w - 1 - i : x;
			var newY = flipX ? y : ssy(spriteNumber)*h + h - 1 - j;
			pixels.push(newX, newY, sget(x,y));
		}
	}
	for(i=0; i<pixels.length; i+=3){
		sset(pixels[i+0],pixels[i+1],pixels[i+2]);
	}
}

function copySprite(from,to){
	if(to === 0) return;

	var i,j;
	for(i=0; i<cellwidth(); i++){
		for(j=0; j<cellheight(); j++){
			var x = ssx(from)*cellwidth() + i;
			var y = ssy(from)*cellheight() + j;
			var x1 = ssx(to)*cellwidth() + i;
			var y1 = ssy(to)*cellheight() + j;
			sset(x1, y1, sget(x,y));
		}
	}
}

// TODO: should this logic be in the engine?
function reset(){

	// sprites
	var numSprites = ssget() * ssget();
	for(var i=0; i<numSprites; i++){
		clearSprite(i);
		fset(i,0);
	}

	// Map
	for(var i=0; i<128; i++){
		for(var j=0; j<32; j++){
			mset(i,j,0);
		}
	}

	// palette
	for(var i=0; i<16; i++){
		palset(i); // set default
	}
	palset(16,-1);

	// SFX
	for(var i=0; i<64; i++){
		for(var j=0; j<32; j++){
			avset(i,j);
			afset(i,j);
			awset(i,j);
		}
	}

	// Tracks
	for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
		gsset(groupIndex);
		for(var position=0; position<32; position++){
			nvset(groupIndex, position, 0);
		}
	}

	// Patterns
	for(var pattern=0; mfget(pattern) !== undefined; pattern++){
		mfset(pattern);
		for(var channel=0; channel<4; channel++){
			mgset(pattern, channel);
		}
	}

	// Code
	code_set("");

	width(128);
	height(128);
	cellwidth(8);
	cellheight(8);
	ssset(16);
}

window.addEventListener('keydown', function(evt){
	if(editor.mode === 'run'){
		if(evt.keyCode === 27){
			code_stop(code);
			editor.dirty = true;
		}
		return;
	}

	editor.keysdown[evt.keyCode] = true;

	// alt + left or right, switch editor
	if((evt.keyCode === 37 || evt.keyCode === 39) && evt.altKey){
		var delta = evt.keyCode === 37 ? -1 : 1;
		editor.mode = editor.modes[utils.mod(editor.modes.indexOf(editor.mode)+delta, editor.modes.length)];
		if(editor.mode === 'run')
			editor.mode = editor.modes[utils.mod(editor.modes.indexOf(editor.mode)+delta, editor.modes.length)];
		editor.dirty = true;

		// Prevent going back in history
		evt.cancelBubble = true;
        evt.returnValue = false;
		evt.preventDefault();

		return;
	}

	// ctrl+enter -> run game
	if(evt.keyCode === 13 && (utils.isMac() ? evt.metaKey : evt.ctrlKey)){
		code_run(code);
		return;
	}

	if(editor.mode === 'code'){
		code_keydown(code, evt);
	} else if(!evt.altKey && !evt.metaKey && !evt.ctrlKey){
		switch(evt.keyCode){
			case 86: if(editor.mode === 'sprite') flipSprite(sprites.current, false); break; // V
			case 70: if(editor.mode === 'sprite') flipSprite(sprites.current, true); break; // F
			case 82: if(editor.mode === 'sprite') rotateSprite(sprites.current); break; // R
			case 46: if(editor.mode === 'sprite') clearSprite(sprites.current); break; // delete
			case 81: if(editor.mode === 'sprite' || editor.mode === 'map') sprites.current=utils.mod(sprites.current-1,ssget()*ssget()); break; // Q
			case 87: if(editor.mode === 'sprite' || editor.mode === 'map') sprites.current=utils.mod(sprites.current+1,ssget()*ssget()); break; // W
			case 32: if(editor.mode === 'sfx') sfx(sfxSelector.current); break;
		}
	}
	editor.dirty = true;
});

document.addEventListener('keydown', function(e){
	if(editor.mode === 'run') return;

	// ctrl + s
	if (e.keyCode == 83 && (utils.isMac() ? e.metaKey : e.ctrlKey)){
		save('game.json');
		e.preventDefault();
	}

	// ctrl + o
	if (e.keyCode == 79 && (utils.isMac() ? e.metaKey : e.ctrlKey)){
 		openfile();
		e.preventDefault();
	}

	// backspace
	if (editor.mode === 'code' && e.keyCode === 8) {
		e.preventDefault();
	}

}, false);

window.addEventListener('keypress', function(evt){
	if(editor.mode === 'run') return;
	if(editor.mode === 'code'){
		code_keypress(code, evt);
	} else if(editor.mode === 'track'){
		track_keypress(track, evt);
	} else if(editor.mode === 'pattern'){
		pattern_keypress(track, evt);
	}
});

function openfile(){
	utils.opentextfile(function(err, text){
		if(err){
			console.error(err);
			return;
		}
		try {
			var json = JSON.parse(text);
			load(json);
			code.syntaxTreeDirty = true;
			editor.dirty = true;
		} catch(err){
			console.error('Could not load file');
		}
	});
}

window.addEventListener('paste', handlepaste, false);
function handlepaste (e) {
	if(editor.mode === 'run') return;
	if (e && e.clipboardData && e.clipboardData.types && e.clipboardData.getData) {
		var types = e.clipboardData.types;
		var handled = false;

		if (((types instanceof DOMStringList) && types.contains("Files")) || (types.indexOf && types.indexOf('Files') !== -1)) {
			var data = e.clipboardData.items[0];
			if(data.kind == 'file' && data.type.match('^image/')) {
				var file = data.getAsFile();
				handlePasteImage(file);
				handled = true;
			}
		} else if (((types instanceof DOMStringList) && types.contains("text/plain")) || (types.indexOf && types.indexOf('text/plain') !== -1)) {
			var data = e.clipboardData.items[0];
			if(data.kind == 'string' && data.type.match('^text/')) {
				data.getAsString(handlePasteString);
				handled = true;
			}
		}

		if(handled){
			// Stop from actually pasting
			e.stopPropagation();
			e.preventDefault();
			return false;
		}
	}
	return true;
}

function handlePasteImage(file){
	if(editor.mode !== 'sprite') return;

	var urlCreator = window.URL || window.webkitURL;
	var img = new Image();
	img.onload = function(){
		// paste pixels into current sprite
		var tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = img.width;
		tmpCanvas.height = img.height;
		tmpCanvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
		var imgData = tmpCanvas.getContext('2d').getImageData(0, 0, img.width, img.height);
		var pixels = imgData.data;

		for(var i=0; i<img.width && i < ssget() * cellwidth(); i++){
			for(var j=0; j<img.height && j < ssget() * cellheight(); j++){
				// Get best matching color
				var p = 4 * (i + j*img.width);
				var r = pixels[p + 0];
				var g = pixels[p + 1];
				var b = pixels[p + 2];
				var a = pixels[p + 3];

				var bestColor = 0;
				var distance = 1e10;
				for(var k=0; k<16; k++){
					var dec = palget(k);
					var dr = utils.decToR(dec);
					var dg = utils.decToG(dec);
					var db = utils.decToB(dec);
					var da = palt(k) ? 0 : 255;
					var newDistance = (r-dr)*(r-dr) + (g-dg)*(g-dg) + (b-db)*(b-db) + (a-da)*(a-da);
					if(newDistance < distance){
						bestColor = k;
						distance = newDistance;
					}
				}

				// write to spritesheet at current position
				var x = (ssx(sprites.current) * cellwidth() + i);
				var y = (ssy(sprites.current) * cellheight() + j);
				if(sprites.current !== 0){
					sset(x, y, bestColor);
				}
				editor.dirty = true;
			}
		}

		urlCreator.revokeObjectURL(img.src);
	};
	img.src = urlCreator.createObjectURL(file);
}

function handlePasteString(str){
	switch(editor.mode){
	case 'sprite':
		var m = str.match(/sprite:([\d]+)/);
		if(m){
			copySprite(parseInt(m[1]), sprites.current);
			editor.dirty = true;
		}
		break;
	case 'code':
		code_paste(code, str);
		break;
	default:
		console.log('Unhandled paste string!');
		break;
	}
}

document.addEventListener('copy', function(e){
	switch(editor.mode){
	case 'run':
		return;
	case 'sprite':
		e.clipboardData.setData('text/plain', 'sprite:'+sprites.current);
		e.preventDefault();
		break;
	case 'code':
		e.clipboardData.setData('text/plain', codeget()); // until selection is supported
		e.preventDefault();
		break;
	}
});

var query = utils.parseQueryVariables(window.location.search, {
	pixel_perfect: 'i',
	run: 'b',
	file: 's'
});

cartridge({
	containerId: 'container',
	pixelPerfect: query.pixel_perfect !== undefined ? query.pixel_perfect : (utils.isMobile() ? 1 : 0)
});

run();

if(query.file){
	editor.loading = true;
	load(query.file);
}

window._load = function(){
	delete window._load; // only need to load once!
	editor.loading = false;
	editor.dirty = true;
	code.syntaxTreeDirty = true;
	if(query.run)
		code_run(code);
};
