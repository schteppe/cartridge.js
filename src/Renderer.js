module.exports = Renderer;

var Rectangle = require('./Rectangle');
var utils = require('./utils');

function Renderer(options){
	this.cellsizeX = options.cellsizeX !== undefined ? options.cellsizeX : 8; // pixels
	this.cellsizeY = options.cellsizeY !== undefined ? options.cellsizeY : 8; // pixels
	this.screensizeX = options.screensizeX !== undefined ? options.screensizeX : 128; // pixels
	this.screensizeY = options.screensizeY !== undefined ? options.screensizeY : 128; // pixels
	this.mapSizeX = options.mapSizeX !== undefined ? options.mapSizeX : 128; // cells
	this.mapSizeY = options.mapSizeY !== undefined ? options.mapSizeY : 32; // cells
	this.spriteSheetSizeX = options.spriteSheetSizeX !== undefined ? options.spriteSheetSizeX : 16; // sprites
	this.spriteSheetSizeY = options.spriteSheetSizeY !== undefined ? options.spriteSheetSizeY : 16; // sprites
	this.paletteSize = options.paletteSize !== undefined ? options.paletteSize : 16; // colors
	this.camX = 0;
	this.camY = 0;
	this.palette = options.palette ? options.palette.slice(0) : [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	this.transparentColors = utils.zeros(this.paletteSize).map(function(){ return false; });
	this.transparentColors[0] = true;
	this.clipRect = new Rectangle();
	this.clip(0,0,this.screensizeX,this.screensizeY);
}
Renderer.prototype = {
	render: function(){},
	resize: function(w,h){
		this.screensizeX = w;
		this.screensizeY = h;

		// Reset clip state
		this.clip(0,0,this.screensizeX,this.screensizeY);
	},
	setPalette: function(p){
		this.palette = p.slice(0);
		// Check spritesheet for invalid colors
		for(var i=0; i<this.spriteSheetSizeX*this.cellsizeX; i++){
			for(var j=0; j<this.spriteSheetSizeY*this.cellsizeY; j++){
				if(this.sget(i,j) >= p.length){
					this.sset(i,j,0); // Just set it to empty
				}
			}
		}
	},
	palget: function(n){
		return this.palette[n];
	},
	rectfill: function(){},
	pset: function(col,x,y){},
	pget: function(x,y){},
	sset: function(col,x,y){},
	sget: function(x,y){ return 0; },
	clip: function(x,y,w,h){
		this.clipRect.set(x,y,w,h);
	},
	camera: function(x,y){
		this.camX = x;
		this.camY = y;
	},
	print: function(text, x, y, col){},
	mget: function(x, y){ return 0; },
	mset: function(x, y, i){},
	cls: function(x, y, i){},
	setColorTransparent: function(color, isTransparent){
		this.transparentColors[color] = t;
	},
	getColorTransparent: function(color){
		return this.transparentColors[color];
	},
	setCellSize: function(newCellWidth, newCellHeight, newSpriteSheetWidth, newSpriteSheetHeight){
		this.cellsizeX = newCellWidth;
		this.cellsizeY = newCellHeight;
		this.spriteSheetSizeX = newSpriteSheetWidth;
		this.spriteSheetSizeY = newSpriteSheetHeight;
	},
	map: function(){},
	spr: function(){},
	spr2: function(){},
};
