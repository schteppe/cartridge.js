var pixelops = require('./pixelops');
var utils = require('./utils');
var font = require('./font');
var Rectangle = require('./Rectangle');
var Renderer = require('./Renderer');
var colors = require('./colors');

module.exports = FastCanvasRenderer;

/**
 * Canvas renderer but with optimizations that makes it a little faster but more complex.
 */
function FastCanvasRenderer(container, options){
	options = options || {};

	this.cellsizeX = options.cellsizeX !== undefined ? options.cellsizeX : 8; // pixels
	this.cellsizeY = options.cellsizeY !== undefined ? options.cellsizeY : 8; // pixels
	this.screensizeX = options.screensizeX !== undefined ? options.screensizeX : 128; // pixels
	this.screensizeY = options.screensizeY !== undefined ? options.screensizeY : 128; // pixels
	this.mapSizeX = options.mapSizeX !== undefined ? options.mapSizeX : 128; // cells
	this.mapSizeY = options.mapSizeY !== undefined ? options.mapSizeY : 32; // cells
	this.spriteSheetSizeX = options.spriteSheetSizeX !== undefined ? options.spriteSheetSizeX : 16; // sprites
	this.spriteSheetSizeY = options.spriteSheetSizeY !== undefined ? options.spriteSheetSizeY : 16; // sprites
	this.paletteSize = options.paletteSize !== undefined ? options.paletteSize : 16; // colors

	// DOM elements
	this.container = container;
	this.canvases = [];

	this.mapData = utils.zeros(this.mapSizeX * this.mapSizeY);
	this.mapDataDirty = utils.zeros(this.mapSizeX * this.mapSizeY); // dirtiness per cell
	this.mapDirty = true; // is all of the map dirty?
	this.mapCacheCanvas;
	this.mapCacheContext;
	this.spriteSheetCanvas;
	this.spriteSheetContext;
	this.spriteSheetDirtyRect = new Rectangle();
	this.spriteSheetPixels;
	this.camX = 0;
	this.camY = 0;
	this.palette = options.palette ? options.palette.slice(0) : [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	this.paletteHex;
	this.transparentColors = utils.zeros(this.paletteSize).map(function(){ return false; });
	this.transparentColors[0] = true;

	var numCanvases = 1;
	var html = '';
	for(var i=0; i<numCanvases; i++){
		html += '<canvas class="cartridgeCanvas" id="cartridgeCanvas'+i+'" width="' + this.screensizeX + '" height="' + this.screensizeY + '"' + (i === 0 ? ' moz-opaque' : '') + '></canvas>';
	}
	container.innerHTML = html;

	for(var i=0; i<numCanvases; i++){
		var c = document.getElementById('cartridgeCanvas' + i);
		c.oncontextmenu = function(){
			return false;
		};
		this.canvases.push(c);
		if(i !== 0){
			c.style.pointerEvents = 'none';
		}
		c.style.position = 'absolute';
		utils.disableImageSmoothing(c.getContext('2d'));
	}
	this.domElement = this.canvases[0];
	this.ctx = this.domElement.getContext('2d');
	this.setCellSize(this.cellsizeX, this.cellsizeY, this.spriteSheetSizeX, this.spriteSheetSizeY);
	this.setPalette(this.palette);

	pixelops.init(this.canvases[0]); // todo: support multiple

	// Add style tag
	var style = document.createElement('style');
	style.innerHTML = [
		".cartridgeCanvas {",
		"image-rendering: -moz-crisp-edges;",
		"image-rendering: -webkit-crisp-edges;",
		"image-rendering: pixelated;",
		"}"
	].join('\n');
	document.getElementsByTagName('head')[0].appendChild(style);

	// Init font
	font.init(this.paletteHex);
	this.clipRect = new Rectangle();
	this.clip(0,0,this.screensizeX,this.screensizeY);
}
FastCanvasRenderer.prototype = {
	clearMapCacheCanvas: function(){
		this.mapCacheContext.clearRect(0, 0, this.cellsizeX*this.mapSizeX, this.cellsizeY*this.mapSizeY);
	},
	updateMapCacheCanvas: function(x,y,doClear){
		if(doClear){
			this.mapCacheContext.clearRect(x * this.cellsizeX, y * this.cellsizeY, this.cellsizeX, this.cellsizeY);
		}
		var n = this.mget(x, y);
		if(n === 0){
			// Sprite 0 is empty
			return;
		}
		this.flushSpriteSheet();
		this.mapCacheContext.drawImage(
			this.spriteSheetCanvas,
			ssx(n,this.spriteSheetSizeX,this.spriteSheetSizeY) * this.cellsizeX, ssy(n,this.spriteSheetSizeX,this.spriteSheetSizeY) * this.cellsizeY,
			this.cellsizeX, this.cellsizeY,
			this.cellsizeX * x, this.cellsizeY * y,
			this.cellsizeX, this.cellsizeY
		);
	},
	setCellSize: function(
		newCellWidth,
		newCellHeight,
		newSpriteSheetWidth,
		newSpriteSheetHeight
	){
		newCellWidth = newCellWidth | 0;
		newCellHeight = newCellHeight | 0;
		newSpriteSheetWidth = newSpriteSheetWidth | 0;
		newSpriteSheetHeight = newSpriteSheetHeight | 0;

		var newSpriteSheetPixels = utils.zeros(newSpriteSheetWidth * newSpriteSheetHeight * newCellWidth * newCellHeight);
		if(this.spriteSheetPixels){
			// Copy pixel data to new dimensions
			var minWidth = Math.min(this.spriteSheetSizeX*this.cellsizeX, newSpriteSheetWidth*newCellWidth);
			var minHeight = Math.min(this.spriteSheetSizeY*this.cellsizeY, newSpriteSheetHeight*newCellHeight);
			for(var i=0; i<minWidth; i++){
				for(var j=0; j<minHeight; j++){
					newSpriteSheetPixels[i+j*newSpriteSheetWidth*newCellWidth] = this.spriteSheetPixels[i+j*this.spriteSheetSizeX*this.cellsizeX];
				}
			}
		}
		this.spriteSheetPixels = newSpriteSheetPixels;

		// Map references sprites, which are now wrong. Need to fix!
		for(var i=0; i<this.mapSizeX; i++){
			for(var j=0; j<this.mapSizeY; j++){
				var oldSpriteIndex = this.mget(i, j);
				var oldX = ssx(oldSpriteIndex,this.spriteSheetSizeX,this.spriteSheetSizeY);
				var oldY = ssy(oldSpriteIndex,this.spriteSheetSizeX,this.spriteSheetSizeY);
				var newSpriteIndex = oldX + oldY * newSpriteSheetWidth;
				if(newSpriteIndex >= newSpriteSheetWidth * newSpriteSheetHeight) continue;
				this.mset(i, j, newSpriteIndex);
			}
		}

		this.cellsizeX = newCellWidth;
		this.cellsizeY = newCellHeight;

		this.spriteSheetSizeX = newSpriteSheetWidth;
		this.spriteSheetSizeY = newSpriteSheetHeight;

		// (re)init spritesheet canvas
		this.spriteSheetCanvas = utils.createCanvas(this.spriteSheetSizeX * this.cellsizeX, this.spriteSheetSizeY * this.cellsizeY);
		this.spriteSheetContext = this.spriteSheetCanvas.getContext('2d');

		// (re)init map cache
		this.mapCacheCanvas = utils.createCanvas(this.mapSizeX * this.cellsizeX, this.mapSizeY * this.cellsizeY);
		this.mapCacheContext = this.mapCacheCanvas.getContext('2d');

		this.spriteSheetDirtyRect.set(0,0,this.spriteSheetCanvas.width,this.spriteSheetCanvas.height);
		this.mapDirty = true;
	},

	// Redraw the whole spritesheet
	flushSpriteSheet: function(){
		if(!this.spriteSheetDirtyRect.area) return;

		var w = this.spriteSheetSizeX*this.cellsizeX;
		var h = this.spriteSheetSizeY*this.cellsizeY;
		this.spriteSheetContext.clearRect(this.spriteSheetDirtyRect.x0, this.spriteSheetDirtyRect.y0, this.spriteSheetDirtyRect.w, this.spriteSheetDirtyRect.h);
		var imageData = this.spriteSheetContext.createImageData(this.spriteSheetDirtyRect.w, this.spriteSheetDirtyRect.h);
		for(var i=0; i<this.spriteSheetDirtyRect.w; i++){
			for(var j=0; j<this.spriteSheetDirtyRect.h; j++){
				var col = this.spriteSheetPixels[(j+this.spriteSheetDirtyRect.y0) * w + (i+this.spriteSheetDirtyRect.x0)];
				var dec = this.palette[col];
				var r = utils.decToR(dec);
				var g = utils.decToG(dec);
				var b = utils.decToB(dec);
				var p = 4 * (j * this.spriteSheetDirtyRect.w + i);
				imageData.data[p + 0] = utils.decToR(dec);
				imageData.data[p + 1] = utils.decToG(dec);
				imageData.data[p + 2] = utils.decToB(dec);
				imageData.data[p + 3] = this.transparentColors[col] ? 0 : 255;
			}
		}
		this.spriteSheetContext.putImageData(imageData, this.spriteSheetDirtyRect.x0, this.spriteSheetDirtyRect.y0);
		this.spriteSheetDirtyRect.set();
	},

	setPalette: function(p){
		this.palette = p.slice(0);
		this.paletteHex = this.palette.map(colors.int2hex);
		this.mapDirty = true;
		font.changePalette(this.paletteHex);

		// Check spritesheet for invalid colors
		for(var i=0; i<this.spriteSheetSizeX*this.cellsizeX; i++){
			for(var j=0; j<this.spriteSheetSizeY*this.cellsizeY; j++){
				if(this.sget(i,j) >= p.length){
					this.sset(i,j,0); // Just set it to empty
				}
			}
		}
		this.spriteSheetDirtyRect.set(0,0,this.spriteSheetCanvas.width,this.spriteSheetCanvas.height);
	},
	resizeCanvases: function(){
		for(var i=0; i < this.canvases.length; i++){
			this.canvases[i].width = this.screensizeX;
			this.canvases[i].height = this.screensizeY;
		}
		pixelops.resize(this.canvases[0]);

		// Reset clip state
		this.clip(0,0,this.screensizeX,this.screensizeY);
	},
	map: function(cel_x, cel_y, sx, sy, cel_w, cel_h){
		pixelops.beforeChange();

		cel_x = cel_x | 0;
		cel_y = cel_y | 0;
		sx = sx | 0;
		sy = sy | 0;
		cel_w = cel_w | 0;
		cel_h = cel_h | 0;

		var i,j;

		var x0 = sx;
		var x1 = sx + cel_w * cellwidth();
		var y0 = sy;
		var y1 = sy + cel_h * cellheight();
		if(this.clipRect.excludesRect(x0,y0,x1,y1)){
			return; // fully outside the clip area
		}

		// Update invalidated map cache
		if(this.mapDirty){
			this.clearMapCacheCanvas();
			for(i=0; i<this.mapSizeX; i++){
				for(j=0; j<this.mapSizeY; j++){
					this.updateMapCacheCanvas(i,j,false);
				}
			}
			this.mapDirty = false;
		}
		for(i=0; i<this.mapSizeX; i++){
			for(j=0; j<this.mapSizeY; j++){
				if(this.mapDataDirty[j * this.mapSizeX + i]){
					this.updateMapCacheCanvas(i,j,true);
					this.mapDataDirty[j * this.mapSizeX + i] = 0;
				}
			}
		}

		var _sx = cel_x * this.cellsizeX; // Clip start
		var _sy = cel_y * this.cellsizeY;
		var _x = sx; // Draw position
		var _y = sy;
		var _swidth = cel_w * this.cellsizeX; // Clip end
		var _sheight = cel_h * this.cellsizeY;
		var _width = _swidth; // Width on target canvas
		var _height = _sheight;
		this.ctx.drawImage(this.mapCacheCanvas,_sx,_sy,_swidth,_sheight,_x,_y,_width,_height);
	},

	// Render a sprite given its id
	spr: function(n, x, y, w, h, flip_x, flip_y){
		pixelops.beforeChange();
		this.flushSpriteSheet();

		w = w !== undefined ? w : 1;
		h = h !== undefined ? h : 1;
		flip_x = flip_x !== undefined ? flip_x : false;
		flip_y = flip_y !== undefined ? flip_y : false;

		x = x | 0;
		y = y | 0;
		w = w | 0;
		h = h | 0;

		var sourceSizeX = this.cellsizeX * w;
		var sourceSizeY = this.cellsizeY * h;
		var destSizeX = sourceSizeX;
		var destSizeY = sourceSizeY;
		var destX = x;
		var destY = y;

		var sourceX = ssx(n,this.spriteSheetSizeX,this.spriteSheetSizeY) * this.cellsizeX;
		var sourceY = ssy(n,this.spriteSheetSizeX,this.spriteSheetSizeY) * this.cellsizeY;

		// Clip lower
		if(destX < this.clipRect.x0){
			sourceX = sourceX + this.clipRect.x0 - destX;
			destX = this.clipRect.x0;
		}
		if(destY < this.clipRect.y0){
			sourceY = sourceY + this.clipRect.y0 - destY;
			destY = this.clipRect.y0;
		}

		// TODO: clip upper

		this.ctx.save();
		this.ctx.translate(
			destX + (flip_x ? sourceSizeX : 0),
			destY + (flip_y ? sourceSizeY : 0)
		);
		this.ctx.scale(flip_x ? -1 : 1, flip_y ? -1 : 1);
		this.ctx.drawImage(
			this.spriteSheetCanvas,
			sourceX, sourceY,
			sourceSizeX, sourceSizeY,
			0, 0,
			destSizeX, destSizeY
		);
		this.ctx.restore();
	},

	// Set spritesheet pixel color
	sset: function(x, y, col){
		var w = this.spriteSheetSizeX * this.cellsizeX;
		this.spriteSheetPixels[y * w + x] = col;
		if(this.spriteSheetDirtyRect.area){
			this.spriteSheetDirtyRect.expandToPoint(x,y);
		} else {
			this.spriteSheetDirtyRect.set(x,y,1,1);
		}

		this.mapDirty = true; // TODO: Only invalidate matching map positions
	},
	print: function(text, x, y, col){
		pixelops.beforeChange();
		if(Array.isArray(text)){
			for(var i=0; i<text.length; i++){
				this.print(text[i], x, y + 8*i, col);
			}
			return;
		}
		font.draw(this.ctx, text.toString().toUpperCase(), x, y, col);
	},
	mget: function(x, y){
		return this.mapData[y * this.mapSizeX + x];
	},
	mset: function mset(x, y, i){
		this.mapData[y * this.mapSizeX + x] = i;
		this.mapDataDirty[y * this.mapSizeX + x] = 1;
	},
	render: function(){
		pixelops.flush();
	},
	palget: function(n){
		return this.palette[n];
	},
	cls: function(){
		pixelops.beforeChange();
		this.ctx.clearRect(-this.camX,-this.camY,this.screensizeX,this.screensizeY);
	},
	setColorTransparent: function(color, isTransparent){
		this.transparentColors[color] = t;
	},
	getColorTransparent: function(color){
		return this.transparentColors[color];
	},
	rectfill: function(x0, y0, x1, y1, col){
		pixelops.beforeChange();
		this.ctx.fillStyle = this.paletteHex[col];
		this.ctx.fillRect(x0, y0, x1-x0+1, y1-y0+1);
	},
	clip: function(x,y,w,h){
		this.clipRect.set(x,y,w,h);
	},
	camera: function(x,y){
		pixelops.beforeChange();
		this.ctx.translate(x - this.camX, y - this.camY);
		this.camX = x;
		this.camY = y;
	},
	pget: (function(){
		var data = new Uint8Array(3);
		return function(x, y){
			x = x | 0;
			y = y | 0;
			pixelops.pget(x,y,data);
			var col = utils.rgbToDec(data[0], data[1], data[2]);
			var result = this.palette.indexOf(col);
			return result === -1 ? 0 : result;
		};
	})(),
	pset: function(x, y, col){
		x = x | 0;
		y = y | 0;
		col = col | 0;

		if(this.clipRect.excludesPoint(x,y)) return;

		// new style
		var dec = this.palette[col];
		var r = utils.decToR(dec);
		var g = utils.decToG(dec);
		var b = utils.decToB(dec);
		pixelops.pset(x,y,r,g,b);
	},
	sget: function(x, y){
		var w = this.spriteSheetSizeX * this.cellsizeX;
		return this.spriteSheetPixels[y * w + x];
	},
};

function ssx(n,sizeX,sizeY){
	return n % sizeX;
}

// Returns the sprite Y position in the spritesheet
function ssy(n,sizeX,sizeY){
	return Math.floor(n / sizeX) % (sizeX * sizeY);
}