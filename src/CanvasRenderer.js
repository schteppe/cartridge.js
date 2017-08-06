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
		this.domElement.width = this.screensizeX;
		this.domElement.height = this.screensizeY;
		this.screenImageData = this.ctx.createImageData(this.screensizeX, this.screensizeY);
		this.screenImageData32 = new Uint32Array(this.screenImageData.data.buffer);
		this.screenData = new Uint8Array(this.screensizeX * this.screensizeY / 2); // 4 bits per pixel (16 colors)
	},
	setPalette: function(p){
		Renderer.prototype.setPalette.call(this, p);

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
		if(this.clipRect.excludesPoint(x,y)) return;
		bufferSet(x, y, col, this.screensizeX, this.screensizeY, this.screenData);
	},
	pget: function(x,y){
		return bufferGet(x,y,this.screensizeX,this.screensizeY,this.screenData);
	},
	sset: function(x,y,col){
		bufferSet(x, y, col, this.spriteSheetSizeX*this.cellsizeX, this.spriteSheetSizeY*this.cellsizeY, this.spriteSheetData);
	},
	sget: function(x,y){
		return bufferGet(x,y,this.spriteSheetSizeX*this.cellsizeX, this.spriteSheetSizeY*this.cellsizeY, this.spriteSheetData);
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
	setCellSize: function(newCellWidth, newCellHeight, newSpriteSheetWidth, newSpriteSheetHeight){
		Renderer.prototype.setCellSize.call(this, newCellWidth, newCellHeight, newSpriteSheetWidth, newSpriteSheetHeight);
		this.spriteSheetData = new Uint8Array(this.cellsizeX * this.spriteSheetSizeX * this.cellsizeY * this.spriteSheetSizeY / 2); // 4 bits per pixel (16 colors)
	},
	spr: function(n, x0, y0, w, h, flip_x, flip_y){
		var sourceSizeX = this.cellsizeX * w;
		var sourceSizeY = this.cellsizeY * h;
		var destX = x0;
		var destY = y0;

		var sourceX = ssx(n,this.spriteSheetSizeX,this.spriteSheetSizeY) * this.cellsizeX;
		var sourceY = ssy(n,this.spriteSheetSizeY,this.spriteSheetSizeY) * this.cellsizeY;

		var dirX = 1;
		var dirY = 1;
		if(flip_x){
			dirX = -1;
			destX += this.cellsizeX;
		}

		if(flip_y){
			dirY = -1;
			destY += this.cellsizeY;
		}

		// Copy from spritesheet to screen
		for(var x=0; x < sourceSizeX; x++){
			for(var y=0; y < sourceSizeY; y++){
				var color = this.sget(sourceX + x, sourceY + y);
				if(!this.getColorTransparent(color)){
					this.pset(destX + dirX * x, destY + dirY * y, color);
				}
			}
		}
	},
	map: function(cel_x, cel_y, sx, sy, cel_w, cel_h){
		var cw = this.cellsizeX;
		var ch = this.cellsizeY;
		/*var x0 = sx;
		var x1 = sx + cel_w * cw;
		var y0 = sy;
		var y1 = sy + cel_h * ch;*/

		// TODO: only draw sprites overlapping the clipping area
		for(var x=0; x<cel_w; x++){
			for(var y=0; y<cel_h; y++){
				var mx = cel_x + x;
				var my = cel_y + y;
				var spriteIndex = this.mget(mx, my);
				this.spr(spriteIndex, sx + cw * x, sy + ch * y, 1, 1, false, false);
			}
		}
	}
});

function ssx(n,sizeX,sizeY){
	return n % sizeX;
}

// Returns the sprite Y position in the spritesheet
function ssy(n,sizeX,sizeY){
	return Math.floor(n / sizeX) % (sizeX * sizeY);
}

function bufferSet(x,y,col,sizeX,sizeY,data){
	if(x < 0 || y < 0 || x >= sizeX || y >= sizeY) return;
	var aligned = (x % 2 === 0);
	if(!aligned) x--;
	var offset = x/2 + sizeX/2 * y;
	var pixel = data[offset];
	if(aligned) pixel = (pixel & 0xf0) | col;
	else		pixel = (col << 4) | (pixel & 0x0f);
	data[offset] = pixel;
}

function bufferGet(x,y,sizeX,sizeY,data){
	var aligned = (x % 2 === 0);
	if(!aligned) x--;
	var offset = x/2 + sizeX/2 * y;
	var pixel = data[offset];
	return aligned ? (0x0f & pixel) : ((0xf0 & pixel) >> 4);
}