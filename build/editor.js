(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = Rectangle;

function Rectangle(x,y,w,h){
	this.set(x,y,w,h);
}

Rectangle.prototype = {
	set: function(x,y,w,h){
		x |= 0;
		y |= 0;
		w |= 0;
		h |= 0;
		this.x0 = x;
		this.y0 = y;
		this.w = w;
		this.h = h;
		this.x1 = x + w - 1;
		this.y1 = y + h - 1;
		this.area = w*h;
	},
	excludesRect: function(x0,y0,x1,y1){
		return x1 < this.x0 || y1 < this.y0 || x0 > this.x1 || y0 > this.y1;
	},
	excludesPoint: function(x,y){
		return x < this.x0 || y < this.y0 || x > this.x1 || y > this.y1;
	},
	expandToPoint: function(x,y){
		var x0 = Math.min(this.x0, x);
		var y0 = Math.min(this.y0, y);
		this.set(
			x0,
			y0,
			Math.max(this.x1, x) - x0 + 1,
			Math.max(this.y1, y) - y0 + 1
		);
	}
};
},{}],2:[function(require,module,exports){
function Action(editor,hasDiff){
	this.editor = editor;
	this.valid = hasDiff;
}
Action.prototype = {
	undo: function(){},
	redo: function(){},
	merge: function(otherAction){ return null; }
};

function PsetAction(editor,x,y,newColor){
	this.x = x;
	this.y = y;
	this.oldColor = pget(x,y);
	this.newColor = newColor;
	Action.call(this,editor,this.oldColor != this.newColor);
}
PsetAction.prototype = Object.create(Action.prototype);
Object.assign(PsetAction.prototype, {
	undo: function(){ pset(this.x, this.y, this.oldColor); this.editor.dirty = true; },
	redo: function(){ pset(this.x, this.y, this.newColor); this.editor.dirty = true; },
});

function SsetAction(editor,x,y,newColor){
	this.x = x;
	this.y = y;
	this.oldColor = sget(x,y);
	this.newColor = newColor;
	Action.call(this,editor,this.oldColor != this.newColor);
}
SsetAction.prototype = Object.create(Action.prototype);
Object.assign(SsetAction.prototype, {
	undo: function(){ sset(this.x, this.y, this.oldColor); this.editor.dirty = true; },
	redo: function(){ sset(this.x, this.y, this.newColor); this.editor.dirty = true; },
});

function MsetAction(editor,x,y,newSpriteId){
	this.x = x;
	this.y = y;
	this.oldSpriteId = mget(x,y);
	this.newSpriteId = newSpriteId;
	Action.call(this,editor,this.oldSpriteId != this.newSpriteId);
}
MsetAction.prototype = Object.create(Action.prototype);
Object.assign(MsetAction.prototype, {
	undo: function(){ mset(this.x, this.y, this.oldSpriteId); this.editor.dirty = true; },
	redo: function(){ mset(this.x, this.y, this.newSpriteId); this.editor.dirty = true; },
});

module.exports = {
	Action: Action,
	PsetAction: PsetAction,
	SsetAction: SsetAction,
	MsetAction: MsetAction
};
},{}],3:[function(require,module,exports){
var Rectangle = require('../Rectangle');
var utils = require('../utils');

module.exports = Buttons;

function Buttons(options){
	options = options || {};
	Rectangle.call(this);

	if(options.options) this.options = options.options;

	if(options.x) this.x = options.x;
	if(options.y) this.y = options.y;
	if(options.sx) this.sx = options.sx;
	if(options.sy) this.sy = options.sy;
	if(options.onclick) this.onclick = options.onclick;

	this.padding = options.padding !== undefined ? options.padding : 0;
	this.current = options.current !== undefined ? options.current : 0;
	this.num = options.num !== undefined ? options.num : undefined;
	this.bgColor = options.bgColor !== undefined ? options.bgColor : undefined;
	this.textColor = options.textColor !== undefined ? options.textColor : undefined;
}
Buttons.prototype = Object.create(Rectangle.prototype);
Object.assign(Buttons.prototype, {
	draw: function(){
		var padding = this.padding !== undefined ? this.padding : 4;
		var num = this.num || this.options.length;
		var bgColor = this.bgColor !== undefined ? this.bgColor : 0;
		var textColor = this.textColor !== undefined ? this.textColor : 6;
		for(var i=0; i<num; i++){
			var x0 = this.x() + i * (6 + padding*2);
			rectfill(
				x0, this.y(),
				this.x() + 5+padding*2 + i * (6+padding*2)-1, this.y() + 6,
				this.current === i ? bgColor : textColor
			);
			var text = this.options !== undefined ? (this.options[i]+'').toUpperCase() : ((i+1) + '');
			var x1 = this.x()+1+padding + i * (6 + padding*2);
			print(
				text,
				this.options !== undefined ? (x0+1) : x1, this.y()+1,
				this.current === i ? textColor : bgColor
			);
		}
	},
	click: function(x,y){
		var num = this.num !== undefined ? this.num : this.options.length;
		if(utils.inrect(x,y,this.x(),this.y(), num * (this.padding * 2 + 6),7)){
			var button = flr((x-this.x()) / (this.padding * 2 + 6));
			if(this.current === button){
				return false;
			} else {
				this.current = button;
				return true;
			}
		}
		return false;
	},
	onclick: function(){}
});
},{"../Rectangle":1,"../utils":8}],4:[function(require,module,exports){
var actionClasses = require('./Action');

function Editor(){
	this.loading = false;
	this.dirty = true;
	this.lastmx = 0;
	this.lastmy = 0;
	this.lastmousebtn = {};
	this.previousScroll = 0;
	this.keysdown = {};
	this.draw = null;
	this.gameWidth = 128;
	this.gameHeight = 128;
	this.editorWidth = 128;
	this.editorHeight = 128;

	this.actions = [];
	this.currentAction = -1;
	this.maxActions = 100;

	this.settings = {};

	var mode = Editor.modes[0];
	Object.defineProperties(this, {
		mode: {
			get: function(){ return mode; },
			set: function(value){ mode = value; },
		}
	});
}

// Helpers
function ssx(n){ return n % ssget(); }
function ssy(n){ return Math.floor(n / ssget()) % (ssget() * ssget()); }

Editor.prototype = {
	doAction: function(action){
		if(!action.valid) return;

		if(this.actions.length === 0){
			this.currentAction = 0;
		} else if(this.currentAction === this.actions.length-1){
			this.currentAction = this.actions.length;
		} else {
			// Between first and last, need to cut the forward history
			this.actions = this.actions.slice(0, this.currentAction+1);
			this.currentAction = this.actions.length;
		}

		this.actions.push(action);
		action.redo();

		// Merge the last two actions?
		if(this.actions.length > 1){
			var merged = this.actions[this.actions.length-2].merge(this.actions[this.actions.length-1]);
			if(merged){
				this.actions.pop();
				this.actions.pop();
				this.actions.push(merged);
			}
		}

		// Only keep max actions in the history
		while(this.actions.length > this.maxActions){
			this.actions.shift();
			this.currentAction--;
		}
	},
	undo: function(){
		if(this.currentAction > -1){
			this.actions[this.currentAction].undo();
			this.currentAction--;
		}
	},
	redo: function(){
		if(this.currentAction+1 < this.actions.length){
			this.currentAction++;
			this.actions[this.currentAction].redo();
		}
	},
	resetHistory: function(){
		this.actions.length = 0;
		this.currentAction = -1;
	},
	pset: function(x,y,color){ this.doAction(new actionClasses.PsetAction(this,x,y,color)); },
	sset: function(x,y,color){ this.doAction(new actionClasses.SsetAction(this,x,y,color));	},
	mset: function(x,y,sprite){ this.doAction(new actionClasses.MsetAction(this,x,y,sprite));	},
	rotateSprite: function(spriteNumber){
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
	},
	clearSprite: function(spriteNumber){
		var i,j;
		for(i=0; i<cellwidth(); i++){
			for(j=0; j<cellheight(); j++){
				var x = ssx(spriteNumber)*cellwidth() + i;
				var y = ssy(spriteNumber)*cellheight() + j;
				sset(x, y, 0);
			}
		}
	},
	flipSprite: function(spriteNumber, flipX){
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
	},
	copySprite: function(from,to){
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
	},
	saveEditorSettings: function(){
		var settings = {
			mode: this.mode
		};
		try {
			localStorage.setItem('cartridgeEditor', JSON.stringify(settings));
		} catch(err){}
	},
	loadEditorSettings: function(){
		var settings = {};
		try {
			settings = JSON.parse(localStorage.getItem('cartridgeEditor'));
		} catch(err){}
		if(Editor.modes.indexOf(settings.mode) !== -1){
			this.mode = settings.mode;
		}
	}
};

Editor.Modes = {
	GAME: 'game',
	SPRITE: 'sprite',
	MAP: 'map',
	SFX: 'sfx',
	CODE: 'code',
	TRACK: 'track',
	PATTERN: 'pattern',
	HELP: 'help',
	RUN: 'run'
};
Editor.modes = Object.values(Editor.Modes);

module.exports = Editor;
},{"./Action":2}],5:[function(require,module,exports){
var Rectangle = require('../Rectangle');
var utils = require('../utils');

module.exports = Flags;

function Flags(options){
	options = options || {};
	Rectangle.call(this);

	if(options.x) this.x = options.x;
	if(options.y) this.y = options.y;
	if(options.sx) this.sx = options.sx;
	if(options.sy) this.sy = options.sy;
	if(options.current) this.current = options.current;
	if(options.onclick) this.onclick = options.onclick;
}
Flags.prototype = Object.create(Rectangle.prototype);
Object.assign(Flags.prototype, {
	x: function(){ return 0; },
	y: function(){ return 0; },
	current: function(){},
	draw: function(){
		var x = this.x();
		var y = this.y();
		var size = 3;
		for(var i=0; i<8; i++){
			var rx = x + i * (size+3);
			var ry = y;
			var qx = x+(1+size) + i * (3+size);
			var qy = y+1+size;
			if((this.current() & (1 << i)) !== 0)
				rectfill(rx, ry, qx, qy, 0);
			else
				rect(rx, ry, qx, qy, 0);
		}
	},
	click: function(x, y){
		if(utils.inrect(x,y,this.x(),this.y(),6*8,5)){
			var flagIndex = flr((x-this.x()) / 6);
			var oldFlags = this.current();
			var clickedFlag = (1 << flagIndex);
			var newFlags = (oldFlags & clickedFlag) ? (oldFlags & (~clickedFlag)) : (oldFlags | clickedFlag);
			this.current(newFlags);
			this.onclick();
			return true;
		} else {
			return false;
		}
	},
	onclick: function(){}
});

},{"../Rectangle":1,"../utils":8}],6:[function(require,module,exports){
var Rectangle = require('../Rectangle');
var utils = require('../utils');

module.exports = Palette;

function Palette(options){
	options = options || {};
	Rectangle.call(this);

	if(options.x){ this.x = options.x; }
	if(options.y){ this.y = options.y; }
	if(options.sx){ this.sx = options.sx; }
	if(options.sy){ this.sy = options.sy; }
	this.onclick = options.onclick || function(){};

	this.current = options.current === undefined ? 1 : options.current;
}
Palette.prototype = Object.create(Rectangle.prototype);
Object.assign(Palette.prototype, {
	n: function(){
		var n = 2;
		var palsize = 0;
		while(palget(palsize) !== undefined) palsize++;
		while(n*n<palsize) n *= 2;
		return n;
	},
	sx: function(){ return 4; },
	sy: function(){ return 4; },
	x: function(){ return 0; },
	y: function(){ return 0; },
	click: function(x,y){
		var n = this.n();
		if(utils.inrect(x,y,this.x(),this.y(),this.sx()*n,this.sy()*n)){
			var px = flr((x-this.x()) / this.sx());
			var py = flr((y-this.y()) / this.sy());
			var newColor = px + n * py;
			if(palget(newColor) !== undefined && this.current !== newColor){
				this.current = newColor;
				this.onclick();
				return true;
			}
		}
		return false;
	},
	draw: function(){
		var x = this.x();
		var y = this.y();
		var sx = this.sx();
		var sy = this.sy();
		var current = this.current;
		var n=0;
		var size = this.n();
		for(var j=0; j<size; j++){
			for(var i=0; i<size; i++){
				if(palget(n) === undefined){
					break;
				}
				var rx = x+i*sx;
				var ry = y+j*sy;
				var rw = x+(i+1)*sx-1;
				var rh = y+(j+1)*sy-1;
				if(n=== 0){
					// transparent
					for(var x1=rx; x1<rx+rw; x1++){
						for(var y1=ry; y1<ry+rh; y1++){
							pset(x1,y1,(x1+y1)%2 ? 6 : 7);
						}
					}
				} else {
					rectfill(rx, ry, rw, rh, n);
				}
				if(current === n){
					rect(rx, ry, rw, rh, 0);
				}
				n++;
			}
		}
	}
});

},{"../Rectangle":1,"../utils":8}],7:[function(require,module,exports){
var utils = require('../utils');
var Editor = require('./Editor');
var Palette = require('./Palette');
var Flags = require('./Flags');
var Buttons = require('./Buttons');
var Rectangle = require('../Rectangle');

var editor = new Editor({
	mode: Editor.modes[0]
});

var sprites = {
	current: 1, // Because zero is "empty sprite"
	panx: 0,
	pany: 0,
	x: function(){ return 0; },
	y: function(){ return flr(3 * height() / 4); },
	w: function(){ return width(); },
	h: function(){ return ceil(height() / 4); },
	draw: function(){
		var offsetX = this.x();
		var offsetY = this.y();

		var cw = cellwidth();
		var ch = cellheight();

		rectfill(offsetX, offsetY, offsetX + this.w() - 1, offsetY + this.h() - 1, 0);
		clip(offsetX, offsetY, this.w(), this.h());
		spr(0, offsetX-this.panx, offsetY-this.pany, ssget(), ssget());

		// Rectangle around the current editing sprite
		var x = offsetX + (ssx(this.current)) * cw - this.panx;
		var y = offsetY + (ssy(this.current)) * ch - this.pany;
		rect(
			x-1, y-1,
			x+cw, y+ch,
			6
		);

		// Reset clip
		clip();
	},
	clamp_pan: function(){
		this.panx = clamp(this.panx, 0, Math.max(0,ssget()*cellwidth()-this.w()));
		this.pany = clamp(this.pany, 0, Math.max(0,ssget()*cellheight()-this.h()));
	}
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
	note: 0,
	col: 0
};

function editorSave(destination){
	if(editor.mode !== Editor.Modes.RUN){
		width(editor.gameWidth);
		height(editor.gameHeight);
		save(destination);
		width(editor.editorWidth);
		height(editor.editorHeight);
		editor.dirty = true; // make sure to re-render after the resize
	}
}

function editorLoad2(source, callback){
	callback = callback || function(){};
	if(source.indexOf('.json') !== -1){
		utils.loadJsonFromUrl(source,function(err,json){
			if(json){
				load(json);
				callback(true);
			} else {
				callback(false);
			}
		});
	} else {
		callback(load(source));
	}
}

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
		var col = Math.floor((mx - x - column*w) / fontWidth);
		if(col >= 1) col--; // pitch uses 2 spaces
		track.col = col;
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
		track_drawpart(x0, y, track.note, trackGroupSelector.current, n*8, n*8+8, track.col);

		n++;
	}
}

function track_drawpart(x, y, highlightedNote, trackIndex, start, end, selectedCol){
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
		var effect = neget(trackIndex, j);

		// Highlight selected
		if(highlightedNote === j){
			rectfill(x, y0, x+w-1, y0+fontHeight-1, 5);
			var highlightCol = selectedCol >= 1 ? selectedCol + 1 : selectedCol;
			rectfill(x+highlightCol*fontWidth, y0, x+(highlightCol+1)*fontWidth, y0+fontHeight-1, 6);
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
		print(effect === 0 ? '-' : (effect), x+1+fontWidth*5, y0+1,13);
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

function track_keydown(track, evt){
	if(evt.ctrlKey || evt.metaKey || evt.altKey) return;

	switch(evt.keyCode){
	case 46:
		nvset(trackGroupSelector.current, track.note, 0);
		break;
	case 37: // left
		track.note = utils.mod(track.note-8, 32);
		break;
	case 39: // right
		track.note = utils.mod(track.note+8, 32);
		break;
	case 38: // up
		track.note = utils.mod(track.note-1, 32);
		break;
	case 40: // down
		track.note = utils.mod(track.note+1, 32);
		break;
	}
}

function track_keypress(track, evt){
	if(evt.ctrlKey || evt.metaKey || evt.altKey) return;

	var char = String.fromCharCode(evt.charCode).toUpperCase();
	if(evt.keyCode === 32){ // space
		group(trackGroupSelector.current);
	} else if(track.col === 0 && keyToNote[char] !== undefined){
		var pitch = keyToNote[char] % 17;
		var octaveAdd = Math.floor(keyToNote[char] / 17);
		var octave = Math.min(octaveButtons.current + octaveAdd, 3);
		npset(trackGroupSelector.current, track.note, pitch);
		niset(trackGroupSelector.current, track.note, waveformButtons.current);
		nvset(trackGroupSelector.current, track.note, trackVolumeButtons.current);
		noset(trackGroupSelector.current, track.note, octave);
		neset(trackGroupSelector.current, track.note, effectButtons.current);
		track.note = (track.note+1)%32;
	} else if(evt.keyCode >= 48 && evt.keyCode <= 57){ // 0-9
		var num = evt.keyCode - 48;
		var caught = true;
		switch(track.col){
		case 1:
			if(num >= 1 && num <= 4) noset(trackGroupSelector.current, track.note, num-1);
		case 2:
			if(num >= 1 && num <= 6) niset(trackGroupSelector.current, track.note, num-1);
			break;
		case 3:
			if(num >= 1 && num <= 8) nvset(trackGroupSelector.current, track.note, num-1);
			break;
		case 4:
			if(num >= 0 && num <= 2) neset(trackGroupSelector.current, track.note, num);
			break; // effect
		default: caught = false; break;
		}
		if(caught) track.note = (track.note+1)%32;
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
			var x0 = viewport.x + i * viewport.sx();
			var y0 = viewport.y + j * viewport.sy();
			var x1 = viewport.x + (i+1) * viewport.sx()-1;
			var y1 = viewport.y + (j+1) * viewport.sy()-1;
			if(palt(col)){
				// transparent
				for(var k=x0; k<=x1; k++){
					for(var l=y0; l<=y1; l++){
						pset(k, l, ((k+l)%2) === 0 ? 6 : 7);
					}
				}
			} else {
				rectfill(x0, y0, x1, y1, col);
			}
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
		"_click",
		"_draw",
		"_init",
		"_kill",
		"_update",
		"_update60",
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
var mapShowGrid = false;
var mapCellX = 0;
var mapCellY = 0;

var palette = new Palette({
	sx: function(){ return flr((width() * 0.4) / this.n()); },
	sy: function(){ return flr((height() * 0.3) / this.n()); },
	x: function(){ return width() - this.sx() * this.n() - 1; },
	y: function(){ return 8; },
	onclick: function(){ editor.dirty = true; }
});

var flags = new Flags({
	x: function(){ return palette.x(); },
	y: function(){ return palette.y() + palette.sy() * palette.n() + 1; },
	onclick: function(){ editor.dirty = true; },
	current: function(newFlags){
		if(newFlags === undefined){
			return fget(sprites.current);
		} else {
			fset(sprites.current, newFlags);
		}
	},
});

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
	options: ['save', 'load..', 'reset', 'export'],
	padding: 10
};

var nameButton = {
	x: function(){ return 30; },
	y: function(){ return 21; },
	options: [title()],
	padding: 40
};

var slotButtons = {
	x: function(){ return 58; },
	y: function(){ return 29; },
	num: 8,
	padding: 1
};

var saveButtons = {
	x: function(){ return slotButtons.x(); },
	y: function(){ return 37; },
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

var effectButtons = {
	x: function(){ return width() - 60; },
	y: function(){ return 16+8+8; },
	num: 3, // none, short, slide
	current: 0,
	padding: 2
};

var octaveButtons = new Buttons({
	x: function(){ return width() - 24; },
	y: function(){ return 16; },
	num: 4,
	current: 0,
	padding: 0,
	onclick: function(){ editor.dirty = true; }
});

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

var toolButtons = new Buttons({
	x: function(){ return 1; },
	y: function(){ return viewport.y + viewport.sy() * cellheight() + 1; },
	options: ['draw','fill'],
	current: 0,
	padding: 6,
	onclick: function(){ editor.dirty = true; }
});

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
	current: editor.gameWidth,
	padding: 4,
	min: function(){ return 128; },
	max: function(){ return 512; },
	prefix: '',
	postfix: ''
};

var resolutionSelectorY = {
	x: function(){ return resolutionSelectorX.x(); },
	y: function(){ return 88; },
	current: editor.gameHeight,
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
	mapShowGrid = false;

	switch(editor.mode){
	case Editor.Modes.SPRITE:
		if(mousebtn(1) || forceMouseDown){
			// Draw on sprite
			var x = flr((mousex()-viewport.x) / viewport.sx());
			var y = flr((mousey()-viewport.y) / viewport.sy());

			if(sprites.current !== 0 && utils.inrect(x, y, 0, 0, cellwidth(), cellheight())){
				if(toolButtons.current === 0){
					// Draw!
					editor.sset(
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
			sprites.clamp_pan();

			editor.dirty = true;
		}
		break;

	case Editor.Modes.MAP:
		var dx = mousex() - editor.lastmx;
		var dy = mousey() - editor.lastmy;
		if(utils.inrect(mousex(), mousey(), 0, 8, width(), spriteSheetPageSelector.y()-9)){

			mapCellX = flr((mousex() - mapPanX) / cellwidth());
			mapCellY = flr((mousey() - mapPanY) / cellheight());

			if(editor.keysdown[32] || mousebtn(2) || mousebtn(3)){
				// Pan map
				// TODO: clamp panning
				mapPanX += dx;
				mapPanY += dy;
				mapShowGrid = true;
				editor.dirty = true;
			} else if((forceMouseDown || mousebtn(1))){
				// Draw on map
				editor.mset(
					mapCellX,
					mapCellY,
					sprites.current
				);
				editor.dirty = true;
			}
		} else if(editor.keysdown[32] || mousebtn(2) || mousebtn(3)){
			// Pan sprite view
			sprites.panx -= dx;
			sprites.pany -= dy;

			// clamp panning
			sprites.clamp_pan();

			editor.dirty = true;
		}
		break;

	case Editor.Modes.SFX:
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
		case Editor.Modes.CODE:
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
	if(mode === Editor.Modes.SPRITE){
		if(palette.click(mx,my)){

		} else if(flags.click(mx,my)){

		} else if(toolButtons.click(mx,my)){

		}
	}
	if(mode === Editor.Modes.SPRITE || mode === Editor.Modes.MAP){
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
			sprites.clamp_pan();

			editor.dirty = true;
		}
	} else if(mode === Editor.Modes.SFX){
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
		if(Editor.modes[topButtons.current] === Editor.Modes.RUN){
			code_run(code);
			editor.dirty = true;
		} else {
			editor.mode = Editor.modes[topButtons.current];
		}
		editor.dirty = true;
	}

	if(editor.mode === Editor.Modes.CODE && code_click(code,mx,my)){
		editor.dirty = true;
	} else if(editor.mode === Editor.Modes.GAME){
		if(buttons_click(slotButtons,mx,my)){
			editorLoad2('slot' + slotButtons.current, function(success){
				if(success){
					alert('Loaded game from slot ' + (slotButtons.current + 1) + '.');
				} else {
					alert('Could not load game from slot ' + (slotButtons.current + 1) + '.');
				}
				editor.dirty = true;
				code.syntaxTreeDirty = true;
				slotButtons.current = -1;
			});
		} else if(buttons_click(nameButton,mx,my)){
			var newTitle = prompt('Name?', title());
			if(newTitle){
				title(newTitle);
				nameButton.options[0] = title();
			}
			nameButton.current = -1;
		}

		if(buttons_click(saveLoadButtons,mx,my)){
			switch(saveLoadButtons.current){
				case 0: editorSave('game.json'); break;
				case 1: openfile(); break;
				case 2: reset(); break;
				case 3: exportHtml('../build/cartridge.min.js'); break;
			}
			saveLoadButtons.current = -1;
			editor.dirty = true;
		}

		if(buttons_click(saveButtons,mx,my)){
			editorSave('slot' + saveButtons.current);
			alert('Saved game to slot ' + (saveButtons.current + 1) + '.');
			editor.dirty = true;
			saveButtons.current = -1;
		}

		if(intsel_click(resolutionSelectorX, mx, my)){
			editor.gameWidth = resolutionSelectorX.current;
			editor.dirty = true;
		}

		if(intsel_click(resolutionSelectorY, mx, my)){
			editor.gameHeight = resolutionSelectorY.current;
			editor.dirty = true;
		}
		if(buttons_click(spriteSheetSizeButtons,mx,my)){
			ssset(spriteSheetSizeButtons.current === 0 ? 16 : 32);
			sprites.clamp_pan();
			editor.dirty = true;
		}
		if(buttons_click(spriteSizeButtons,mx,my)){
			var newSize = spriteSizeButtons.options[spriteSizeButtons.current];
			cellwidth(newSize);
			cellheight(newSize);
			editor.clearSprite(0); // TODO: ???
			sprites.clamp_pan();
			editor.dirty = true;
		}
	} else if(editor.mode === Editor.Modes.TRACK){
		if(intsel_click(trackSpeedSelector, mx, my)){
			gsset(trackGroupSelector.current, trackSpeedSelector.current);
			editor.dirty = true;
		} else if(intsel_click(trackGroupSelector, mx, my)){
			editor.dirty = true;
		} else if(buttons_click(waveformButtons,mx,my)){
			editor.dirty = true;
		} else if(buttons_click(effectButtons,mx,my)){
			editor.dirty = true;
		} else if(octaveButtons.click(mx,my)){

		} else if(buttons_click(trackVolumeButtons,mx,my)){
			editor.dirty = true;
		} else if(track_click(track,mx,my)){
			editor.dirty = true;
		}
	} else if(editor.mode === Editor.Modes.PATTERN){
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

window.onbeforeunload = function(e) {
	editorSave('autosave');
	editor.saveEditorSettings('cartridgeEditor');
};

var editorLoad = window._init = function _init(){

	editor.loadEditorSettings('cartridgeEditor');
	if(editor.mode === Editor.Modes.RUN) editor.mode = Editor.modes[0];

	setInterval(function(){
		editorSave('autosave');
		editor.saveEditorSettings('cartridgeEditor');
	}, 10000);

	editorLoad2('autosave', function(success){
		if(!success){
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
	});
	editor.dirty = true;
	code.syntaxTreeDirty = true;
};

function mousebtnchanged(i, value){
	if(!value){
		mapShowGrid = false;
		editor.dirty = true;
	}
}

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
	for(var i=0; i<4; i++){
		var current = mousebtn(i);
		if(editor.lastmousebtn[i] !== current){
			mousebtnchanged(i, current);
		}
		editor.lastmousebtn[i] = current;
	}

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

	topButtons.current = Editor.modes.indexOf(editor.mode);

	switch(editor.mode){
	case Editor.Modes.CODE:
		code_draw(code);
		break;
	case Editor.Modes.SPRITE:
		viewport_draw(viewport);
		sprites.draw();
		palette.draw();
		toolButtons.draw();
		intsel_draw(spriteSheetPageSelector);
		var currentText = "sprite "+sprites.current + "/(" + ssx(sprites.current) + "," + ssy(sprites.current) + ")";
		print(currentText, spriteSheetPageSelector.x()-currentText.length*4-1, spriteSheetPageSelector.y()+1, 0);
		flags.draw();
		break;
	case Editor.Modes.MAP:
		map(0, 0, mapPanX, mapPanY, 128, 32);
		rect(mapPanX-1, mapPanY-1, mapPanX+cellwidth()*128, mapPanY+cellheight()*32, 0);
		if(mapShowGrid){
			for(var y=mapPanY%cellheight(); y<height(); y+=cellheight()){
				rect(0, y, width(), 0, 3);
			}
			for(var x=mapPanX%cellwidth(); x<width(); x+=cellwidth()){
				rect(x, 0, 0, height(), 3);
			}
		}
		sprites.draw();
		intsel_draw(spriteSheetPageSelector);
		if(mapCellX>=0 && mapCellY>=0)
			print(mapCellX + ',' + mapCellY, 1, spriteSheetPageSelector.y()+1, 0);
		break;
	case Editor.Modes.SFX:
		pitches_draw(pitches, 0);
		pitches_draw(volumes, 1, 0);
		buttons_draw(waveformButtons);
		speedSelector.current = asget(sfxSelector.current);
		intsel_draw(speedSelector);
		intsel_draw(sfxSelector);
		break;
	case Editor.Modes.GAME:
		print("file:", 5,14);
		buttons_draw(saveLoadButtons);

		print("title:", 5,22);
		nameButton.options[0] = title();
		buttons_draw(nameButton);

		print("Load slot:", 5,30);
		buttons_draw(slotButtons);

		print("Save in slot:", 5,38);
		buttons_draw(saveButtons);

		print('Resolution:', 5,80);
		resolutionSelectorX.current = editor.gameWidth;
		resolutionSelectorY.current = editor.gameHeight;
		intsel_draw(resolutionSelectorX);
		intsel_draw(resolutionSelectorY);

		print('spritesheet size:', 5,99);
		spriteSheetSizeButtons.current = (ssget() === 16 ? 0 : 1);
		buttons_draw(spriteSheetSizeButtons);

		print('sprite size:', 5,106);
		spriteSizeButtons.current = spriteSizeButtons.options.indexOf(cellwidth());
		buttons_draw(spriteSizeButtons);

		break;

	case Editor.Modes.TRACK:
		track_draw(track);
		intsel_draw(trackGroupSelector);
		trackSpeedSelector.current = gsget(trackGroupSelector.current);
		intsel_draw(trackSpeedSelector);
		buttons_draw(waveformButtons);
		buttons_draw(effectButtons);
		print("octave", width() - 60, 17);
		octaveButtons.draw();
		print("vol", width() - 60, 25);
		buttons_draw(trackVolumeButtons);
		break;

	case Editor.Modes.PATTERN:
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

	case Editor.Modes.HELP:
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

	// Draw top
	rectfill(0, 0, width(), 6, 0);
	buttons_draw(topButtons);

	// Draw mouse
	mouse_draw(mousex(), mousey());
};

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

function mouse_draw(x,y){
	rectfill(x-4, y, x+4, y);
	rectfill(x, y-4, x, y+4);
	rectfill(x, y, x, y, 4);
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
	if(editor.mode === Editor.Modes.RUN){
		console.error(info);
		code_stop(code);

		// Handle error
		editor.mode = Editor.Modes.CODE;
		code.ccol = info.column - 1;
		code.crow = info.line - 1;
		code.errorMessage = 'L' + info.column + ' C' + info.line + ' ' + info.message;
		code.errorTime = time();
		editor.dirty = true;
	}
};

function code_run(code){
	// Run code in global scope
	code.previousMode = editor.mode;
	editor.mode = Editor.Modes.RUN;
	code.initialized = false;

	delete window._update;
	delete window._update60;
	delete window._init;
	delete window._kill;
	delete window._draw;
	delete window._click;

	width(editor.gameWidth);
	height(editor.gameHeight);

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

	width(editor.editorWidth);
	height(editor.editorHeight);
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

// TODO: should this logic be in the engine?
function reset(){

	// sprites
	var numSprites = ssget() * ssget();
	for(var i=0; i<numSprites; i++){
		editor.clearSprite(i); // TODO: ???
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

function resizeHandler(){
	editor.dirty = true;
}
window.addEventListener("resize", resizeHandler);
window.addEventListener("mozfullscreenchange", resizeHandler);

window.addEventListener('keydown', function(evt){
	if(editor.mode === Editor.Modes.RUN){
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
		editor.mode = Editor.modes[utils.mod(Editor.modes.indexOf(editor.mode)+delta, Editor.modes.length)];
		if(editor.mode === Editor.Modes.RUN)
			editor.mode = Editor.modes[utils.mod(Editor.modes.indexOf(editor.mode)+delta, Editor.modes.length)];
		editor.dirty = true;

		// Prevent going back in history
		evt.cancelBubble = true;
		evt.returnValue = false;
		evt.preventDefault();

		return;
	}

	if(utils.isMac() ? evt.metaKey : evt.ctrlKey){
		// ctrl+enter -> run game
		if(evt.keyCode === 13){
			code_run(code);
			return;
		}

		// ctrl+z -> undo
		if(evt.keyCode === 90){
			editor.undo();
			evt.preventDefault();
			return;
		}

		// ctrl+y -> undo
		if(evt.keyCode === 89){
			editor.redo();
			evt.preventDefault();
			return;
		}
	}

	if(editor.mode === Editor.Modes.CODE){
		code_keydown(code, evt);
	} else if(editor.mode === Editor.Modes.TRACK){
		track_keydown(track, evt);
	} else if(!evt.altKey && !evt.metaKey && !evt.ctrlKey){
		switch(evt.keyCode){
			case 86: if(editor.mode === Editor.Modes.SPRITE) editor.flipSprite(sprites.current, false); break; // V
			case 70: if(editor.mode === Editor.Modes.SPRITE) editor.flipSprite(sprites.current, true); break; // F
			case 82: if(editor.mode === Editor.Modes.SPRITE) editor.rotateSprite(sprites.current); break; // R
			case 46: if(editor.mode === Editor.Modes.SPRITE) editor.clearSprite(sprites.current); break; // delete
			case 81: if(editor.mode === Editor.Modes.SPRITE || editor.mode === Editor.Modes.MAP) sprites.current=utils.mod(sprites.current-1,ssget()*ssget()); break; // Q
			case 87: if(editor.mode === Editor.Modes.SPRITE || editor.mode === Editor.Modes.MAP) sprites.current=utils.mod(sprites.current+1,ssget()*ssget()); break; // W
			case 32: if(editor.mode === Editor.Modes.SFX) sfx(sfxSelector.current); break;
		}
	}
	editor.dirty = true;
});

document.addEventListener('keydown', function(e){
	if(editor.mode === Editor.Modes.RUN) return;

	// ctrl + s
	if (e.keyCode == 83 && (utils.isMac() ? e.metaKey : e.ctrlKey)){
		editorSave('game.json');
		e.preventDefault();
	}

	// ctrl + o
	if (e.keyCode == 79 && (utils.isMac() ? e.metaKey : e.ctrlKey)){
 		openfile();
		e.preventDefault();
	}

	// backspace
	if (editor.mode === Editor.Modes.CODE && e.keyCode === 8) {
		e.preventDefault();
	}

}, false);

window.addEventListener('keypress', function(evt){
	if(editor.mode === Editor.Modes.RUN) return;
	if(editor.mode === Editor.Modes.CODE){
		code_keypress(code, evt);
	} else if(editor.mode === Editor.Modes.TRACK){
		track_keypress(track, evt);
	} else if(editor.mode === Editor.Modes.PATTERN){
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
			editorLoad2(json);
			code.syntaxTreeDirty = true;
			editor.dirty = true;
		} catch(err){
			console.error('Could not load file');
		}
	});
}

window.addEventListener('paste', handlepaste, false);
function handlepaste (e) {
	if(editor.mode === Editor.Modes.RUN) return;
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
	if(editor.mode !== Editor.Modes.SPRITE || sprites.current === 0){
		return;
	}

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
		var x0 = ssx(sprites.current) * cellwidth();
		var y0 = ssy(sprites.current) * cellheight();
		for(var i=0; i<img.width && x0 + i < ssget() * cellwidth(); i++){
			for(var j=0; j<img.height && y0 + j < ssget() * cellheight(); j++){
				// Get best matching color
				var p = 4 * (i + j*img.width);
				var r = pixels[p + 0];
				var g = pixels[p + 1];
				var b = pixels[p + 2];
				var a = pixels[p + 3];

				var bestColor = 0;
				var distance = 1e10;
				for(var k=0; palget(k) !== undefined; k++){
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
				var x = x0 + i;
				var y = y0 + j;
				sset(x, y, bestColor);

				editor.dirty = true;
			}
		}

		urlCreator.revokeObjectURL(img.src);
	};
	img.src = urlCreator.createObjectURL(file);
}

function handlePasteString(str){
	switch(editor.mode){
	case Editor.Modes.SPRITE:
		var m = str.match(/sprite:([\d]+)/);
		if(m){
			editor.copySprite(parseInt(m[1]), sprites.current);
			editor.dirty = true;
		}
		break;
	case Editor.Modes.CODE:
		code_paste(code, str);
		break;
	default:
		console.log('Unhandled paste string!');
		break;
	}
}

document.addEventListener('copy', function(e){
	switch(editor.mode){
	case Editor.Modes.RUN:
		return;
	case Editor.Modes.SPRITE:
		e.clipboardData.setData('text/plain', 'sprite:'+sprites.current);
		e.preventDefault();
		break;
	case Editor.Modes.CODE:
		e.clipboardData.setData('text/plain', codeget()); // until selection is supported
		e.preventDefault();
		break;
	}
});

var query = utils.parseQueryVariables(window.location.search, {
	pixel_perfect: 'i',
	run: 'b',
	responsive: 'b',
	file: 's'
});
cartridge({
	containerId: 'container',
	pixelPerfect: query.pixel_perfect !== undefined ? query.pixel_perfect : (utils.isMobile() ? 1 : 0),
	responsive: query.responsive !== undefined ? query.responsive : false
});

run();

if(query.file){
	editor.loading = true;
	editorLoad2(query.file);
}

window._load = function(){
	editor.loading = false;
	code.syntaxTreeDirty = true;
	editor.gameWidth = width();
	editor.gameHeight = height();
	width(editor.editorWidth);
	height(editor.editorHeight);
	if(query.run){
		query.run = false; // Only once!
		code_run(code);
	}
	editor.dirty = true;
};

function spriteToDataURL(spriteX, spriteY, scale, mimetype){
	mimetype = mimetype || 'image/png';
	scale = scale !== undefined ? scale : 1;
	var canvas = document.createElement('canvas');
	canvas.width = cellwidth()*scale;
	canvas.height = cellheight()*scale;
	var c = canvas.getContext('2d');
	c.clearRect(0,0,cellwidth()*scale,cellheight()*scale); // needed?
	var data = c.createImageData(cellwidth()*scale,cellheight()*scale);
	for(var x=0; x<cellwidth(); x++){
		for(var y=0; y<cellheight(); y++){
			for(var sx=0; sx<scale; sx++){
				for(var sy=0; sy<scale; sy++){
					var p = (x*scale+sx + (y*scale+sy)*(cellwidth()*scale)) * 4;
					var col = sget(x+cellwidth()*spriteX,y+cellheight()*spriteY);
					if(!palt(col)){
						var dec = palget(col);
						data.data[p + 0] = utils.decToR(dec);
						data.data[p + 1] = utils.decToG(dec);
						data.data[p + 2] = utils.decToB(dec);
						data.data[p + 3] = 255;
					} else {
						data.data[p + 3] = 0;
					}
				}
			}
		}
	}
	c.putImageData(data,0,0);
	return canvas.toDataURL(mimetype);
}

function exportHtml(engineUrl, callback){
	callback = callback || function(){};

	// Get engine source
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {

				var scale = 4;
				var iconUrl = spriteToDataURL(1,0,scale); // scale=4 enough?
				var manifest = 'data:application/manifest+json;base64,' + btoa(JSON.stringify({
					display: "fullscreen",
					orientation: "portrait"
				}));
				var gameJson = json();
				gameJson.width = editor.gameWidth;
				gameJson.height = editor.gameHeight;
				gameJson = JSON.stringify(gameJson);

				// Generate HTML
				var htmlExport = [
					'<!DOCTYPE HTML>',
					'<html lang="en">',
					'<head>',
					'	<meta charset="utf-8">',
					'	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, minimal-ui" />',
					'	<meta name="apple-mobile-web-app-capable" content="yes">',
					'	<meta name="mobile-web-app-capable" content="yes">',
					'	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
					'	<link rel="icon" type="image/png" href="' + iconUrl + '" />',
					'	<link rel="apple-touch-icon" href="' + iconUrl + '">',
					'	<link rel="manifest" href="' + manifest + '" />',
					'	<title>' + title() + '</title>',
					'	<style>',
					'	body, html {',
					'		width: 100%;',
					'		height: 100%;',
					'		padding: 0;',
					'		margin: 0;',
					'		overflow: hidden;',
					'	}',
					'	#container {',
					'		width: 100%;',
					'		height: 100%;',
					'		background-color: black;',
					'	}',
					'	canvas {',
					'		cursor: none;',
					'	}',
					'	* {',
					'		-webkit-touch-callout: none; /* iOS Safari */',
					'			-webkit-user-select: none; /* Chrome/Safari/Opera */',
					'			-khtml-user-select: none; /* Konqueror */',
					'			-moz-user-select: none; /* Firefox */',
					'				-ms-user-select: none; /* Internet Explorer/Edge */',
					'					user-select: none; /* Non-prefixed version, currently not supported by any browser */',

					'		-webkit-tap-highlight-color: transparent; /* disable iOS Safari tap effect */',
					'	}',
					'	</style>',
					'</head>',
					'<body>',
					'	<div id="container"></div>',
					'	<script id="json" type="text/json">' + gameJson + '</script>',
					'	<script>' + xhr.responseText + '</script>',
					'	<script>',
					'		// Disable "bouncy scroll" on iOS',
					'		document.body.addEventListener("touchmove", function(event) {',
					'			event.stopPropagation();',
					'			event.preventDefault();',
					'		});',
					'		var theJSON = JSON.parse(document.getElementById("json").innerHTML);',
					'		cartridge({',
					'			containerId: "container",',
					'			pixelPerfect: 1,', // ??
					'		});',
					'		load(theJSON);',
					'		run();',
					'	</script>',
					'</body>',
					'</html>',

				].join('\n');
				utils.downloadStringAsTextFile(htmlExport, "game.html");
				callback(null);
			} else {
				// Error
				callback(xhr);
			}
		}
	};
	xhr.open("GET", engineUrl, true);
	xhr.send();
}

},{"../Rectangle":1,"../utils":8,"./Buttons":3,"./Editor":4,"./Flags":5,"./Palette":6}],8:[function(require,module,exports){
exports.disableImageSmoothing = function(ctx) {
	if(ctx.imageSmoothingEnabled !== undefined){
		ctx.imageSmoothingEnabled = false;
	} else if(ctx.mozImageSmoothingEnabled !== undefined){
		ctx.mozImageSmoothingEnabled = false;
	} else if(ctx.webkitImageSmoothingEnabled !== undefined){
		ctx.webkitImageSmoothingEnabled = false;
	} else if(ctx.msImageSmoothingEnabled !== undefined){
		ctx.msImageSmoothingEnabled = false;
	}
};

exports.hexToRgb = function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return [
		parseInt(result[1], 16),
		parseInt(result[2], 16),
		parseInt(result[3], 16)
	];
};

exports.rgbToDec = function(r, g, b){
	var c = r * (256*256) + g * 256 + b;
	return c;
};

exports.decToR = function(c){
	return Math.floor(c / (256*256));
};

exports.decToG = function(c){
	return Math.floor(c / 256) % 256;
};

exports.decToB = function(c){
	return c % 256;
};

function isSafari(){
	return navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1;
}

exports.isMac = function(){
	return navigator.platform.match("Mac");
};

exports.makeGlobal = function(obj){
	for(var key in obj){
		window[key] = obj[key];
	}
};

exports.scaleToFit = function scaleToFit(element, containerElement, pixelPerfectMode){
	var containerWidth = window.innerWidth;
	var containerHeight = window.innerHeight;
	if(containerElement){
		var rect = containerElement.getBoundingClientRect();
		containerWidth = rect.width;
		containerHeight = rect.height;
	}
	var scaleX = containerWidth / element.width;
	var scaleY = containerHeight / element.height;
	var scale = Math.min(scaleX, scaleY);

	var dpr = window.devicePixelRatio || 1;

	if(pixelPerfectMode){
		scale = (Math.floor(scale * dpr)/dpr) || (1/dpr);
	}

	var offsetX = (containerWidth - element.width * scale) * 0.5;
	var offsetY = (containerHeight - element.height * scale) * 0.5;

	if(pixelPerfectMode){
		offsetX = Math.floor(offsetX * dpr) / dpr;
		offsetY = Math.floor(offsetY * dpr) / dpr;
	}

	// Safari doesn't have nearest neighbor rendering when using CSS3 scaling
	if (isSafari()){
		element.style.width = (element.width * scale) + "px";
		element.style.height = (element.height * scale) + "px";
		element.style.marginLeft = offsetX + 'px';
		element.style.marginTop = offsetY + 'px';
	} else {
		element.style.transformOrigin = "0 0"; //scale from top left
		element.style.transform = "translate(" + offsetX + "px, " + offsetY + "px) scale(" + scale + ")";
	}
};

exports.fullscreen = function(element) {
	if(document.fullscreenElement) return false;

	// Use the specification method before using prefixed versions
	if (element.requestFullscreen) {
		element.requestFullscreen();
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen();
	} else if (element.mozRequestFullScreen) {
		element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen();
	} else {
		return false;
	}

	return true;
};

exports.zeros = function(n, reusableArray){
	if(reusableArray === undefined){
		var a = [];
		while(n--){
			a.push(0);
		}
		return a;
	} else {
		for(var i=0; i<reusableArray.length; i++){
			reusableArray[0] = 0;
		}
		while(reusableArray.length < n) reusableArray.push(0);
		return reusableArray;
	}
};

exports.createCanvas = function(w,h,pixelSmoothing){
	pixelSmoothing = pixelSmoothing === undefined ? true : pixelSmoothing;

	var canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	if(pixelSmoothing){
		exports.disableImageSmoothing(canvas.getContext('2d'));
	}

	return canvas;
}

exports.createCanvasFromAscii = function(asciiArray, charToColorMap){
	var width = asciiArray[0].length;
	var height = asciiArray.length;
	var canvas = exports.createCanvas(width, height);
	var ctx = canvas.getContext('2d');
	var imageData = ctx.createImageData(width, height);
	for(var i=0; i<height; i++){
		for(var j=0; j<width; j++){
			var p = 4 * (i * width + j);
			var rgba = charToColorMap[asciiArray[i][j]];
			imageData.data[p+0] = rgba[0];
			imageData.data[p+1] = rgba[1];
			imageData.data[p+2] = rgba[2];
			imageData.data[p+3] = rgba[3];
		}
	}
	ctx.putImageData(imageData, 0, 0);
	return canvas;
};

// Get the line and column of an error. Works in all major browsers.
exports.getErrorInfo = function(err) {
	var line = -1;
	var column = -1;
	if(err.lineNumber!==undefined && err.columnNumber!==undefined){
		line = err.lineNumber;
		column = err.columnNumber;
	} else if(err.line!==undefined && err.column!==undefined){
		line = err.line;
		column = err.column;
	}
	var stack = err.stack;
	var m = stack.match(/:(\d+):(\d+)/mg);
	if(m){
		var nums = m[1].split(':');
		line = parseInt(nums[1]);
		column = parseInt(nums[2]);
	}
	return {
		message: err.message,
		line: line,
		column: column,
		originalError: err
	};
};

exports.loadJsonFromUrl = function(url, callback){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				callback(null, JSON.parse(xhr.responseText));
			} else {
				callback(xhr);
			}
		}
	};
	xhr.open("GET", url, true);
	xhr.send();
};

exports.removeTrailingZeros = function(arr){
	while(arr[arr.length-1] === 0){
		arr.pop();
	}
};

// iOS audio fix, to allow playing sounds from the first touch
exports.iosAudioFix = function(element, callback){
	var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	if(iOS){
		var isUnlocked = false;
		element.ontouchend = function(){
			console.log('ontouchend')
			if(isUnlocked) return;

			isUnlocked = true;
			if(callback) callback();
		};
	} else {
		if(callback) callback();
	}
};

exports.values = function(obj){
	var vals = [];
	for(var key in obj) {
		vals.push(obj[key]);
	}
	return vals;
};

// Parse query vars
// "search" is window.location.search
exports.parseQueryVariables = function(search,variables) {
	var query = search.substring(1);
	var vars = query.split('&');
	var result = {};
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		var varName = decodeURIComponent(pair[0]);
		var type = variables[varName];
		if (type === undefined) continue;

		var value = decodeURIComponent(pair[1]);
		var ok = false;
		switch(type){
			case 'i':
				value = parseInt(value, 10);
				ok = !isNaN(value);
				break;
			case 'b':
				value = (value === "1");
				ok = true;
				break;
			case 's':
				ok = true;
				break;
		}
		if(ok){
			result[varName] = value;
		}
	}
	return result;
};

exports.floodfill = function(get, set, x, y, target, replace, xmin, xmax, ymin, ymax){
	if(target === replace) return;
	if(get(x,y) !== target) return;
	var q = [];
	q.push(x,y);
	while(q.length){
		var nx = q.shift();
		var ny = q.shift();
		if(get(nx,ny) === target){
			set(nx,ny,replace);
			if(nx > xmin && get(nx-1,ny) === target) q.push(nx-1,ny);
			if(nx < xmax && get(nx+1,ny) === target) q.push(nx+1,ny);
			if(ny < ymax && get(nx,ny+1) === target) q.push(nx,ny+1);
			if(ny > ymin && get(nx,ny-1) === target) q.push(nx,ny-1);
		}
	}
};

// Reliable modulo
exports.mod = function(a,b) {
	return ((a%b)+b)%b;
};

var input = null;
exports.opentextfile = function(callback){
	if(!input){
		input = document.createElement('input');
		input.style.display = 'none';
		input.type = 'file';
		input.value = null;
		document.body.appendChild(input);
	}
	input.onchange = function(e) {
		var file = e.target.files[0];
		if (!file) {
			return callback(new Error('No file.'));
		}
		var reader = new FileReader();
		reader.onload = function(e) {
			callback(null, e.target.result);
		};
		reader.onerror = function(e) {
			callback(new Erorr('Could not open file.'));
		};
		reader.readAsText(file);
		this.value = null;
	};

	input.click();
};

exports.inrect = function(x,y,rx,ry,rw,rh){
	return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
};

exports.isMobile = function() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
};

exports.downloadStringAsTextFile = function(str, filename){
	var url = URL.createObjectURL(new Blob([str]));
	var a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};
},{}]},{},[7]);
