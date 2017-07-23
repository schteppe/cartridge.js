var Rectangle = require('../Rectangle');
var utils = require('../utils');

module.exports = Buttons;

function Buttons(options){
	options = options || {};
	Rectangle.call(this);

	if(options.options) this.options = options.options;

	if(options.x) this.x = options.x;
	if(options.y) this.y = options.y;
	if(options.sx) this.sx = options.sx;
	if(options.sy) this.sy = options.sy;
	if(options.onclick) this.onclick = options.onclick;

	this.padding = options.padding !== undefined ? options.padding : 0;
	this.current = options.current !== undefined ? options.current : 0;
	this.num = options.num !== undefined ? options.num : undefined;
	this.bgColor = options.bgColor !== undefined ? options.bgColor : undefined;
	this.textColor = options.textColor !== undefined ? options.textColor : undefined;
}
Buttons.prototype = Object.create(Rectangle.prototype);
Object.assign(Buttons.prototype, {
	draw: function(){
		var padding = this.padding !== undefined ? this.padding : 4;
		var num = this.num || this.options.length;
		var bgColor = this.bgColor !== undefined ? this.bgColor : 0;
		var textColor = this.textColor !== undefined ? this.textColor : 6;
		for(var i=0; i<num; i++){
			var x0 = this.x() + i * (6 + padding*2);
			rectfill(
				x0, this.y(),
				this.x() + 5+padding*2 + i * (6+padding*2)-1, this.y() + 6,
				this.current === i ? bgColor : textColor
			);
			var text = this.options !== undefined ? (this.options[i]+'').toUpperCase() : ((i+1) + '');
			var x1 = this.x()+1+padding + i * (6 + padding*2);
			print(
				text,
				this.options !== undefined ? (x0+1) : x1, this.y()+1,
				this.current === i ? textColor : bgColor
			);
		}
	},
	click: function(x,y){
		var num = this.num !== undefined ? this.num : this.options.length;
		if(utils.inrect(x,y,this.x(),this.y(), num * (this.padding * 2 + 6),7)){
			var button = flr((x-this.x()) / (this.padding * 2 + 6));
			if(this.current === button){
				return false;
			} else {
				this.current = button;
				return true;
			}
		}
		return false;
	},
	onclick: function(){}
});