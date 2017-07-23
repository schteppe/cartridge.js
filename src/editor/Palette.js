var Rectangle = require('../Rectangle');
var utils = require('../utils');

module.exports = Palette;

function Palette(options){
	options = options || {};
	Rectangle.call(this);

	if(options.x){ this.x = options.x; }
	if(options.y){ this.y = options.y; }
	if(options.sx){ this.sx = options.sx; }
	if(options.sy){ this.sy = options.sy; }
	this.onclick = options.onclick || function(){};

	this.current = options.current === undefined ? 1 : options.current;
}
Palette.prototype = Object.create(Rectangle.prototype);
Object.assign(Palette.prototype, {
	n: function(){
		var n = 2;
		var palsize = 0;
		while(palget(palsize) !== undefined) palsize++;
		while(n*n<palsize) n *= 2;
		return n;
	},
	sx: function(){ return 4; },
	sy: function(){ return 4; },
	x: function(){ return 0; },
	y: function(){ return 0; },
	click: function(x,y){
		var n = this.n();
		if(utils.inrect(x,y,this.x(),this.y(),this.sx()*n,this.sy()*n)){
			var px = flr((x-this.x()) / this.sx());
			var py = flr((y-this.y()) / this.sy());
			var newColor = px + n * py;
			if(palget(newColor) !== undefined && this.current !== newColor){
				this.current = newColor;
				this.onclick();
				return true;
			}
		}
		return false;
	},
	draw: function(){
		var x = this.x();
		var y = this.y();
		var sx = this.sx();
		var sy = this.sy();
		var current = this.current;
		var n=0;
		var size = this.n();
		for(var j=0; j<size; j++){
			for(var i=0; i<size; i++){
				if(palget(n) === undefined){
					break;
				}
				var rx = x+i*sx;
				var ry = y+j*sy;
				var rw = x+(i+1)*sx-1;
				var rh = y+(j+1)*sy-1;
				if(n=== 0){
					// transparent
					for(var x1=rx; x1<rx+rw; x1++){
						for(var y1=ry; y1<ry+rh; y1++){
							pset(x1,y1,(x1+y1)%2 ? 6 : 7);
						}
					}
				} else {
					rectfill(rx, ry, rw, rh, n);
				}
				if(current === n){
					rect(rx, ry, rw, rh, 0);
				}
				n++;
			}
		}
	}
});
