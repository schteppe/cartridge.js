var TopBar = require('./TopBar');
var Mouse = require('./Mouse');
var Component = require('./Component');
var SpriteEditor = require('./SpriteEditor');

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

    // Sprite editor view
    this.spriteEditor = new SpriteEditor();
    this.spriteEditor.z = 100;
    this.add(this.spriteEditor);

    // Top bar
    this.topBar = new TopBar();
    this.topBar.z = 200;
    this.topBar.onclick = function(){
        that.nextMode();
    };
    this.add(this.topBar);

    // Mouse
    this.mouse = new Mouse();
    this.mouse.z = 300;
    this.add(this.mouse);

    this.keysdown = {};
    this.addListeners();
}
Editor.prototype = Object.create(Component.prototype);

Editor.prototype.nextMode = function(){
    var newModeIndex = (this.modes.indexOf(this.mode) + 1) % this.modes.length;
    this.mode = this.modes[newModeIndex];

    this.spriteEditor.hidden = this.mode !== "sprite";

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
    this.topBar.w = this.w;
    this.topBar.h = 6;

    this.spriteEditor.x = this.x;
    this.spriteEditor.y = this.y + this.topBar.h;
    this.spriteEditor.w = this.w;
    this.spriteEditor.h = this.h - this.topBar.h;

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
