module.exports = CanvasRenderer;

/**
 * Simple canvas renderer
 */
function CanvasRenderer(){

}
CanvasRenderer.prototype = Obejct.create(Renderer.prototype);
Object.assign(CanvasRenderer.prototype, {
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
	mget: function(x, y){ return 0; },
	mset: function(x, y, i){},
	cls: function(x, y, i){},
	setColorTransparent: function(color, isTransparent){},
	getColorTransparent: function(color){},
});