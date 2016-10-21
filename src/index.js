var input = require('./input');
var utils = require('./utils');
var font = require('./font');
var math = require('./math');
var colors = require('./colors');

var cellsize = 8; // pixels
var screensize = 128; // pixels
var container;
var spriteSheet;
var mapImage;
var fontImage;
var ctx;
var canvas;
var mapCanvas;
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
var mapPixelData;
var mapImageData;
var mapCanvasContext;

/**
 * Initialize the player.
 */
exports.cartridge = function(containerId){
	container = document.getElementById(containerId);
	container.innerHTML = '<canvas class="cartridgeCanvas" id="cartridgeCanvas" width="' + screensize + '" height="' + screensize + '" moz-opaque></canvas>';
	canvas = document.getElementById('cartridgeCanvas');

	// Add style tag
	var style = document.createElement('style');
	style.innerHTML = [
		".cartridgeCanvas {",
		"  image-rendering: -moz-crisp-edges;",
		"  image-rendering: -webkit-crisp-edges;",
		"  image-rendering: pixelated;",
		"}"
	].join('\n');
	document.getElementsByTagName('head')[0].appendChild(style);

	loadImages(initialize);
};

exports.cls = function cls(){
	ctx.clearRect(0,0,screensize,screensize);
};

exports.time = function time(){
	return _time / 1000;
};

exports.color = function color(col){
	defaultColor = col;
};

exports.rectfill = function rectfill(x0, y0, x1, y1, col){
	col = col !== undefined ? col : defaultColor;
	ctx.fillStyle = paletteHex[col];
	ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
};

/**
 * Set camera position
 */
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

/**
 * Draw map, layers from flags, sprite 0 is empty
 * celx The column location of the map cell in the upper left corner of the region to draw, where 0 is the leftmost column.
 * cely The row location of the map cell in the upper left corner of the region to draw, where 0 is the topmost row.
 * sx The x coordinate of the screen to place the upper left corner.
 * sy The y coordinate of the screen to place the upper left corner.
 * celw The number of map cells wide in the region to draw.
 * celh The number of map cells tall in the region to draw.
 * layer If specified, only draw sprites that have flags set for every bit in this value (a bitfield). The default is 0 (draw all sprites).
 */
exports.map = function map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer){
	layer = layer !== undefined ? layer : 0;
	var _sx = cel_x * cellsize; // Clip start
	var _sy = cel_y * cellsize;
	var _x = sx; // Draw position
	var _y = sy;
	var _swidth = cel_w * cellsize; // Clip end
	var _sheight = cel_h * cellsize;
	var _width = cel_w * cellsize; // Width on target canvas
	var _height = cel_h * cellsize;
	ctx.drawImage(mapCanvas,_sx,_sy,_swidth,_sheight,_x,_y, _width, _height);
};

exports.spr = function spr(n, x, y, w, h, flip_x, flip_y){
	w = w !== undefined ? w : 1;
	h = h !== undefined ? h : 1;
	flip_x = flip_x !== undefined ? flip_x : false;
	flip_y = flip_y !== undefined ? flip_y : false;
	ctx.drawImage(spriteSheet, n * cellsize, 0, cellsize * w, cellsize * h, x, y, cellsize*w, cellsize*h);
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

/**
 * Enter full screen
 */
exports.fullscreen = function fullscreen(){
	utils.fullscreen(container);
};

exports.print = function(text, x, y, col){
	x = x !== undefined ? x : 0;
	y = y !== undefined ? y : 0;
	col = col !== undefined ? col : defaultColor;
	font.draw(ctx, text, x, y, col);
};

/**
 * Fit the canvas to the container element.
 */
exports.fit = function fit(){
	utils.scaleToFit(canvas, container);
};

exports.mget = function mget(x, y){
	return mapPixelData[4 * x + 4 * screensize * y];
};

exports.mset = function mset(x, y, i){
	mapPixelData[4 * x + 4 * screensize * y] = i;
	updateMapCanvas(x,y);
};

function updateMapCanvas(x,y){
	var spriteNumber = mget(x, y);
	mapCanvasContext.drawImage(
		spriteSheet,
		cellsize * spriteNumber, 0,
		cellsize, cellsize,
		cellsize * x, cellsize * y,
		cellsize, cellsize
	);
}

// === async loads: Not needed if we encode the images in arrays and draw them using ImageData ===
function loadImages(callback){
	spriteSheet = new Image();
	mapImage = new Image();
	fontImage = new Image();
	spriteSheet.onload = function(){
		mapImage.onload = function(){
			fontImage.onload = function(){
				callback();
			}
			fontImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM8AAAAFAQMAAADYPCrOAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAGUExURQAAAAAAAKVnuc8AAAABdFJOUwBA5thmAAAAiklEQVQI1xXLsQkCMRgG0A8J4hhyWFg5wxUprDKF1SGZQYKFpLghQorwIZlCjkOcIhwiIfwzyL3+Qa4ySGrWWDI3yaPA6GlziwD9w+tUyTsZYpccEZzTJvVo/jPqmfm5MC7xK0WwdU71kHVRJ6b3IddjdF0ICutCj2x/tWXOw+tSReRUylnpabcH/k5GRml9ekAwAAAAAElFTkSuQmCC";
		};
		mapImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAJUExURQAAAAQAAAMAABq0FY8AAAABdFJOUwBA5thmAAAAJ0lEQVRYw+3KMQ0AMAgAMESCR4JKHPDtWdq7MdNxqsrXAQAAAPjaAiHkBPfg4mmYAAAAAElFTkSuQmCC";
	};
	spriteSheet.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAMAAAByFOZhAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABdUExURQAAAA/qWP+pExDrWP+oE/kGRplmAMyZMzNmM/gFRf//O/+oEhDqWPX45X0iU3wiU/gFRqpUN/X55giGUR4nVgmGUgICBPgGRvX55X0iVKpUOKlUN///Og/qVwmGUQmetpIAAAABdFJOUwBA5thmAAAAwUlEQVRYw+3PWXLDQAgEUBjACrNojZ099z+mkeXEqZTiygH6lQa+ulATCUsWITJzH51IU04p0cNVd0V7hDkzi5jbEHFXTSVrST/Ch/Xth09zra2xxeXezbUlLTG6NXc7vH+ZW/uQ+VR9tifzZ9fHpK8xvlOH7e1frsvyubD44EPvL6aap7d3LV+hu5drdM4sPI7ROIqXSOfofbt5p3M4Hrfd99uephjdL39kaxRftxH5uvXy/eu3AQAAAAAAAADg4gzcoQjX+MlqSgAAAABJRU5ErkJggg==";
}

function initialize(){

	// Init font
	font.init(fontImage, palette);

	// Init map
	mapCanvas = document.createElement('canvas');
	mapCanvas.width = mapCanvas.height = screensize;
	mapCanvasContext = mapCanvas.getContext('2d');
	var mapImageAsCanvas = document.createElement('canvas');
	mapImageAsCanvas.width = mapImage.width;
	mapImageAsCanvas.height = mapImage.height;
	mapImageAsCanvas.getContext('2d').drawImage(mapImage, 0, 0, mapImage.width, mapImage.height);
	mapPixelData = mapImageAsCanvas.getContext('2d').getImageData(0, 0, mapImage.width, mapImage.height).data;
	for(var i=0; i<screensize; i++){
		for(var j=0; j<screensize; j++){
			updateMapCanvas(i, j);
		}
	}

	// Init canvas & animation
	ctx = canvas.getContext('2d');
	canvas.onclick = function(){
		fullscreen();
	};
	canvas.onmousedown = function(evt){
		_mousebtns[evt.which] = true;
	};
	canvas.onmouseup = function(evt){
		_mousebtns[evt.which] = false;
	};
	document.body.addEventListener('keydown', function(e){
		buttonStates[e.keyCode] = 1;
	});
	document.body.addEventListener('keyup', function(e){
		buttonStates[e.keyCode] = 0;
	});
	document.body.onmousemove = function(evt){
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
	};

	utils.disableImageSmoothing(ctx);

	fit();

	var currentTime = 0;
	var t0 = 0;
	var t1 = 0;
	var dt0 = Math.floor(1 / 30 * 1000);
	var dt1 = Math.floor(1 / 60 * 1000);
	var accumulator0 = 0;
	var accumulator1 = 0;

	_init();

	function render(newTime){
		if (currentTime) {
			var frameTime = newTime - currentTime;
			if ( frameTime > 250 )
				frameTime = 250;
			accumulator0 += frameTime;
			while ( accumulator0 >= dt0 ){
				_time = t0;
				_update();
				t0 += dt0;
				accumulator0 -= dt0;
			}
			accumulator1 += frameTime;
			while ( accumulator1 >= dt1 ){
				_time = t1;
				_update60();
				t1 += dt1;
				accumulator1 -= dt1;
			}
		}
		_time = newTime;
		_draw();
		currentTime = newTime;
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
};

utils.makeGlobal(math);
utils.makeGlobal(exports);