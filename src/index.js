var input = require('./input');
var mouse = require('./mouse');
var utils = require('./utils');
var font = require('./font');
var math = require('./math');
var colors = require('./colors');
var sfx = require('./sfx');
var pixelops = require('./pixelops');
var code = require('./code');
var music = require('./music');
var Rectangle = require('./Rectangle');

var cellsizeX = 8; // pixels
var cellsizeY = 8; // pixels
var screensizeX = 128; // pixels
var screensizeY = 128; // pixels
var mapSizeX = 128; // cells
var mapSizeY = 32; // cells
var spriteSheetSizeX = 16; // sprites
var spriteSheetSizeY = 16; // sprites
var paletteSize = 16; // colors

// Clip state
var clipRect = new Rectangle(0,0,screensizeX,screensizeY);

// DOM elements
var container;
var canvases = [];

var mapData = utils.zeros(mapSizeX * mapSizeY);
var mapDataDirty = utils.zeros(mapSizeX * mapSizeY); // dirtiness per cell
var mapDirty = true; // is all of the map dirty?
var mapCacheCanvas;
var mapCacheContext;
var spriteSheetCanvas;
var spriteSheetContext;
var spriteSheetDirtyRect = new Rectangle();
var spriteFlags;
var spriteSheetPixels;
var ctx;
var _time = 0;
var _startTime = 0;
var camX = 0;
var camY = 0;
var palette;
var paletteHex;
var defaultColor = 0;
var transparentColors = utils.zeros(paletteSize).map(function(){ return false; });
transparentColors[0] = true;
var loaded = false; // Loaded state
var _alpha = 0;
var pixelPerfectMode = 0;
var autoFit = false;
var responsive = false;
var responsiveRect = new Rectangle(0,0,128,128);
var gameTitle = 'game';
var soundFixed = false;

exports.cartridge = function(options){
	autoFit = options.autoFit !== undefined ? options.autoFit : true;
	responsive = options.responsive !== undefined ? options.responsive : false;
	pixelPerfectMode = options.pixelPerfect !== undefined ? options.pixelPerfect : 0;
	var numCanvases = options.layers !== undefined ? options.layers : 1;
	container = options.containerId ? document.getElementById(options.containerId) : null;
	var html = '';
	for(var i=0; i<numCanvases; i++){
		html += '<canvas class="cartridgeCanvas" id="cartridgeCanvas'+i+'" width="' + screensizeX + '" height="' + screensizeY + '"' + (i === 0 ? ' moz-opaque' : '') + '></canvas>';
	}
	container.innerHTML = html;

	for(var i=0; i<numCanvases; i++){
		var c = document.getElementById('cartridgeCanvas' + i);
		c.oncontextmenu = function(){
			return false;
		};
		canvases.push(c);
		if(i !== 0){
			c.style.pointerEvents = 'none';
		}
		c.style.position = 'absolute';
		utils.disableImageSmoothing(c.getContext('2d'));
	}

	setCellSize(cellsizeX, cellsizeY, spriteSheetSizeX, spriteSheetSizeY);
	setPalette(options.palette || colors.defaultPalette());

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

	// Set main canvas
	canvas(0);

	input.init(canvases);
	mouse.init(canvases);
	pixelops.init(canvases[0]); // todo: support multiple

	if(autoFit){
		// Resize (fit) the canvas when the container changes size
		var resizeHandler = function(){
			fit(pixelPerfectMode, responsive);
		};
		resizeHandler();
		window.addEventListener('resize', resizeHandler);
		window.addEventListener('mozfullscreenchange', resizeHandler);
	}

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
				t0 += dt0;
				accumulator0 -= dt0;
				_alpha = accumulator0 / dt0;
				if(loaded && typeof(_update) === 'function'){
					runUserFunction(_update);
				}
			}
			accumulator1 += frameTime;
			while ( accumulator1 >= dt1 ){
				_time = t1;
				t1 += dt1;
				accumulator1 -= dt1;
				_alpha = accumulator1 / dt1;
				if(loaded && typeof(_update60) === 'function'){
					runUserFunction(_update60);
				}
			}
		}
		if(_startTime === -1){
			_startTime = newTime;
		}
		_time = newTime - _startTime;
		if(loaded && typeof(_draw) === 'function'){
			runUserFunction(_draw);
		}

		// Flush any remaining pixelops
		pixelops.flush();

		currentTime = newTime;
		input.update();
		music.update();
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);

	// Init font
	font.init(paletteHex);

	utils.iosAudioFix(canvases[0], function(){
		// restart sound nodes here
		sfx.iosFix();
		music.iosFix();
		soundFixed = true;

		if(loaded && typeof(_sound) === 'function'){
			runUserFunction(_sound);
		}
	});
};

exports.run = function(){
	if(loaded){
		runKill();
	}
	_startTime = -1;
	try {
		code.run();
	} catch(err){
		if(typeof(_error) === 'function'){
			_error(utils.getErrorInfo(err));
		}
	}
	runInit();
};

function runInit(){
	loaded = true;
	if(typeof(_init) === 'function'){
		runUserFunction(_init);
	}
	if(soundFixed){
		if(loaded && typeof(_sound) === 'function'){
			runUserFunction(_sound);
		}
	}
}
function runKill(){
	loaded = false;
	if(typeof(_kill) === 'function'){
		runUserFunction(_kill);
	}
}

function setCellSize(
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
	if(spriteSheetPixels){
		// Copy pixel data to new dimensions
		var minWidth = Math.min(spriteSheetSizeX*cellsizeX, newSpriteSheetWidth*newCellWidth);
		var minHeight = Math.min(spriteSheetSizeY*cellsizeY, newSpriteSheetHeight*newCellHeight);
		for(var i=0; i<minWidth; i++){
			for(var j=0; j<minHeight; j++){
				newSpriteSheetPixels[i+j*newSpriteSheetWidth*newCellWidth] = spriteSheetPixels[i+j*spriteSheetSizeX*cellsizeX];
			}
		}
	}
	spriteSheetPixels = newSpriteSheetPixels;

	// Map references sprites, which are now wrong. Need to fix!
	for(var i=0; i<mapSizeX; i++){
		for(var j=0; j<mapSizeY; j++){
			var oldSpriteIndex = mget(i, j);
			var oldX = ssx(oldSpriteIndex);
			var oldY = ssy(oldSpriteIndex);
			var newSpriteIndex = oldX + oldY * newSpriteSheetWidth;
			if(newSpriteIndex >= newSpriteSheetWidth * newSpriteSheetHeight) continue;
			mset(i, j, newSpriteIndex);
		}
	}

	cellsizeX = newCellWidth;
	cellsizeY = newCellHeight;

	spriteSheetSizeX = newSpriteSheetWidth;
	spriteSheetSizeY = newSpriteSheetHeight;

	var maxSprites = spriteSheetSizeX * spriteSheetSizeY;
	if(!spriteFlags) spriteFlags = utils.zeros(maxSprites);
	while(spriteFlags.length < maxSprites) spriteFlags.push(0);
	while(spriteFlags.length > maxSprites) spriteFlags.pop();

	// (re)init spritesheet canvas
	spriteSheetCanvas = utils.createCanvas(spriteSheetSizeX * cellsizeX, spriteSheetSizeY * cellsizeY);
	spriteSheetContext = spriteSheetCanvas.getContext('2d');

	// (re)init map cache
	mapCacheCanvas = utils.createCanvas(mapSizeX * cellsizeX, mapSizeY * cellsizeY);
	mapCacheContext = mapCacheCanvas.getContext('2d');

	spriteSheetDirtyRect.set(0,0,spriteSheetCanvas.width,spriteSheetCanvas.height);
	mapDirty = true;
}

// Redraw the whole spritesheet
function flushSpriteSheet(){
	if(!spriteSheetDirtyRect.area) return;

	var w = spriteSheetSizeX*cellsizeX;
	var h = spriteSheetSizeY*cellsizeY;
	spriteSheetContext.clearRect(spriteSheetDirtyRect.x0, spriteSheetDirtyRect.y0, spriteSheetDirtyRect.w, spriteSheetDirtyRect.h);
	var imageData = spriteSheetContext.createImageData(spriteSheetDirtyRect.w, spriteSheetDirtyRect.h);
	for(var i=0; i<spriteSheetDirtyRect.w; i++){
		for(var j=0; j<spriteSheetDirtyRect.h; j++){
			var col = spriteSheetPixels[(j+spriteSheetDirtyRect.y0) * w + (i+spriteSheetDirtyRect.x0)];
			var dec = palette[col];
			var r = utils.decToR(dec);
			var g = utils.decToG(dec);
			var b = utils.decToB(dec);
			var p = 4 * (j * spriteSheetDirtyRect.w + i);
			imageData.data[p + 0] = utils.decToR(dec);
			imageData.data[p + 1] = utils.decToG(dec);
			imageData.data[p + 2] = utils.decToB(dec);
			imageData.data[p + 3] = transparentColors[col] ? 0 : 255;
		}
	}
	spriteSheetContext.putImageData(imageData, spriteSheetDirtyRect.x0, spriteSheetDirtyRect.y0);
	spriteSheetDirtyRect.set();
}

function setPalette(p){
	palette = p.slice(0);
	paletteHex = palette.map(colors.int2hex);
	mapDirty = true;
	font.changePalette(paletteHex);

	// Check spritesheet for invalid colors
	for(var i=0; i<spriteSheetSizeX*cellsizeX; i++){
		for(var j=0; j<spriteSheetSizeY*cellsizeY; j++){
			if(sget(i,j) >= p.length){
				sset(i,j,0); // Just set it to empty
			}
		}
	}
	spriteSheetDirtyRect.set(0,0,spriteSheetCanvas.width,spriteSheetCanvas.height);
}

exports.palset = function(n, hexColor){
	var newPalette = palette.slice(0);

	if(hexColor === undefined){
		newPalette[n] = colors.defaultPalette()[n] || 0;
	} else if(hexColor === -1){
		// Clamp the palette
		newPalette = newPalette.slice(0,n);
	} else {
		while(newPalette.length < n) newPalette.push(0x000000);
		newPalette[n] = hexColor;
	}

	setPalette(newPalette);
};

exports.palget = function(n){
	return palette[n];
};

function resizeCanvases(){
	for(var i=0; i < canvases.length; i++){
		canvases[i].width = screensizeX;
		canvases[i].height = screensizeY;
	}
	if(autoFit){
		fit(pixelPerfectMode, responsive);
	}
	pixelops.resize(canvases[0]);

	// Reset clip state
	clip();
}

exports.alpha = function(){ return _alpha; }; // for interpolation

// TODO: rename to wget/set() ?
exports.width = function(newWidth){
	if(newWidth !== undefined){
		newWidth = newWidth | 0;
		if(screensizeX === newWidth){
			// unchanged
			return;
		}
		screensizeX = newWidth;
		resizeCanvases();
	}
	return screensizeX;
};

// TODO: rename to hget/set() ?
exports.height = function(newHeight){
	if(newHeight !== undefined){
		newHeight = newHeight | 0;
		if(screensizeY === newHeight){
			// unchanged
			return;
		}
		screensizeY = newHeight;
		resizeCanvases();
	}
	return screensizeY;
};

// TODO: rename to cwget/set() ?
exports.cellwidth = function(newCellWidth){
	if(newCellWidth !== undefined){
		if(newCellWidth === cellsizeX){
			// unchanged
			return;
		}
		setCellSize(newCellWidth, cellsizeY, spriteSheetSizeX, spriteSheetSizeY);
	} else {
		return cellsizeX;
	}
};

// TODO: rename to chget/set() ?
exports.cellheight = function(newCellHeight){
	if(newCellHeight !== undefined){
		if(newCellHeight === cellsizeY){
			// unchanged
			return;
		}
		setCellSize(cellsizeX, newCellHeight, spriteSheetSizeX, spriteSheetSizeY);
	} else {
		return cellsizeY;
	}
};

exports.cls = function(){
	pixelops.beforeChange();
	ctx.clearRect(-camX,-camY,screensizeX,screensizeY);
};

exports.time = function(){
	return _time / 1000;
};

exports.color = function(col){
	defaultColor = col;
};

exports.palt = function(col, t){
	if(t !== undefined){
		transparentColors[col] = t;
	} else {
		return transparentColors[col];
	}
};

exports.rectfill = function rectfill(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;

	// Full clip
	if(clipRect.excludesRect(x0,y0,x1,y1)){
		return;
	}

	// Reduce it to the clip area
	x0 = Math.max(x0, clipRect.x0);
	y0 = Math.max(y0, clipRect.y0);
	x1 = Math.min(x1, clipRect.x1);
	y1 = Math.min(y1, clipRect.y1);

	var w = x1 - x0 + 1;
	var h = y1 - y0 + 1;

	if(w > 0 && h > 0){
		pixelops.beforeChange();
		ctx.fillStyle = paletteHex[col];
		ctx.fillRect(x0, y0, w, h);
	}
};

exports.rect = function rect(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;

	// full clip
	if(clipRect.excludesRect(x0,y0,x1,y1)){
		return;
	}

	for(var x=x0; x<=x1; x++){
		exports.pset(x,y0,col);
		exports.pset(x,y1,col);
	}

	for(var y=y0; y<=y1; y++){
		exports.pset(x0,y,col);
		exports.pset(x1,y,col);
	}
};

exports.clip = function(x,y,w,h){
	if(x === undefined){
		x = y = 0;
		w = screensizeX;
		h = screensizeY;
	}
	x = x | 0;
	y = y | 0;
	w = w | 0;
	h = h | 0;

	clipRect.set(x,y,w,h);
};

exports.canvas = function canvas(n){
	ctx = canvases[n].getContext('2d');
};

exports.camera = function camera(x, y){
	x = x | 0;
	y = y | 0;
	if(camX === x && camY === y) return;

	pixelops.beforeChange();
	ctx.translate(x - camX, y - camY);
	camX = x;
	camY = y;
};

exports.map = function map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer){
	pixelops.beforeChange();
	layer = layer === undefined ? 0 : layer;

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
	if(clipRect.excludesRect(x0,y0,x1,y1)){
		return; // fully outside the clip area
	}

	if(layer === 0){
		// Update invalidated map cache
		if(mapDirty){
			clearMapCacheCanvas();
			for(i=0; i<mapSizeX; i++){
				for(j=0; j<mapSizeY; j++){
					updateMapCacheCanvas(i,j,false);
				}
			}
			mapDirty = false;
		}
		for(i=0; i<mapSizeX; i++){
			for(j=0; j<mapSizeY; j++){
				if(mapDataDirty[j * mapSizeX + i]){
					updateMapCacheCanvas(i,j,true);
					mapDataDirty[j * mapSizeX + i] = 0;
				}
			}
		}

		var _sx = cel_x * cellsizeX; // Clip start
		var _sy = cel_y * cellsizeY;
		var _x = sx; // Draw position
		var _y = sy;
		var _swidth = cel_w * cellsizeX; // Clip end
		var _sheight = cel_h * cellsizeY;
		var _width = _swidth; // Width on target canvas
		var _height = _sheight;
		ctx.drawImage(mapCacheCanvas,_sx,_sy,_swidth,_sheight,_x,_y,_width,_height);
	} else {
		// Draw only matching sprites
		for(i=0; i<cel_w; i++){
			for(j=0; j<cel_h; j++){
				var spriteNumber = mget(i, j);
				var flags = fget(spriteNumber);
				if((layer & flags) === layer){
					spr(spriteNumber, sx + i * cellsizeX, sy + j * cellsizeY);
				}
			}
		}
	}
};

// Returns the sprite X position in the spritesheet
function ssx(n){
	return n % spriteSheetSizeX;
}

// Returns the sprite Y position in the spritesheet
function ssy(n){
	return Math.floor(n / spriteSheetSizeX) % (spriteSheetSizeX * spriteSheetSizeY);
}

// Render a sprite at position X,Y in the sprite sheet
exports.spr2 = function(nx, ny, x, y, w, h, flip_x, flip_y){
	var n = ny * spriteSheetSizeX + nx;
	return spr(n, x, y, w, h, flip_x, flip_y);
};

// Render a sprite given its id
exports.spr = function spr(n, x, y, w, h, flip_x, flip_y){
	pixelops.beforeChange();
	flushSpriteSheet();

	w = w !== undefined ? w : 1;
	h = h !== undefined ? h : 1;
	flip_x = flip_x !== undefined ? flip_x : false;
	flip_y = flip_y !== undefined ? flip_y : false;

	x = x | 0;
	y = y | 0;
	w = w | 0;
	h = h | 0;

	var sourceSizeX = cellsizeX * w;
	var sourceSizeY = cellsizeY * h;
	var destSizeX = sourceSizeX;
	var destSizeY = sourceSizeY;
	var destX = x;
	var destY = y;

	var sourceX = ssx(n) * cellsizeX;
	var sourceY = ssy(n) * cellsizeY;

	// Clip lower
	if(destX < clipRect.x0){
		sourceX = sourceX + clipRect.x0 - destX;
		destX = clipRect.x0;
	}
	if(destY < clipRect.y0){
		sourceY = sourceY + clipRect.y0 - destY;
		destY = clipRect.y0;
	}

	// TODO: clip upper

	ctx.save();
	ctx.translate(
		destX + (flip_x ? sourceSizeX : 0),
		destY + (flip_y ? sourceSizeY : 0)
	);
	ctx.scale(flip_x ? -1 : 1, flip_y ? -1 : 1);
	ctx.drawImage(
		spriteSheetCanvas,
		sourceX, sourceY,
		sourceSizeX, sourceSizeY,
		0, 0,
		destSizeX, destSizeY
	);
	ctx.restore();
};

// Get sprite flags
exports.fget = function(n,bitPosition){
	var flags = spriteFlags[n];
	if(bitPosition !== undefined){
		return !!(flags & (1 << bitPosition));
	}
	return flags;
};

// Set sprite flags
exports.fset = function(n, flags, t){
	var newFlags;
	if(t !== undefined){
		newFlags = spriteFlags[n];
		var bit = (1 << flags);
		if(t){
			newFlags |= bit;
		} else {
			newFlags &= (~bit);
		}
	} else {
		newFlags = flags;
	}
	spriteFlags[n] = newFlags;
};

exports.assert = function(condition, message){
	if(!condition){
		message = message !== undefined ? message : "Assertion failed";
		throw new Error(message);
	}
};

// Get pixel color
exports.pget = (function(){
	var data = new Uint8Array(3);
	return function(x, y){
		x = x | 0;
		y = y | 0;
		pixelops.pget(x,y,data);
		var col = utils.rgbToDec(data[0], data[1], data[2]);
		var result = palette.indexOf(col);
		return result === -1 ? 0 : result;
	};
})();

// Set pixel color
exports.pset = function(x, y, col){
	x = x | 0;
	y = y | 0;
	col = col | 0;

	if(clipRect.excludesPoint(x,y)) return;

	// new style
	var dec = palette[col];
	var r = utils.decToR(dec);
	var g = utils.decToG(dec);
	var b = utils.decToB(dec);
	pixelops.pset(x,y,r,g,b);
};

// Get spritesheet pixel color
exports.sget = function(x, y){
	x = x | 0;
	y = y | 0;
	var w = spriteSheetSizeX * cellsizeX;
	return spriteSheetPixels[y * w + x];
};

// Set spritesheet size
exports.ssset = function(n){
	setCellSize(cellsizeX, cellsizeY, n, n);
};

// Get spritesheet size
exports.ssget = function(){
	return spriteSheetSizeX;
};

// Set spritesheet pixel color
exports.sset = function(x, y, col){
	x = x | 0;
	y = y | 0;
	col = col !== undefined ? col : defaultColor;

	var w = spriteSheetSizeX * cellsizeX;
	spriteSheetPixels[y * w + x] = col;
	if(spriteSheetDirtyRect.area){
		spriteSheetDirtyRect.expandToPoint(x,y);
	} else {
		spriteSheetDirtyRect.set(x,y,1,1);
	}

	mapDirty = true; // TODO: Only invalidate matching map positions
};

// Game title
exports.title = function(newTitle){
	if(newTitle !== undefined){
		gameTitle = newTitle;
	}
	return gameTitle;
};

exports.fullscreen = function fullscreen(){
	utils.fullscreen(container);
};

// Is x defined?
exports.def = function(x){
	return x !== undefined;
};

// Console log
exports.log = function(){
	console.log.apply(null, arguments);
};

exports.print = function(text, x, y, col){
	pixelops.beforeChange();
	if(Array.isArray(text)){
		for(var i=0; i<text.length; i++){
			exports.print(text[i], x, y + 8*i, col);
		}
		return;
	}
	x = x !== undefined ? x : 0;
	y = y !== undefined ? y : 0;
	col = col !== undefined ? col : defaultColor;

	x = x | 0;
	y = y | 0;

	font.draw(ctx, text.toString().toUpperCase(), x, y, col);
};

exports.fit = function fit(stretchMode, responsive){
	if(responsive){
		var rect = container.getBoundingClientRect();
		var aspect = rect.width / rect.height;
		var responsiveAspect = responsiveRect.w / responsiveRect.h;
		var newWidth = responsiveRect.w;
		var newHeight = responsiveRect.h;
		if(aspect > responsiveAspect){
			// Increase width
			newWidth *= aspect / responsiveAspect;
		} else {
			newHeight *= responsiveAspect / aspect;
		}
		width(newWidth);
		height(newHeight);
	}

	stretchMode = stretchMode !== undefined ? stretchMode : 0;
	var pixelPerfect = (stretchMode === 0);
	var i = canvases.length;
	while(i--){
		utils.scaleToFit(canvases[i], container, pixelPerfect);
	}
};

exports.mget = function mget(x, y){
	x = x | 0;
	y = y | 0;
	return mapData[y * mapSizeX + x];
};

exports.mset = function mset(x, y, i){
	if(mget(x,y) === i) return;

	i = i | 0;
	x = x | 0;
	y = y | 0;

	mapData[y * mapSizeX + x] = i;
	mapDataDirty[y * mapSizeX + x] = 1;
};

exports.save = function(key){
	key = key || 'save';
	var data = toJSON();

	var idx = key.indexOf('.json');
	if(idx !== -1){
		download(key.substr(0,idx));
	} else {
		localStorage.setItem(key, JSON.stringify(data));
	}
};

exports.json = function(){
	return toJSON();
};

exports.load = function(key){
	if(typeof(key) === 'object'){
		loadJSON(key);
	} else {
		key = key || 'save';
		if(key.indexOf('.json') !== -1){
			utils.loadJsonFromUrl(key,function(err,json){
				if(json){
					loadJSON(json);
				}
			});
		} else {
			try {
				var data = JSON.parse(localStorage.getItem(key));
				loadJSON(data);
				return true;
			} catch(err) {
				// localStorage is undefined (iOS private mode) or something else went wrong
				return false;
			}
		}
	}
};

function download(key){
	key = key || 'export';
	var data = toJSON();
	utils.downloadStringAsTextFile(JSON.stringify(data), key + '.json');
}

function toJSON(){
	var i,j;
	var data = {
		version: 9,
		width: width(), // added in v3
		height: height(), // added in v3
		cellwidth: cellwidth(), // added in v4
		cellheight: cellheight(), // added in v4
		spritesheetsize: ssget(), // added in v5
		title: title(), // added in v9
		map: [],
		sprites: [],
		flags: [],
		palette: palette.slice(0),
		sfx: [],
		code: code.codeget(), // added in v2
		trackInfo: [], // added in v6
		tracks: [], // added in v6
		patterns: [] // added in v6
	};
	for(var i=0; i<spriteFlags.length; i++){
		data.flags[i] = fget(i);
	}
	utils.removeTrailingZeros(data.flags);

	// Sprite data
	for(i=0; i<ssget()*cellwidth(); i++){
		for(j=0; j<ssget()*cellheight(); j++){
			data.sprites[j*ssget()*cellwidth()+i] = sget(i,j);
		}
	}
	utils.removeTrailingZeros(data.sprites);

	// Map data
	for(i=0; i<mapSizeX; i++){
		for(j=0; j<mapSizeY; j++){
			data.map[j*mapSizeX+i] = mget(i,j);
		}
	}
	utils.removeTrailingZeros(data.map);

	// SFX data
	for(var n=0; asget(n) !== undefined; n++){
		var sfxData = {
			speed: asget(n),
			volumes: [],
			pitches: [],
			waves: []
		};
		for(var offset=0; offset<32; offset++){
			sfxData.volumes.push(avget(n, offset));
			sfxData.pitches.push(afget(n, offset));
			sfxData.waves.push(awget(n, offset));
		}
		data.sfx.push(sfxData);
	}
	// Remove zero valued sfx data, added in v8
	function isDefaultSfxData(d){
		var onlyZeroVolumes = true;
		for(var i=0;i<d.volumes.length; i++){
			if(d.volumes[i] !== 0){
				onlyZeroVolumes = false;
				break;
			}
		}
		return onlyZeroVolumes;
	}
	while(data.sfx.length && isDefaultSfxData(data.sfx[data.sfx.length-1])){
		data.sfx.pop();
	}

	// trackInfo
	for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
		var speed = gsget(groupIndex);
		var groupFlags = 0; // todo
		data.trackInfo.push(speed, groupFlags);
	}

	// tracks
	for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
		for(var position=0; position<32; position++){
			var pitch = npget(groupIndex, position);
			var octave = noget(groupIndex, position);
			var instrument = niget(groupIndex, position);
			var volume = nvget(groupIndex, position);
			var effect = neget(groupIndex, position);
			data.tracks.push(pitch, octave, instrument, volume, effect);
		}
	}
	utils.removeTrailingZeros(data.tracks);

	// patterns
	for(var patternIndex=0; mfget(patternIndex) !== undefined; patternIndex++){
		var flags = mfget(patternIndex);
		data.patterns.push(flags);
		for(var channelIndex = 0; channelIndex < 4; channelIndex++){
			var track = mgget(patternIndex, channelIndex);
			data.patterns.push(track);
		}
	}
	utils.removeTrailingZeros(data.patterns);

	return data;
}

function loadJSON(data){
	var i,j;
	code.codeset(data.code || '');

	title(data.title || 'game');

	if(data.width !== undefined){
		width(data.width);
	}
	if(data.height !== undefined){
		height(data.height);
	}

	if(data.cellwidth !== undefined){
		cellwidth(data.cellwidth);
	}
	if(data.cellheight !== undefined){
		cellheight(data.cellheight);
	}

	if(data.spritesheetsize !== undefined){
		ssset(data.spritesheetsize);
	}

	for(i=0; i<spriteFlags.length; i++){
		fset(i, data.flags[i] || 0);
	}

	setPalette(data.palette);
	for(i=0; i<spriteSheetSizeX*cellwidth(); i++){
		for(j=0; j<spriteSheetSizeY*cellheight(); j++){
			sset(i,j,data.sprites[j*spriteSheetSizeX*cellwidth()+i] || 0);
		}
	}
	spriteSheetDirtyRect.set(0,0,spriteSheetSizeX*cellwidth(),spriteSheetSizeY*cellheight());

	for(i=0; i<mapSizeX; i++){
		for(j=0; j<mapSizeY; j++){
			mset(i,j,data.map[j*mapSizeX+i] || 0);
		}
	}

	for(var n=0; asget(n) !== undefined; n++){
		var sfxData = data.sfx[n] || {
			speed: 16,
			volumes: [],
			pitches: [],
			waves: []
		};
		asset(n, sfxData.speed);
		for(var offset=0; avget(n, offset) !== undefined; offset++){
			avset(n, offset, sfxData.volumes[offset] || 0);
			afset(n, offset, sfxData.pitches[offset] || 0);
			awset(n, offset, sfxData.waves[offset] || 0);
		}
	}

	// trackInfo
	if(data.trackInfo){
		for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
			var speed = data.trackInfo[groupIndex*2];
			var flags = data.trackInfo[groupIndex*2+1];
			gsset(groupIndex, speed);
		}
	}

	// tracks
	if(data.tracks){
		for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
			for(var position=0; position<32; position++){
				var p = groupIndex * 32 * 5 + position * 5;

				var pitch = data.tracks[p + 0] || 0;
				var octave = data.tracks[p + 1] || 0;
				var instrument = data.tracks[p + 2] || 0;
				var volume = data.tracks[p + 3] || 0;
				var effect = data.tracks[p + 4] || 0;

				if(data.version <= 6){
					// in v7, all octaves were lowered by 1.
					octave++;
				}

				npset(groupIndex, position, pitch);
				noset(groupIndex, position, octave);
				niset(groupIndex, position, instrument);
				nvset(groupIndex, position, volume);
				neset(groupIndex, position, effect);
			}
		}
	}

	// patterns
	if(data.patterns){
		for(var patternIndex=0; mfget(patternIndex) !== undefined; patternIndex++){
			var flags = data.patterns[patternIndex * 5] || 0;
			mfset(patternIndex, flags);
			for(var channelIndex = 0; channelIndex < 4; channelIndex++){
				var track = data.patterns[patternIndex * 5 + channelIndex + 1] || 0;
				mgset(patternIndex, channelIndex, track);
			}
		}
	}

	if(typeof(_load) === 'function'){
		runUserFunction(_load);
	}
}

function runUserFunction(func){
	if(typeof(func) === 'function'){
		try {
			func();
		} catch(err){
			if(typeof(_error) === 'function'){
				_error(utils.getErrorInfo(err));
			}
			console.error(err);
		}
	}
}

function clearMapCacheCanvas(){
	mapCacheContext.clearRect(0, 0, cellsizeX*mapSizeX, cellsizeY*mapSizeY);
}

function updateMapCacheCanvas(x,y,doClear){
	if(doClear){
		mapCacheContext.clearRect(x * cellsizeX, y * cellsizeY, cellsizeX, cellsizeY);
	}
	var n = mget(x, y);
	if(n === 0){
		// Sprite 0 is empty
		return;
	}
	flushSpriteSheet();
	mapCacheContext.drawImage(
		spriteSheetCanvas,
		ssx(n) * cellsizeX, ssy(n) * cellsizeY,
		cellsizeX, cellsizeY,
		cellsizeX * x, cellsizeY * y,
		cellsizeX, cellsizeY
	);
}

exports.mousex = function(){
	return Math.floor(mouse.mousexNormalized() * (screensizeX-1));
};

exports.mousey = function(){
	return Math.floor(mouse.mouseyNormalized() * (screensizeY-1));
};

exports.touchx = function(id){
	return Math.floor(mouse.touchxNormalized(id) * (screensizeX-1));
};

exports.touchy = function(id){
	return Math.floor(mouse.touchyNormalized(id) * (screensizeY-1));
};

exports.mobile = function(){
	return utils.isMobile();
};

utils.makeGlobal(music);
utils.makeGlobal(math);
utils.makeGlobal(sfx.global);
utils.makeGlobal(code);
utils.makeGlobal(exports);
utils.makeGlobal(input.global);
utils.makeGlobal(mouse.global);
