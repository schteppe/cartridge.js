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