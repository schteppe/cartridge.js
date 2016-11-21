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