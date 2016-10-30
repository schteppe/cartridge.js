var help = require('./help');
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
var maxSprites = 256; // 16x16 sprites
var spriteSheetSizeX = 128; // 16x8 pixels
var spriteSheetSizeY = 128; // 16x8 pixels

// DOM elements
var container;
var canvases = [];

// Listeners/callbacks
var canvasListeners;
var bodyListeners;
var clickListener;

var mapData = utils.zeros(mapSizeX * mapSizeY);
var mapCacheCanvas;
var mapCacheContext;
var spriteSheetCanvas;
var spriteSheetContext;
var spriteFlags = utils.zeros(maxSprites);
var ctx;
var _time = 0;
var camX = 0;
var camY = 0;
var _mousex = 0;
var _mousey = 0;
var _mousebtns = {};
var buttonStates = {};
var keyMap0 = input.defaultKeyMap(1);
var keyMap1 = input.defaultKeyMap(2);
var palette;
var paletteHex;
var defaultColor = 0;
var transparentColors = utils.zeros(16).map(function(){ return false; });
transparentColors[0] = true;
var loaded = false; // Loaded state

exports.cartridge = function(options){

	var numCanvases = options.layers !== undefined ? options.layers : 1;
	container = options.containerId ? document.getElementById(options.containerId) : null;
	container.innerHTML = '';
	for(var i=0; i<numCanvases; i++){
		container.innerHTML += '<canvas class="cartridgeCanvas" id="cartridgeCanvas'+i+'" width="' + screensize + '" height="' + screensize + '"' + (i === 0 ? ' moz-opaque' : '') + '></canvas>';
	}

	for(var i=0; i<numCanvases; i++){
		var c = document.getElementById('cartridgeCanvas' + i);
		canvases.push(c);
		if(i !== 0){
			c.style.pointerEvents = 'none';
		}
		c.style.position = 'absolute';
		utils.disableImageSmoothing(c.getContext('2d'));
	}

	if(options.palette){
		setPalette(options.palette);
	} else {
		setPalette(colors.defaultPalette());
	}

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
	spriteSheetCanvas = utils.createCanvas(spriteSheetSizeX, spriteSheetSizeY);
	spriteSheetContext = spriteSheetCanvas.getContext('2d');

	// Init map cache
	mapCacheCanvas = utils.createCanvas(mapSizeX * cellsize, mapSizeY * cellsize);
	mapCacheContext = mapCacheCanvas.getContext('2d');

	// Set main canvas
	canvas(0);

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
				if(loaded && typeof(_update) !== 'undefined'){
					_update();
				}
				t0 += dt0;
				accumulator0 -= dt0;
			}
			accumulator1 += frameTime;
			while ( accumulator1 >= dt1 ){
				_time = t1;
				if(loaded && typeof(_update60) !== 'undefined'){
					_update60();
				}
				t1 += dt1;
				accumulator1 -= dt1;
			}
		}
		_time = newTime;
		if(loaded && typeof(_draw) !== 'undefined'){
			_draw();
		}
		currentTime = newTime;
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);

	// Init font
	font.load(function(image){
		font.init(image, palette);

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

function setPalette(p){
	palette = p.slice(0);
	paletteHex = palette.map(colors.int2hex);
	mapDirty = true;
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

exports.palt = function(col, t){
	transparentColors[col] = t;
};

exports.rectfill = function rectfill(x0, y0, x1, y1, col){
	col = col !== undefined ? col : defaultColor;
	var w = x1 - x0 + 1;
	var h = y1 - y0 + 1;
	ctx.fillStyle = paletteHex[col];
	ctx.fillRect(x0, y0, w, h);
};

exports.rect = function rect(x0, y0, x1, y1, col){
	col = col !== undefined ? col : defaultColor;
	var w = x1 - x0;
	var h = y1 - y0;
	ctx.fillStyle = paletteHex[col];
	ctx.fillRect(x0, y0, w, 1);
	ctx.fillRect(x0, y0, 1, h);
	ctx.fillRect(x1, y0, 1, h+1);
	ctx.fillRect(x0, y1, w+1, 1);
};

exports.clip = function(x,y,w,h){
	ctx.rect(x,y,w,h);
	ctx.clip();
};

exports.canvas = function canvas(n){
	ctx = canvases[n].getContext('2d');
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
		if(mapDirty){
			// Update the map cache
			for(var i=0; i<mapSizeX; i++){
				for(var j=0; j<mapSizeY; j++){
					updateMapCacheCanvas(i,j);
				}
			}
			mapDirty = false;
		}

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

// Returns the sprite X position in the 16x16 spritesheet
function ssx(n){
	return n % 16;
}

// Returns the sprite Y position in the 16x16 spritesheet
function ssy(n){
	return Math.floor(n / 16) % (16 * 16);
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
	ctx.drawImage(
		spriteSheetCanvas,
		ssx(n) * cellsize, ssy(n) * cellsize,
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
	if(transparentColors[col]){
		spriteSheetContext.clearRect(x, y, 1, 1);
	} else {
		spriteSheetContext.fillStyle = paletteHex[col % palette.length];
		spriteSheetContext.fillRect(x, y, 1, 1);
	}
	mapDirty = true;
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
	var i = canvases.length;
	while(i--){
		utils.scaleToFit(canvases[i], container);
	}
};

exports.click = function(callback){
	clickListener = callback || null;
};

exports.mget = function mget(x, y){
	return mapData[y * mapSizeX + x];
};

exports.mset = function mset(x, y, i){
	mapData[y * mapSizeX + x] = i;
	mapDirty = true;
};

function toJSON(){
	var data = {
		version: 1,
		map: [],
		sprites: [],
		flags: [],
		palette: palette.slice(0)
	};
	for(var i=0; i<spriteFlags.length; i++){
		data.flags[i] = fget(i);
	}
	for(var i=0; i<spriteSheetSizeX; i++){
		for(var j=0; j<spriteSheetSizeY; j++){
			data.sprites[j*spriteSheetSizeX+i] = sget(i,j);
		}
	}
	for(var i=0; i<mapSizeX; i++){
		for(var j=0; j<mapSizeY; j++){
			data.map[j*mapSizeX+i] = mget(i,j);
		}
	}
	return data;
}

exports.save = function(key){
	key = key || 'save';
	var data = toJSON();
	localStorage.setItem(key, JSON.stringify(data));
};

exports.load = function(key){
	key = key || 'save';
	try{
		var data = JSON.parse(localStorage.getItem(key));
		loadJSON(data);
		return true;
	} catch(err) {
		return false;
	}
};

exports.download = function(key){
	key = key || 'export';
	var data = toJSON();
	var url = URL.createObjectURL(new Blob([JSON.stringify(data)]));
	var a = document.createElement('a');
	a.href = url;
	a.download = key + '.json';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

function loadJSON(data){
	for(var i=0; i<spriteFlags.length; i++){
		fset(i, data.flags[i]);
	}
	for(var i=0; i<spriteSheetSizeX; i++){
		for(var j=0; j<spriteSheetSizeY; j++){
			sset(i,j,data.sprites[j*spriteSheetSizeX+i]);
		}
	}
	for(var i=0; i<mapSizeX; i++){
		for(var j=0; j<mapSizeY; j++){
			mset(i,j,data.map[j*mapSizeX+i]);
		}
	}
	setPalette(data.palette);
};

exports.loadjson = loadJSON;

function updateMapCacheCanvas(x,y){
	var n = mget(x, y);
	mapCacheContext.clearRect(x * cellsize, y * cellsize, cellsize, cellsize);
	mapCacheContext.drawImage(
		spriteSheetCanvas,
		ssx(n) * cellsize, ssy(n) * cellsize,
		cellsize, cellsize,
		cellsize * x, cellsize * y,
		cellsize, cellsize
	);
}

function addInputListeners(){
	canvasListeners = {
		click: function(evt){
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
		canvases[0].addEventListener(key, canvasListeners[key]);
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
		canvases[0].removeEventListener(key, canvasListeners[key]);
	}
	for(var key in bodyListeners){
		document.body.removeEventListener(key, bodyListeners[key]);
	}
}

function updateMouseCoords(evt){
	var rect = canvases[0].getBoundingClientRect(); // cache this?
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

exports.help = function(){
	help.print();
};

utils.makeGlobal(math);
utils.makeGlobal(exports);

help.hello();
help.print();