var TopBar = require('./TopBar');
var Mouse = require('./Mouse');
var Component = require('./Component');

module.exports = Editor;

function Editor(){
    Component.call(this);
    var that = this;

    this.dirty = true;
	this.lastmx = mousex();
	this.lastmy = mousey();

    this.color = 7;
    this.modes = [
        'sprite',
        'map',
        'sfx'
    ];
    this.mode = this.modes[0];

    // Top bar
    this.topBar = new TopBar();
    this.topBar.onclick = function(){
        that.nextMode();
    };
    this.add(this.topBar);

    // Mouse
    this.mouse = new Mouse();
    this.add(this.mouse);

    this.keysdown = {};
    this.addListeners();
}
Editor.prototype = Object.create(Component.prototype);

Editor.prototype.nextMode = function(){
    var newModeIndex = (this.modes.indexOf(this.mode) + 1) % this.modes.length;
    this.mode = this.modes[newModeIndex];

    switch(this.mode){
    case "sprite":
        break;
    case "map":
        break;
    case "sfx":
        break;
    }

    this.dirty = true;
};

Editor.prototype.mousemove = function(){
    this.dirty = true;
};

Editor.prototype.draw = function(){
    if(!this.dirty) return true;

    // Inherit dimensions
    this.w = this.parent.w;
    this.h = this.parent.h;

	rectfill(0, 0, this.w, this.h, this.color);

    this.topBar.text = this.mode.toUpperCase();

    this.dirty = false;
};

Editor.prototype.addListeners = function(){
    var that = this;

    window.onkeyup = function(evt){
        that.keysdown[evt.keyCode] = false;
    };

    window.onkeydown = function(evt){
        that.keysdown[evt.keyCode] = true;
        switch(evt.keyCode){
            case 32: if(that.mode === 'sfx') sfx(currentSoundEffect); break;
            case 83: save('game.json'); break;
            case 79: openfile(); break;
        }
        that.dirty = true;
    };

    function readSingleFile(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var json = JSON.parse(e.target.result);
                loadjson(json);
                dirty = true;
            } catch(err){
                console.error("Could not open file.");
            }
        };
        reader.readAsText(file);
    }

    function openfile(){
        var input = document.createElement('input');
        input.type = 'file';
        input.addEventListener('change', readSingleFile, false);
        input.click();
    }
};
