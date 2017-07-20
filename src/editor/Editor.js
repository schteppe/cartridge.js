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
	this.currentAction = -1;
	this.maxActions = 100;
}

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
	pset: function(x,y,color){ this.doAction(new actionClasses.PsetAction(this,x,y,color)); },
	sset: function(x,y,color){ this.doAction(new actionClasses.SsetAction(this,x,y,color));	},
	mset: function(x,y,sprite){ this.doAction(new actionClasses.MsetAction(this,x,y,sprite));	},
};

Editor.modes = ['game', 'sprite', 'map', 'sfx', 'code', 'track', 'pattern', 'help', 'run'];

module.exports = Editor;