var input = require('./input');
var utils = require('./utils');
var font = require('./font');
var math = require('./math');
var colors = require('./colors');

// Constants
var cellsize = 8; // pixels
var screensize = 128; // pixels
var mapSizeX = 128;
var mapSizeY = 32;
var maxSprites = 256;
var spriteSheetSizeX = 128;
var spriteSheetSizeY = 128;

var mapData = new Uint8Array(mapSizeX * mapSizeY);
var container;
var spriteSheetImage;
var spriteSheetCanvas;
var spriteSheetContext;
var spriteFlags = new Uint8Array(maxSprites);
var fontImage;
var ctx;
var canvas;
var _time = 0;
var camX = 0;
var camY = 0;
var defaultColor = 0;
var _mousex = 0;
var _mousey = 0;
var _mousebtns = {};
var buttonStates = {};
var keyMap0 = input.defaultKeyMap(1);
var keyMap1 = input.defaultKeyMap(2);
var palette = colors.defaultPalette();
var paletteHex = palette.map(colors.int2hex);
var mapCacheCanvas;
var mapCacheContext;
var clickListener;
var canvasListeners;
var bodyListeners;
var loaded = false;

exports.cartridge = function(containerId){
	container = document.getElementById(containerId);
	container.innerHTML = '<canvas class="cartridgeCanvas" id="cartridgeCanvas" width="' + screensize + '" height="' + screensize + '" moz-opaque></canvas>';
	canvas = document.getElementById('cartridgeCanvas');

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

	// Init spritesheet canvas
	spriteSheetCanvas = document.createElement('canvas');
	spriteSheetCanvas.width = spriteSheetSizeX;
	spriteSheetCanvas.height = spriteSheetSizeY;
	spriteSheetContext = spriteSheetCanvas.getContext('2d');

	// Init map cache
	mapCacheCanvas = document.createElement('canvas');
	mapCacheCanvas.width = mapSizeX * cellsize;
	mapCacheCanvas.height = mapSizeY * cellsize;
	mapCacheContext = mapCacheCanvas.getContext('2d');

	// Init canvas
	ctx = canvas.getContext('2d');
	utils.disableImageSmoothing(ctx);

	addInputListeners();
	fit();

	// Start render loop
	var currentTime = 0;
	var t0 = 0;
	var t1 = 0;
	var dt0 = Math.floor(1 / 30 * 1000);
	var dt1 = Math.floor(1 / 60 * 1000);
	var accumulator0 = 0;
	var accumulator1 = 0;
	function render(newTime){
		if (currentTime) {
			var frameTime = newTime - currentTime;
			if ( frameTime > 250 )
				frameTime = 250;
			accumulator0 += frameTime;
			while ( accumulator0 >= dt0 ){
				_time = t0;
				if(loaded){
					_update();
				}
				t0 += dt0;
				accumulator0 -= dt0;
			}
			accumulator1 += frameTime;
			while ( accumulator1 >= dt1 ){
				_time = t1;
				if(loaded){
					_update60();
				}
				t1 += dt1;
				accumulator1 -= dt1;
			}
		}
		_time = newTime;
		if(loaded){
			_draw();
		}
		currentTime = newTime;
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);

	// Init font
	font.load(function(image){
		fontImage = image;
		font.init(fontImage, palette);

		if(typeof(_load) !== 'undefined'){
			_load(postLoad);
		} else {
			postLoad();
		}
	});
};

function postLoad(){
	loaded = true;
	_init();
}

exports.cls = function(){
	ctx.clearRect(0,0,screensize,screensize);
};

exports.time = function(){
	return _time / 1000;
};

exports.color = function(col){
	defaultColor = col;
};

exports.rectfill = function rectfill(x0, y0, x1, y1, col){
	col = col !== undefined ? col : defaultColor;
	ctx.fillStyle = paletteHex[col];
	ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
};

exports.camera = function camera(x, y){
	if(camX === x && camY === y) return;

	ctx.translate(x - camX, y - camY);
	camX = x;
	camY = y;
};

exports.mousex = function mousex(){
	return _mousex;
};

exports.mousey = function mousey(){
	return _mousey;
};

exports.mousebtn = function mousebtn(i){
	return !!_mousebtns[i];
};

exports.map = function map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer){
	layer = layer === undefined ? 0 : layer;

	if(layer === 0){
		// Draw from map cache
		var _sx = cel_x * cellsize; // Clip start
		var _sy = cel_y * cellsize;
		var _x = sx; // Draw position
		var _y = sy;
		var _swidth = cel_w * cellsize; // Clip end
		var _sheight = cel_h * cellsize;
		var _width = _swidth; // Width on target canvas
		var _height = _sheight;
		ctx.drawImage(mapCacheCanvas,_sx,_sy,_swidth,_sheight,_x,_y,_width,_height);
	} else {
		// Draw only matching sprites
		for(var i=0; i<cel_w; i++){
			for(var j=0; j<cel_h; j++){
				var spriteNumber = mget(i, j);
				var flags = fget(spriteNumber);
				if((layer & flags) === layer){
					spr(spriteNumber, sx + i * cellsize, sy + j * cellsize);
				}
			}
		}
	}
};

function spriteSheetCoords(n){
	var x = n % 16;
	var y = Math.floor(n / 16) % (16 * 16);
	return {x:x,y:y};
}

exports.spr = function spr(n, x, y, w, h, flip_x, flip_y){
	w = w !== undefined ? w : 1;
	h = h !== undefined ? h : 1;
	flip_x = flip_x !== undefined ? flip_x : false;
	flip_y = flip_y !== undefined ? flip_y : false;
	var sizex = cellsize * w;
	var sizey = cellsize * h;
	ctx.save();
	ctx.translate(
		x + (flip_x ? sizex : 0),
		y + (flip_y ? sizey : 0)
	);
	ctx.scale(flip_x ? -1 : 1, flip_y ? -1 : 1);
	var sscoord = spriteSheetCoords(n);
	ctx.drawImage(
		spriteSheetCanvas,
		sscoord.x * cellsize, sscoord.y * cellsize,
		sizex, sizey,
		0, 0,
		sizex, sizey
	);
	ctx.restore();
};

// Get sprite flags
exports.fget = function(n){
	return spriteFlags[n];
};

// Set sprite flags
exports.fset = function(n, flags){
	spriteFlags[n] = flags;
};

// Get pixel color
exports.pget = function(x, y){
	var data = ctx.getImageData(x, y, x+1, y+1).data;
	var col = utils.rgbToDec(data[0], data[1], data[2]);
	return palette.indexOf(col);
};

// Set pixel color
exports.pset = function(x, y, col){
	rectfill(x,y,x+1,y+1,col);
};

// Get spritesheet pixel color
exports.sget = function(x, y){
	var data = spriteSheetContext.getImageData(x, y, x+1, y+1).data;
	var col = utils.rgbToDec(data[0], data[1], data[2]);
	return palette.indexOf(col);
};

// Set spritesheet pixel color
exports.sset = function(x, y, col){
	col = col !== undefined ? col : defaultColor;
	spriteSheetContext.fillStyle = paletteHex[col % palette.length];
	spriteSheetContext.fillRect(x, y, 1, 1);
};

exports.btn = function btn(i, player){
	player = player !== undefined ? player : 1;
	var keyCode = 0;
	if(player === 1){
		keyCode = keyMap0[i];
	} else if(player === 2){
		keyCode = keyMap1[i];
	}
	return !!buttonStates[keyCode];
};

exports.fullscreen = function fullscreen(){
	utils.fullscreen(container);
};

exports.print = function(text, x, y, col){
	x = x !== undefined ? x : 0;
	y = y !== undefined ? y : 0;
	col = col !== undefined ? col : defaultColor;
	font.draw(ctx, text, x, y, col);
};

exports.fit = function fit(){
	utils.scaleToFit(canvas, container);
};

exports.click = function(callback){
	clickListener = callback || null;
};

exports.mget = function mget(x, y){
	return mapData[y * mapSizeX + x];
};

exports.mset = function mset(x, y, i){
	mapData[y * mapSizeX + x] = i;
	updateMapCacheCanvas(x,y);
};

function updateMapCacheCanvas(x,y){
	var n = mget(x, y);
	var sscoord = spriteSheetCoords(n);
	mapCacheContext.drawImage(
		spriteSheetCanvas,
		sscoord.x * cellsize, sscoord.y * cellsize,
		cellsize, cellsize,
		cellsize * x, cellsize * y,
		cellsize, cellsize
	);
}

function addInputListeners(){
	canvasListeners = {
		click: function(){
			if(clickListener){
				clickListener();
			}
		},
		mousedown: function(evt){
			_mousebtns[evt.which] = true;
			updateMouseCoords(evt);
		},
		mouseup: function(evt){
			_mousebtns[evt.which] = false;
			updateMouseCoords(evt);
		}
	};
	for(var key in canvasListeners){
		canvas.addEventListener(key, canvasListeners[key]);
	}

	bodyListeners = {
		keydown: function(e){
			buttonStates[e.keyCode] = 1;
		},
		keyup: function(e){
			buttonStates[e.keyCode] = 0;
		},
		mousemove: function(evt){
			updateMouseCoords(evt);
		}
	};
	for(var key in bodyListeners){
		document.body.addEventListener(key, bodyListeners[key]);
	}
}

function removeInputListeners(){
	for(var key in canvasListeners){
		canvas.removeEventListener(key, canvasListeners[key]);
	}
	for(var key in bodyListeners){
		document.body.removeEventListener(key, bodyListeners[key]);
	}
}

function updateMouseCoords(evt){
	var rect = canvas.getBoundingClientRect(); // cache this?
	var size = Math.min(rect.width, rect.height);
	var subx = 0;
	var suby = 0;
	if(rect.width > rect.height){
		subx = (rect.width - size) * 0.5;
	} else {
		suby = (rect.height - size) * 0.5;
	}
	_mousex = Math.floor((evt.clientX - rect.left - subx) / size * screensize);
	_mousey = Math.floor((evt.clientY - rect.top - suby) / size * screensize);
}

utils.makeGlobal(math);
utils.makeGlobal(exports);