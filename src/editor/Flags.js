var Rectangle = require('../Rectangle');
var utils = require('../utils');

module.exports = Flags;

function Flags(options){
	options = options || {};
	Rectangle.call(this);

	if(options.x) this.x = options.x;
	if(options.y) this.y = options.y;
	if(options.sx) this.sx = options.sx;
	if(options.sy) this.sy = options.sy;
	if(options.current) this.current = options.current;
	if(options.onclick) this.onclick = options.onclick;
}
Flags.prototype = Object.create(Rectangle.prototype);
Object.assign(Flags.prototype, {
	x: function(){ return 0; },
	y: function(){ return 0; },
	current: function(){},
	draw: function(){
		var x = this.x();
		var y = this.y();
		var size = 3;
		for(var i=0; i<8; i++){
			var rx = x + i * (size+3);
			var ry = y;
			var qx = x+(1+size) + i * (3+size);
			var qy = y+1+size;
			if((this.current() & (1 << i)) !== 0)
				rectfill(rx, ry, qx, qy, 0);
			else
				rect(rx, ry, qx, qy, 0);
		}
	},
	click: function(x, y){
		if(utils.inrect(x,y,this.x(),this.y(),6*8,5)){
			var flagIndex = flr((x-this.x()) / 6);
			var oldFlags = this.current();
			var clickedFlag = (1 << flagIndex);
			var newFlags = (oldFlags & clickedFlag) ? (oldFlags & (~clickedFlag)) : (oldFlags | clickedFlag);
			this.current(newFlags);
			this.onclick();
			return true;
		} else {
			return false;
		}
	},
	onclick: function(){}
});
