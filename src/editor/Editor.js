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