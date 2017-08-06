module.exports = CanvasRenderer;

var utils = require('./utils');
var font = require('./font');
var Renderer = require('./Renderer');

/**
 * Simple canvas renderer
 */
function CanvasRenderer(options){
	options = options || {};
	Renderer.call(this, options);

	this.spriteSheetData = new Uint8Array(this.spriteSheetSizeX * this.spriteSheetSizeY / 2); // 4 bits per pixel (16 colors)
	this.mapData = new Uint16Array(this.mapSizeX * this.mapSizeY); // max 65535 sprites referenced

	this.color4ToColor32Map = new Uint32Array(16);

	var canvas = this.domElement = document.createElement('canvas');
	canvas.width = this.screensizeX;
	canvas.height = this.screensizeY;
	canvas.setAttribute("moz-opaque", "");
	canvas.oncontextmenu = function(){ return false; };
	canvas.setAttribute("style",
		"image-rendering: -moz-crisp-edges;" +
		"image-rendering: -webkit-crisp-edges;" +
		"image-rendering: pixelated;"
	);
	var ctx = this.ctx = canvas.getContext('2d');
	utils.disableImageSmoothing(ctx);

	this.screenImageData = ctx.createImageData(this.screensizeX, this.screensizeY);
	this.screenImageData32 = new Uint32Array(this.screenImageData.data.buffer);

	this.resize(this.screensizeX, this.screensizeY);
	this.setCellSize(this.cellsizeX, this.cellsizeY, this.spriteSheetSizeX, this.spriteSheetSizeY);
	this.setPalette(this.palette);
}
CanvasRenderer.prototype = Object.create(Renderer.prototype);
Object.assign(CanvasRenderer.prototype, {
	render: function(){
		// Map colors
		for(var i=0; i<this.screensizeX; i++){
			for(var j=0; j<this.screensizeY; j++){
				var color = this.pget(i,j);
				var canvasColor = this.color4ToColor32Map[color];
				this.screenImageData32[(i + j * this.screensizeX)] = canvasColor;
			}
		}

		// Flush screendata to canvas
		this.ctx.putImageData(this.screenImageData, 0, 0);
	},
	resize: function(w,h){
		Renderer.prototype.resize.call(this, w, h);
		this.screenData = new Uint8Array(this.screensizeX * this.screensizeY / 2); // 4 bits per pixel (16 colors)
	},
	setPalette: function(p){
		Renderer.prototype.setPalette(p);

		// Update color map
		for(var i=0; i<16; i++){
			var dec = this.palette[i];
			var r = utils.decToR(dec) << 0;
			var g = utils.decToG(dec) << 8;
			var b = utils.decToB(dec) << 16;
			var a = 255 << 24;
			this.color4ToColor32Map[i] = r | g | b | a;
		}
	},
	rectfill: function(x0, y0, x1, y1, col){
		for(var x=x0; x<=x1; x++)
			for(var y=y0; y<=y1; y++)
				this.pset(x,y,col); // TODO: optimize
	},
	pset: function(x,y,col){
		if(x < 0 || y < 0 || x >= this.screensizeX || y >= this.screensizeY) return;
		var aligned = (x % 2 === 0);
		if(!aligned) x--;
		var offset = x/2 + this.screensizeX/2 * y;
		var pixel = this.screenData[offset];
		if(aligned)
			pixel = (pixel & 0xf0) | col;
		else
			pixel = (col << 4) | (pixel & 0x0f);
		this.screenData[offset] = pixel;
	},
	pget: function(x,y){
		var aligned = (x % 2 === 0);
		if(!aligned) x--;
		var offset = x/2 + this.screensizeX/2 * y;
		var pixel = this.screenData[offset];
		return aligned ? (0x0f & pixel) : ((0xf0 & pixel) >> 4);
	},
	print: function(text, x, y, col){
		if(Array.isArray(text)){
			for(var i=0; i<text.length; i++){
				this.print(text[i], x, y + (font.fontY + 1) * i, col);
			}
			return;
		}
		text = text.toString().toUpperCase();
		var position = 0;
		for(var i=0; i<text.length; i++){
			var index = font.chars.indexOf(text[i]);
			if(index !== -1){
				this.printAsciiChar(
					font.asciiChars,
					col,
					index * font.fontX, 0,
					font.fontX, font.fontY,
					x + font.fontX * position, y
				);
			} else if((index = font.specialChars.indexOf(text[i])) !== -1){
				this.printAsciiChar(
					font.asciiSpecialChars,
					col,
					index * font.fontX * 2, 0,
					2 * font.fontX, font.fontY,
					x + font.fontX * position, y
				);
				position++;
			}
			position++;
		}
	},
	printAsciiChar: function(asciiArray, color, sourceX, sourceY, width, height, destX, destY){
		for(var i=0; i<height; i++){
			for(var j=0; j<width; j++){
				var c = asciiArray[i+sourceY][j+sourceX];
				if(c === '#'){
					this.pset(destX+j,destY+i,color);
				}
			}
		}
	},
	mget: function(x, y){
		return this.mapData[x + this.mapSizeX * y];
	},
	mset: function(x, y, i){
		this.mapData[x + this.mapSizeX * y] = i;
	},
	cls: function(){
		var l = this.screenData.length;
		while(l--)
			this.screenData[l] = 0;
	},
	setColorTransparent: function(color, isTransparent){},
	getColorTransparent: function(color){},
	setCellSize: function(newCellWidth, newCellHeight, newSpriteSheetWidth, newSpriteSheetHeight){
		Renderer.prototype.setCellSize(newCellWidth, newCellHeight, newSpriteSheetWidth, newSpriteSheetHeight);
	}
});