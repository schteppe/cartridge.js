var input = require('./input');
var mouse = require('./mouse');
var utils = require('./utils');
var math = require('./math');
var colors = require('./colors');
var sfx = require('./sfx');
var code = require('./code');
var music = require('./music');
var Rectangle = require('./Rectangle');
var FastCanvasRenderer = require('./FastCanvasRenderer');
var CanvasRenderer = require('./CanvasRenderer');

var container;
var spriteFlags;
var _time = 0;
var _startTime = 0;
var defaultColor = 0;
var loaded = false; // Loaded state
var _alpha = 0;
var pixelPerfectMode = 0;
var autoFit = false;
var responsive = false;
var responsiveRect = new Rectangle(0,0,128,128);
var gameTitle = 'game';
var renderer;
var soundFixed = false;
var resizeHandler;

exports.cartridge = function(options){
	autoFit = options.autoFit !== undefined ? options.autoFit : true;
	responsive = options.responsive !== undefined ? options.responsive : false;
	pixelPerfectMode = options.pixelPerfect !== undefined ? options.pixelPerfect : 0;
	container = options.containerId ? document.getElementById(options.containerId) : null;

	renderer = new FastCanvasRenderer({
		cellsizeX: 8, // pixels
		cellsizeY: 8, // pixels
		screensizeX: 128, // pixels
		screensizeY: 128, // pixels
		mapSizeX: 128, // cells
		mapSizeY: 32, // cells
		spriteSheetSizeX: 16, // sprites
		spriteSheetSizeY: 16, // sprites
		paletteSize: 16, // colors
		palette: colors.defaultPalette()
	});
	container.appendChild(renderer.domElement);
	renderer.domElement.style.position = 'absolute';

	input.init([renderer.domElement]);
	mouse.init([renderer.domElement]);

	if(autoFit){
		// Resize (fit) the canvas when the container changes size
		resizeHandler = function(){
			fit(pixelPerfectMode, responsive);
		};
		resizeHandler();
		window.addEventListener('resize', resizeHandler);
		window.addEventListener('mozfullscreenchange', resizeHandler);
	}

	// Init flags
	var maxSprites = renderer.spriteSheetSizeX * renderer.spriteSheetSizeY;
	spriteFlags = utils.zeros(maxSprites);

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

		renderer.render();

		currentTime = newTime;
		input.update();
		music.update();
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);

	utils.iosAudioFix(renderer.domElement, function(){
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

	var maxSprites = renderer.spriteSheetSizeX * renderer.spriteSheetSizeY;
	if(!spriteFlags) spriteFlags = utils.zeros(maxSprites);
	while(spriteFlags.length < maxSprites) spriteFlags.push(0);
	while(spriteFlags.length > maxSprites) spriteFlags.pop();

	renderer.setCellSize(newCellWidth, newCellHeight, newSpriteSheetWidth, newSpriteSheetHeight);
}

exports.palset = function(n, hexColor){
	var newPalette = renderer.palette.slice(0);

	if(hexColor === undefined){
		newPalette[n] = colors.defaultPalette()[n] || 0;
	} else if(hexColor === -1){
		// Clamp the palette
		newPalette = newPalette.slice(0,n);
	} else {
		while(newPalette.length < n) newPalette.push(0x000000);
		newPalette[n] = hexColor;
	}

	renderer.setPalette(newPalette);
};

exports.palget = function(n){
	return renderer.palget(n);
};

exports.alpha = function(){ return _alpha; }; // for interpolation

// TODO: rename to wget/set() ?
exports.width = function(newWidth){
	if(newWidth !== undefined){
		newWidth = newWidth | 0;
		if(renderer.screensizeX === newWidth){
			// unchanged
			return;
		}
		renderer.resize(newWidth, renderer.screensizeY);
		resizeHandler();
	}
	return renderer.screensizeX;
};

// TODO: rename to hget/set() ?
exports.height = function(newHeight){
	if(newHeight !== undefined){
		newHeight = newHeight | 0;
		if(renderer.screensizeY === newHeight){
			// unchanged
			return;
		}
		renderer.resize(renderer.screensizeX, newHeight);
		resizeHandler();
	}
	return renderer.screensizeY;
};

// TODO: rename to cwget/set() ?
exports.cellwidth = function(newCellWidth){
	if(newCellWidth !== undefined){
		if(newCellWidth === renderer.cellsizeX){
			// unchanged
			return;
		}
		setCellSize(newCellWidth, renderer.cellsizeY, renderer.spriteSheetSizeX, renderer.spriteSheetSizeY);
	} else {
		return renderer.cellsizeX;
	}
};

// TODO: rename to chget/set() ?
exports.cellheight = function(newCellHeight){
	if(newCellHeight !== undefined){
		if(newCellHeight === renderer.cellsizeY){
			// unchanged
			return;
		}
		setCellSize(renderer.cellsizeX, newCellHeight, renderer.spriteSheetSizeX, renderer.spriteSheetSizeY);
	} else {
		return renderer.cellsizeY;
	}
};

exports.cls = function(){
	return renderer.cls();
};

exports.time = function(){
	return _time / 1000;
};

exports.color = function(col){
	defaultColor = col;
};

exports.palt = function(col, t){
	if(t !== undefined){
		renderer.setColorTransparent(col, t);
	} else {
		return renderer.getColorTransparent(col);
	}
};

exports.rectfill = function rectfill(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;
	renderer.rectfill(x0, y0, x1, y1, col);
};

exports.rect = function rect(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;

	// TODO: optimize
	for(var x=x0; x<=x1; x++){
		renderer.pset(x,y0,col);
		renderer.pset(x,y1,col);
	}

	for(var y=y0; y<=y1; y++){
		renderer.pset(x0,y,col);
		renderer.pset(x1,y,col);
	}
};

exports.clip = function(x,y,w,h){
	if(x === undefined){
		x = y = 0;
		w = renderer.screensizeX;
		h = renderer.screensizeY;
	}
	x = x | 0;
	y = y | 0;
	w = w | 0;
	h = h | 0;

	renderer.clip(x,y,w,h);
};

exports.camera = function camera(x, y){
	x = x | 0;
	y = y | 0;
	renderer.camera(x,y);
};

exports.map = function map(cel_x, cel_y, sx, sy, cel_w, cel_h){
	renderer.map(cel_x, cel_y, sx, sy, cel_w, cel_h);
};

// Returns the sprite X position in the spritesheet
function ssx(n){
	return n % renderer.spriteSheetSizeX;
}

// Returns the sprite Y position in the spritesheet
function ssy(n){
	return Math.floor(n / renderer.spriteSheetSizeX) % (renderer.spriteSheetSizeX * renderer.spriteSheetSizeY);
}

// Render a sprite at position X,Y in the sprite sheet
exports.spr2 = function(nx, ny, x, y, w, h, flip_x, flip_y){
	var n = ny * renderer.spriteSheetSizeX + nx;
	return spr(n, x, y, w, h, flip_x, flip_y);
};

// Render a sprite given its id
exports.spr = function spr(n, x, y, w, h, flip_x, flip_y){
	w = w !== undefined ? w : 1;
	h = h !== undefined ? h : 1;
	flip_x = flip_x !== undefined ? flip_x : false;
	flip_y = flip_y !== undefined ? flip_y : false;

	x = x | 0;
	y = y | 0;
	w = w | 0;
	h = h | 0;

	renderer.spr(n, x, y, w, h, flip_x, flip_y);
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
exports.pget = function(x, y){
	x = x | 0;
	y = y | 0;
	return renderer.pget(x, y);
};

// Set pixel color
exports.pset = function(x, y, col){
	x = x | 0;
	y = y | 0;
	col = col | 0;
	renderer.pset(x,y,col);
};

// Get spritesheet pixel color
exports.sget = function(x, y){
	x = x | 0;
	y = y | 0;
	return renderer.sget(x,y);
};

// Set spritesheet size
exports.ssset = function(n){
	setCellSize(renderer.cellsizeX, renderer.cellsizeY, n, n);
};

// Get spritesheet size
exports.ssget = function(){
	return renderer.spriteSheetSizeX;
};

// Set spritesheet pixel color
exports.sset = function(x, y, col){
	x = x | 0;
	y = y | 0;
	col = col !== undefined ? col : defaultColor;
	renderer.sset(x,y,col);
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
	x = x | 0;
	y = y | 0;
	col = col !== undefined ? col : defaultColor;
	renderer.print(text,x,y,col);
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
	utils.scaleToFit(renderer.domElement, container, pixelPerfect);
};

exports.mget = function mget(x, y){
	x = x | 0;
	y = y | 0;
	return renderer.mget(x,y);
};

exports.mset = function mset(x, y, i){
	i = i | 0;
	x = x | 0;
	y = y | 0;
	renderer.mset(x,y,i);
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
	var done = function(){
		if(typeof(_load) === 'function'){
			runUserFunction(_load);
		}
	};

	if(typeof(key) === 'object'){
		loadJSON(key, done);
	} else {
		key = key || 'save';
		if(key.indexOf('.json') !== -1){
			utils.loadJsonFromUrl(key,function(err,json){
				if(json){
					loadJSON(json, done);
				} else {
					done();
				}
			});
		} else {
			var data;
			try {
				data = JSON.parse(localStorage.getItem(key));
			} catch(err) {
				// localStorage is undefined (iOS private mode) or something else went wrong
				return false;
			}
			if(data){
				loadJSON(data, done);
				return true;
			} else {
				done();
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
		palette: renderer.palette.slice(0),
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
	for(i=0; i<renderer.mapSizeX; i++){
		for(j=0; j<renderer.mapSizeY; j++){
			data.map[j*renderer.mapSizeX+i] = mget(i,j);
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

function loadJSON(data, callback){
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

	renderer.setPalette(data.palette);
	for(i=0; i<renderer.spriteSheetSizeX*cellwidth(); i++){
		for(j=0; j<renderer.spriteSheetSizeY*cellheight(); j++){
			sset(i,j,data.sprites[j*renderer.spriteSheetSizeX*cellwidth()+i] || 0);
		}
	}

	for(i=0; i<renderer.mapSizeX; i++){
		for(j=0; j<renderer.mapSizeY; j++){
			mset(i,j,data.map[j*renderer.mapSizeX+i] || 0);
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

	if(callback){
		callback();
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

exports.mousex = function(){
	return Math.floor(mouse.mousexNormalized() * (renderer.screensizeX-1));
};

exports.mousey = function(){
	return Math.floor(mouse.mouseyNormalized() * (renderer.screensizeY-1));
};

exports.touchx = function(id){
	return Math.floor(mouse.touchxNormalized(id) * (renderer.screensizeX-1));
};

exports.touchy = function(id){
	return Math.floor(mouse.touchyNormalized(id) * (renderer.screensizeY-1));
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
