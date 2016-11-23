(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.EDITOR = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = Component;

function Component(){
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 128;
    this.h = 128;
    this.root = null;
    this.parent = null;
    this.hidden = null; // null, true or false. Children will inherit if not null.
    this.children = [];
    this.onclick = function(x,y){};
    this.onmousemove = function(x,y){};
    this.onmouseup = function(x,y){};
    this.onmousedown = function(x,y){};
}
Component.prototype = {
    add: function(child){
        child.parent = this;
        child.root = this.root;
        this.children.push(child);
    },
    draw: function(){},
    click: function(x,y){
        if(this.hit(x,y)){
            this.onclick();
        }
    },
    mousedown: function(x,y){},
    mouseup: function(x,y){},
    mousemove: function(x,y){},
    hit: function(x,y){
	    return x >= this.x && y >= this.y && x < this.x + this.w && y < this.y + this.h;
    }
};
},{}],2:[function(require,module,exports){
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

},{"./Component":1,"./Mouse":3,"./SpriteEditor":6,"./TopBar":7}],3:[function(require,module,exports){
var Component = require('./Component');

module.exports = Mouse;

function Mouse(){
    Component.call(this);
    this.color = 4;
    this.size = 4;
}
Mouse.prototype = Object.create(Component.prototype);

Mouse.prototype.draw = function(){
    var x = this.x;
    var y = this.y;
    var s = this.size;
	rectfill(x-s, y, x+s, y);
	rectfill(x, y-s, x, y+s);
	rectfill(x, y, x, y, this.color);
};

Mouse.prototype.mousemove = function(x,y){
    this.x = x;
    this.y = y;
};
},{"./Component":1}],4:[function(require,module,exports){
var Component = require('./Component');

module.exports = Palette;

function Palette(){
    Component.call(this);
    this.selectedColor = 1;
}
Palette.prototype = Object.create(Component.prototype);

Palette.prototype.draw = function(){
    var n=0;
    var x = this.x;
    var y = this.y;
    var sx = flr(this.w / 4);
    var sy = flr(this.h / 4);

    for(var j=0; j<4; j++){
        for(var i=0; i<4; i++){
            var rx = x+i*sx;
            var ry = y+j*sy;
            var rw = x+(i+1)*sx-1;
            var rh = y+(j+1)*sy-1;
            rectfill(rx, ry, rw, rh, n);
            if(this.selectedColor === n){
                rect(rx, ry, rw, rh, this.selectedColor === 0 ? 7 : 0);
            }
            n++;
        }
    }
};

},{"./Component":1}],5:[function(require,module,exports){
var Component = require('./Component');

module.exports = RootComponent;

function RootComponent(){
    Component.call(this);
    this.root = this;

    var that = this;
    click(function(){
        that.click(mousex(),mousey());
    });
}
RootComponent.prototype = Object.create(Component.prototype);

RootComponent.prototype.traverse = function(f){
    var queue = [];
    queue.push(this);
    while(queue.length){
        var component = queue.pop();
        var shouldStop = f.call(this, component);
        if(!shouldStop){
            for(var i=0; i<component.children.length; i++){
                var child = component.children[i];
                if(component.hidden !== null)
                    child.hidden = component.hidden;
                queue.push(child);
            }
        }
    }
};

RootComponent.prototype.draw = function(){

    // Update dimensions - needed?
    this.w = width();
    this.h = height();

	// Mouse move
    var mx = mousex();
	var my = mousey();
	if(!(this.lastmx === mx && this.lastmy === my)){
        this.traverse(function(component){
    		return component.mousemove(mx, my);
        });
	}
	this.lastmx = mx;
	this.lastmy = my;

    var drawComponents = [];
    this.traverse(function(component){
        if(component.root === component) return false;
        if(component.hidden) return true;
        drawComponents.push(component);
    });
    drawComponents = drawComponents.sort(function(a,b){ // todo: cache sorted list
        return a.z - b.z;
    });
    for(var i=0; i<drawComponents.length; i++){
        drawComponents[i].draw();
    }
};

RootComponent.prototype.click = function(x,y){
    this.traverse(function(component){
        if(component.root === component) return false;
        return component.click(x,y);
    });
};
},{"./Component":1}],6:[function(require,module,exports){
var Component = require('./Component');
var Palette = require('./Palette');

module.exports = SpriteEditor;

function SpriteEditor(){
    Component.call(this);

    // Sprite editor view
    this.palette = new Palette();
    this.add(this.palette);
}
SpriteEditor.prototype = Object.create(Component.prototype);

SpriteEditor.prototype.draw = function(){
    this.palette.x = this.x + this.w / 2;
    this.palette.y = this.y + 1;
    this.palette.w = this.w / 2;
    this.palette.h = this.h / 2;
};

},{"./Component":1,"./Palette":4}],7:[function(require,module,exports){
var Component = require('./Component');

module.exports = TopBar;

function TopBar(){
    Component.call(this);
    this.color = 0;
    this.textColor = 15;
    this.text = 'MENU';
}
TopBar.prototype = Object.create(Component.prototype);

TopBar.prototype.draw = function(){
    var x = this.x = this.parent.x;
    var y = this.y = this.parent.y;
    var w = this.w = this.parent.w;
    var h = this.h = 6;
    rectfill(x,y,w,h,this.color);
	print(this.text, x+1, y+1, this.textColor);
};
},{"./Component":1}],8:[function(require,module,exports){
module.exports = {
    Editor: require('./Editor'),
    RootComponent: require('./RootComponent')
};
},{"./Editor":2,"./RootComponent":5}]},{},[8])(8)
});