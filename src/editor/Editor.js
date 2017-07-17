var actionClasses = require('./Action');

function Editor(){
	this.mode = Editor.modes[0];
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
	this.currentAction = 0;
};

Editor.prototype = {
	pset: function(){
		this.actions.push(new actionClasses.PsetAction(x,y,color));
		this.redo();
	},
	undo: function(){
		if(this.currentAction > 0){
			this.actions[this.currentAction].undo();
			this.currentAction--;
		}
	},
	redo: function(){
		if(this.currentAction < this.actions.length){
			this.actions[this.currentAction].redo();
			this.currentAction++;
		}
	}
};

Editor.modes = ['game', 'sprite', 'map', 'sfx', 'code', 'track', 'pattern', 'help', 'run'];

module.exports = Editor;