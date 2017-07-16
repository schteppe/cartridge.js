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
};

Editor.prototype = {
};

Editor.modes = ['game', 'sprite', 'map', 'sfx', 'code', 'track', 'pattern', 'help', 'run'];

module.exports = Editor;