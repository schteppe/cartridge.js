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
