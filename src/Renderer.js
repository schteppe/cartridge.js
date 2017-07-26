module.exports = Renderer;

function Renderer(){
	this.domElement = null;
}
Renderer.prototype = {
	render: function(){},
	resize: function(){},
	setPalette: function(){},
	palget: function(n){},
	rectfill: function(){},
	pset: function(col,x,y){},
	pget: function(x,y){},
	clip: function(x,y,w,h){},
	camera: function(x,y){},
	print: function(text, x, y, col){},
	mget: function(x, y){},
	mset: function(x, y, i){},
	cls: function(x, y, i){},
	setColorTransparent: function(color, isTransparent){},
	getColorTransparent: function(color){},
};
