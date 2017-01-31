module.exports = Rectangle;

function Rectangle(x,y,w,h){
	this.set(x,y,w,h);
}

Rectangle.prototype = {
	set: function(x,y,w,h){
		x |= 0;
		y |= 0;
		w |= 0;
		h |= 0;
		this.x0 = x;
		this.y0 = y;
		this.w = w;
		this.h = h;
		this.x1 = x + w - 1;
		this.y1 = y + h - 1;
		this.area = w*h;
	},
	excludesRect: function(x0,y0,x1,y1){
		return x1 < this.x0 || y1 < this.y0 || x0 > this.x1 || y0 > this.y1;
	},
	excludesPoint: function(x,y){
		return x < this.x0 || y < this.y0 || x > this.x1 || y > this.y1;
	},
	expandToPoint: function(x,y){
		var x0 = Math.min(this.x0, x);
		var y0 = Math.min(this.y0, y);
		this.set(
			x0,
			y0,
			Math.max(this.x1, x) - x0 + 1,
			Math.max(this.y1, y) - y0 + 1
		);
	}
};