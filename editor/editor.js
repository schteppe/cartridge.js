(function(){

var editorDraw;

cartridge({
	containerId: 'container'
});

cellwidth(16);
cellheight(16);
width(256);
height(240);

palset(0, 0x000000);
palset(1, 0x0829fc);
palset(2, 0x7e2500);
palset(3, 0x008000);
palset(4, 0xab5236);
palset(5, 0x5f574f);
palset(6, 0xc2c3c7);
palset(7, 0xfff1e8);
palset(8, 0xe40405);
palset(9, 0xffa300);
palset(10, 0xfff024);
palset(11, 0x00e756);
palset(12, 0x8bf9fc);
palset(13, 0x83769c);
palset(14, 0xff8e7d);
palset(15, 0xffffff);

document.body.onresize = document.body.mozfullscreenchange = function(){
	fit();
	dirty = true;
};

var modes = ['help', 'game', 'sprite', 'map', 'sfx', 'code', 'music', 'run'];
var mode = modes[0];

var selectedSprite = 1; // Because zero is "empty sprite"
var dirty = true;
var lastmx = 0;
var lastmy = 0;
var keysdown = {};

var viewport = {
	x: 1,
	y: 8,
	sx: function(){ return flr((width() * 0.6) / cellwidth()); },
	sy: function(){ return flr((height() * 0.6) / cellheight()); }
};

function viewport_draw(viewport){
	for(var i=0; i<cellwidth(); i++){
		for(var j=0; j<cellheight(); j++){
			var x = (ssx(selectedSprite) * cellwidth() + i) % width();
			var y = (ssy(selectedSprite) * cellheight() + j) % height();
			var col = sget(x, y);
			rectfill(
				viewport.x + i * viewport.sx(),
				viewport.y + j * viewport.sy(),
				viewport.x + (i+1) * viewport.sx()-1,
				viewport.y + (j+1) * viewport.sy()-1,
				col
			);
		}
	}
}

var code = {
	x: 1,
	y: 8,
	initialized: false,
	width: function(){ return width() - 3; },
	height: function(){ return height() - 9; },
	fontHeight: 6,
	fontWidth: 4,
	ccol: 0, // cursor
	crow: 0,
	wcol: 0, // window position
	wrow: 0,
	cursorVisible: true
};

var mapPanX = 0;
var mapPanY = 0;

var palette = {
	sx: function(){ return flr((width() * 0.4) / 4); },
	sy: function(){ return flr((height() * 0.3) / 4); },
	x: function(){ return width() - palette.sx() * 4 - 1; },
	y: function(){ return 8; },
	current: 1
};

var flags = {
	x: function(){ return palette.x(); },
	y: function(){ return palette.y() + palette.sy() * 4 + 1; },
	current: function(newFlags){
		if(newFlags === undefined){
			return fget(selectedSprite);
		} else {
			fset(selectedSprite, newFlags);
		}
	}
};

var buttons = {
	x: function(){ return width() - 56; },
	y: function(){ return height() - 4 * cellheight() - 7; },
	num: 4,
	current: 0,
	padding: 4
};

var slotButtons = {
	x: function(){ return 5; },
	y: function(){ return 21; },
	num: 8,
	padding: 4
};

var saveButtons = {
	x: function(){ return 5; },
	y: function(){ return 42; },
	num: 8,
	padding: 4
};

var waveformButtons = {
	x: function(){ return width() - 60; },
	y: function(){ return 8; },
	num: 6,
	current: 4,
	padding: 2
};

var topButtons = {
	x: function(){ return 0; },
	y: function(){ return 0; },
	options: ['HLP', 'CRT', 'SPR', 'MAP', 'SFX', '.JS', 'MUS', 'RUN'],
	current: 0,
	bgColor: 7,
	textColor: 0,
	padding: 6
};

var toolButtons = {
	x: function(){ return 1; },
	y: function(){ return viewport.y + viewport.sy() * cellheight() + 1; },
	options: ['draw','fill'],
	current: 0,
	padding: 6
};

var speedSelector = {
	x: 1,
	y: 16,
	current: 1,
	padding: 6,
	min: 1,
	max: 64,
	prefix: '',
	postfix: 'X'
};

var sfxSelector = {
	x: 1,
	y: 8,
	current: 0,
	padding: 6,
	min: 0,
	max: 63,
	prefix: '',
	postfix: ''
};

function intsel_draw(intsel){
	var padding = intsel.padding;
	var numDigits = intsel.max.toString().length;
	var chars = ['<', intsel.prefix + intsel.current + intsel.postfix, '>'];
	for(var i=0; i<3; i++){
		var x0 = intsel.x + i * (6 + padding*2);
		rectfill(
			x0, intsel.y,
			intsel.x+5+padding*2 + i * (6+padding*2)-1, intsel.y+6,
			6
		);
		var x1 = intsel.x+1+padding + i * (6 + padding*2);
		print(
			chars[i],
			(x0+1) + padding - (chars[i].length-1) * 2, intsel.y+1,
			0
		);
	}
}

function intsel_click(intsel, x, y){
	if(inrect(x,y,intsel.x,intsel.y, 3 * (intsel.padding * 2 + 6),7)){
		var speed = keysdown[16] ? 10 : 1;
		var button = flr((x-intsel.x) / (intsel.padding * 2 + 6));
		if(button === 0){
			intsel.current -= speed;
		} else if(button === 2){
			intsel.current += speed;
		}
		intsel.current = clamp(intsel.current, intsel.min, intsel.max);
		return true;
	}
	return false;
}

var pitches = {
	x: function(){ return 0; },
	y: function(){ return 40; },
	w: function(){ return width(); },
	h: function(){ return flr(height() / 2); }
};

var volumes = {
	x: function(){ return pitches.x(); },
	y: function(){ return pitches.y() + pitches.h() + 2; },
	w: function(){ return pitches.w(); },
	h: function(){ return flr(height() / 6); }
};

// Helpers
function ssx(n){ return n % 16; }
function ssy(n){ return Math.floor(n / 16) % (16 * 16); }
function inrect(x,y,rx,ry,rw,rh){ return x >= rx && y >= ry && x < rx + rw && y < ry + rh; }
function decToR(c){ return Math.floor(c / (256*256)); }
function decToG(c){ return Math.floor(c / 256) % 256; }
function decToB(c){ return c % 256; }
function floodfill(get, set, x, y, target, replace, xmin, xmax, ymin, ymax){
	if(target === replace) return;
	if(get(x,y) !== target) return;
	var q = [];
	q.push(x,y);
	while(q.length){
		var nx = q.shift();
		var ny = q.shift();
		if(get(nx,ny) === target){
			set(nx,ny,replace);
			if(nx > xmin && get(nx-1,ny) === target) q.push(nx-1,ny);
			if(nx < xmax && get(nx+1,ny) === target) q.push(nx+1,ny);
			if(ny < ymax && get(nx,ny+1) === target) q.push(nx,ny+1);
			if(ny > ymin && get(nx,ny-1) === target) q.push(nx,ny-1);
		}
	}
}

function mousemovehandler(forceMouseDown){
	switch(mode){
	case 'sprite':
		if(mousebtn(1) || forceMouseDown){
			// Draw on sprite
			var x = flr((mousex()-viewport.x) / viewport.sx());
			var y = flr((mousey()-viewport.y) / viewport.sy());

			if(inrect(x, y, 0, 0, cellwidth(), cellheight())){
				if(toolButtons.current === 0){
					// Draw!
					sset(
						ssx(selectedSprite) * cellwidth() + x,
						ssy(selectedSprite) * cellheight() + y,
						palette.current
					);
					dirty = true;
				} else if(toolButtons.current === 1){
					// Fill!
					var x0 = ssx(selectedSprite) * cellwidth();
					var y0 = ssy(selectedSprite) * cellheight();
					var fillx = x0 + x;
					var filly = y0 + y;
					floodfill(
						sget,
						sset,
						fillx,
						filly,
						sget(fillx, filly),
						palette.current,
						x0, x0 + cellwidth()-1,
						y0, y0 + cellheight()-1
					);
					dirty = true;
				}
			}
		}
		break;

	case 'map':
		if(keysdown[32] || mousebtn(2) || mousebtn(3)){
			// Pan map
			var dx = mousex() - lastmx;
			var dy = mousey() - lastmy;
			// TODO: clamp panning
			mapPanX += dx;
			mapPanY += dy;
			dirty = true;
		} else if((forceMouseDown || mousebtn(1)) && inrect(mousex(), mousey(), 0, 8, width(), buttons.y()-9)){
			// Draw on map
			mset(
				flr((mousex() - mapPanX) / cellwidth()),
				flr((mousey() - mapPanY) / cellheight()),
				selectedSprite
			);
			dirty = true;
		}
		break;

	case 'sfx':
		if(mousebtn(1) || mousebtn(3) || forceMouseDown){
			var n = flr(mousex() / width() * 32);
			var pitch = flr((pitches.h() - mousey() + pitches.y()) / pitches.h() * 255);
			var vol = flr((volumes.h() - mousey() + volumes.y()) / volumes.h() * 255);

			// Within editing area?
			if(clamp(n,0,32) === n && clamp(pitch,0,255) === pitch){
				if(mousebtn(1)){
					// Draw pitch
					if(avget(sfxSelector.current, n) === 0){
						// User probably want full volumes
						avset(sfxSelector.current, n, 255);
					}
					afset(sfxSelector.current, n, pitch);
					awset(sfxSelector.current, n, waveformButtons.current);
				} else if(mousebtn(3)){
					// Delete
					afset(sfxSelector.current, n, 0);
					avset(sfxSelector.current, n, 0);
				}
				dirty = true;
			} else if(clamp(n,0,32) === n && clamp(vol,0,255) === vol){
				avset(sfxSelector.current, n, vol);
				dirty = true;
			}
		}
		break;
	}
}

window._click = function _click(){
	var mx = mousex();
	var my = mousey();
	mousemovehandler(true);
	if(mode === 'sprite'){
		if(palette_click(palette,mx,my)){
			dirty = true;
		} else if(flags_click(flags,mx,my)){
			dirty = true;
		} else if(buttons_click(toolButtons,mx,my)){
			// tool switcher
			dirty = true;
		}
	}

	// Sprite select
	if(mode === 'sprite' || mode === 'map'){
		var spritesHeight = height() - cellheight() * 4;
		if(my >= height() - cellheight() * 4){

			var cw = min(flr(width() / 16), cellwidth());
			var ch = min(flr(height() / 16), cellheight());

			var spriteX = flr(mx / cw);
			var spriteY = buttons.current * 4 + flr((my-spritesHeight) / ch);
			if(spriteX < 16 && spriteY < 16){
				selectedSprite = spriteX + spriteY * 16;
				dirty = true;
			}
		} else if(buttons_click(buttons, mx, my)){
			dirty = true;
		}
	}

	if(mode === 'sfx'){
		if(buttons_click(waveformButtons,mx,my)){
			dirty = true;
		}
		if(intsel_click(speedSelector, mx, my)){
			asset(sfxSelector.current, speedSelector.current);
			dirty = true;
		}
		if(intsel_click(sfxSelector, mx, my)){
			dirty = true;
		}
	}

	// mode switcher
	if(buttons_click(topButtons,mx,my)){
		if(modes[topButtons.current] === 'run'){
			if(code_run(code)){
				dirty = true;
			}
		} else {
			mode = modes[topButtons.current];
		}
		dirty = true;
	}

	if(mode === 'code' && code_click(code,mx,my)){
		dirty = true;
	}

	if(mode === 'game'){
		if(buttons_click(slotButtons,mx,my)){
			if(load('slot' + slotButtons.current)){
				alert('Loaded game from slot ' + (slotButtons.current + 1) + '.');
			} else {
				alert('Could not load game from slot ' + (slotButtons.current + 1) + '.');
			}
			dirty = true;
			slotButtons.current = -1;
		}

		if(buttons_click(saveButtons,mx,my)){
			save('slot' + saveButtons.current);
			alert('Saved game to slot ' + (saveButtons.current + 1) + '.');
			dirty = true;
			saveButtons.current = -1;
		}
	}
}

var editorLoad = window._load = function _load(callback){
	codeset([
		'var x=10,y=10;',
		'function _draw(){',
		'  cls();',
		'  map(0,0,0,0,16,15);',
		'  spr(1,x,y);',
		'  if(btn(0)) x--;',
		'  if(btn(1)) x++;',
		'  if(btn(2)) y--;',
		'  if(btn(3)) y++;',
		'  if(btn(4) && !btnp(4)) sfx(0);',
		'}'
	].join('\n').toLowerCase());
	dirty = true;
	callback();
};

editorDraw = window._draw = function _draw(){
	var mx = mousex();
	var my = mousey();
	if(!(lastmx === mx && lastmy === my)){
		mousemovehandler();
		dirty = true;
	}
	lastmx = mx;
	lastmy = my;

	if(!dirty) return;
	dirty = false;

	rectfill(0, 0, width(), height(), 7);

	topButtons.current = modes.indexOf(mode);

	switch(mode){
	case 'code':
		code_draw(code);
		break;
	case 'sprite':
		viewport_draw(viewport);
		sprites_draw();
		palette_draw(palette);
		buttons_draw(buttons);
		buttons_draw(toolButtons);
		flags_draw(flags);
		break;
	case 'map':
		map(0, 0, mapPanX, mapPanY, 128, 32);
		rect(mapPanX, mapPanY, mapPanX+cellwidth()*128, mapPanY+cellheight()*32, 0);
		sprites_draw();
		buttons_draw(buttons);
		break;
	case 'sfx':
		pitches_draw(pitches, 0);
		pitches_draw(volumes, 1, 0);
		buttons_draw(waveformButtons);
		speedSelector.current = asget(sfxSelector.current);
		intsel_draw(speedSelector);
		intsel_draw(sfxSelector);
		break;
	case 'game':
		print("Load from localstorage slot:", 5,14);
		buttons_draw(slotButtons);
		print("Save to localstorage slot:", 5,35);
		buttons_draw(saveButtons);
		print('- Press "S" to download JSON.', 5,56);
		print('- Press "O" to open JSON.', 5,70);
		break;
	case 'help':
		print([
			"Cartridge.js is an open source",
			"retro game engine for the web.",
			"Use it to make cool pixel-",
			"style games!",
			"Use tabs above to get started:",
			"",
			"- CRT: Save/load game.",
			"- SPR: Sprite editor.",
			"- MAP: Map editor.",
			"- SFX: Sound effect editor.",
			"- .JS: JavaScript editor.",
			"- RUN: Run game (Esc=quit).",
			"",
			"Good luck! /Schteppe"
		], 4,13);
		break;
	}

	drawtop();
	mouse_draw(mousex(), mousey());
}

function drawtop(){
	rectfill(0, 0, width(), 6, 0);
	buttons_draw(topButtons);
}

function buttons_draw(settings){
	var padding = settings.padding !== undefined ? settings.padding : 4;
	var num = settings.num || settings.options.length;
	var bgColor = settings.bgColor !== undefined ? settings.bgColor : 0;
	var textColor = settings.textColor !== undefined ? settings.textColor : 6;
	for(var i=0; i<num; i++){
		var x0 = settings.x() + i * (6 + padding*2);
		rectfill(
			x0, settings.y(),
			settings.x() + 5+padding*2 + i * (6+padding*2)-1, settings.y() + 6,
			settings.current === i ? bgColor : textColor
		);
		var text = settings.options !== undefined ? settings.options[i].toUpperCase().substr(0,4) : ((i+1) + '');
		var x1 = settings.x()+1+padding + i * (6 + padding*2);
		print(
			text,
			settings.options !== undefined ? (x0+1) : x1, settings.y()+1,
			settings.current === i ? textColor : bgColor
		);
	}
}

function buttons_click(buttons,x,y){
	var num = buttons.num !== undefined ? buttons.num : buttons.options.length;
	if(inrect(x,y,buttons.x(),buttons.y(), num * (buttons.padding * 2 + 6),7)){
		var button = flr((x-buttons.x()) / (buttons.padding * 2 + 6));
		if(buttons.current === button){
			return false;
		} else {
			buttons.current = button;
			return true;
		}
	}
	return false;
}

function flags_draw(flags){
	var x = flags.x();
	var y = flags.y();
	var size = 3;
	for(var i=0; i<8; i++){
		var rx = x + i * (size+3);
		var ry = y;
		var qx = x+(1+size) + i * (3+size);
		var qy = y+1+size;
		if((flags.current() & (1 << i)) !== 0)
			rectfill(rx, ry, qx, qy, 0);
		else
			rect(rx, ry, qx, qy, 0);
	}
}

function flags_click(flags, x, y){
	if(inrect(x,y,flags.x(),flags.y(),6*8,5)){
		var flagIndex = flr((x-flags.x()) / 6);
		var oldFlags = flags.current();
		var clickedFlag = (1 << flagIndex);
		var newFlags = (oldFlags & clickedFlag) ? (oldFlags & (~clickedFlag)) : (oldFlags | clickedFlag);
		flags.current(newFlags);
		return true;
	} else {
		return false;
	}
}

function mouse_draw(x,y){
	rectfill(x-4, y, x+4, y);
	rectfill(x, y-4, x, y+4);
	rectfill(x, y, x, y, 4);
}

function sprites_draw(){
	var offsetX = 0;
	var offsetY = height() - cellheight() * 4;

	var cw = min(flr(width() / 16), cellwidth());
	var ch = min(flr(height() / 16), cellheight());

	rectfill(offsetX, offsetY, cw * 16, height(), 0);

	var n = buttons.current*4*16;
	for(var j=0; j<4; j++){
		for(var i=0; i<16; i++){
			spr(n, i*cw+offsetX, j*ch+offsetY);
			n++;
		}
	}
	// Rectangle around the current editing sprite
	if(ssy(selectedSprite)/4 >= buttons.current && ssy(selectedSprite)/4 < buttons.current+1){
		var x = offsetX + ssx(selectedSprite) * cw;
		var y = offsetY + ssy(selectedSprite) * ch - buttons.current * 4 * ch;
		rect(
			x-1, y-1,
			x+cw, y+ch,
			6
		);
	}
}

function palette_draw(palette){
	var x = palette.x();
	var y = palette.y();
	var sx = palette.sx();
	var sy = palette.sy();
	var current = palette.current;
	var n=0;
	for(var j=0; j<4; j++){
		for(var i=0; i<4; i++){
			var rx = x+i*sx;
			var ry = y+j*sy;
			var rw = x+(i+1)*sx-1;
			var rh = y+(j+1)*sy-1;
			rectfill(rx, ry, rw, rh, n);
			print(n.toString(), rx+2, ry+2, n === 0 ? 7 : 0);
			if(current === n){
				rect(rx, ry, rw, rh, current === 0 ? 7 : 0);
			}
			n++;
		}
	}
}

function palette_click(palette,x,y){
	if(inrect(x,y,palette.x(),palette.y(),palette.sx()*4,palette.sy()*4)){
		var px = flr((x-palette.x()) / palette.sx());
		var py = flr((y-palette.y()) / palette.sy());
		palette.current = px + 4 * py;
		return true;
	}
	return false;
}

function pitches_draw(pitches, source, col){
	var x = pitches.x();
	var y = pitches.y();
	var w = pitches.w();
	var h = pitches.h();
	var pitchWidth = flr(w / 32);
	for(var i=0; i<32; i++){
		var x0 = x + i * pitchWidth + 1;
		var y0 = y + h - 1;
		var value = source === 1 ? (avget(sfxSelector.current,i) / 255) : (afget(sfxSelector.current,i) / 255);
		var pitch = flr(value * h);
		rectfill(x0, y0 - pitch, x0 + pitchWidth - 2, y0, col !== undefined ? col : awget(sfxSelector.current, i));
	}
}

function code_draw(code){
	var x = code.x;
	var y = code.y;
	var w = code.width();
	var h = code.height();

	var fontHeight = code.fontHeight;
	var fontWidth = code.fontWidth;
	var rows = flr(h / fontHeight);
	var cols = flr(w / fontWidth);

	if(code.crow < code.wrow) code.wrow = code.crow;
	if(code.crow > code.wrow + rows - 1) code.wrow = code.crow - rows + 1;
	if(code.ccol < code.wcol) code.wcol = code.ccol;
	if(code.ccol > code.wcol + cols - 1) code.wcol = code.ccol - cols + 1;

	var codeArray = codeget().split('\n');

	// Draw code
	for(var i=0; i+code.wrow < codeArray.length && h > (i+1) * fontHeight; i++){
		print(codeArray[i + code.wrow].substr(code.wcol, cols), x, y + i * fontHeight);
	}

	// Draw cursor
	if(code.cursorVisible){
		rectfill(
			x + (code.ccol - code.wcol) * fontWidth,
			y + (code.crow - code.wrow) * fontHeight,
			x + (code.ccol+1-code.wcol) * fontWidth-2,
			y + (code.crow+1-code.wrow) * fontHeight-2,
			0
		);
	}
}

function code_run(code){
	// Run code in global scope
	code.previousMode = mode;
	mode = 'run';
	code.initialized = false;
	try {
		eval.call(null, codeget());
		// Manually run the init
		if(window._init){
			window._init();
		}
		code.initialized = true;
	} catch(err){
		console.error(err);
		// Stop and go back!
		code_stop(code);
		return true;
	}
	return false;
}

function code_stop(code){
	// reattach the global scope functions
	if(code.initialized){
		try {
			if(window._kill){
				window._kill();
			}
		} catch(err){
			console.error(err);
		}
	}
	delete window._update;
	delete window._update60;
	delete window._init;
	delete window._kill;
	mode = code.previousMode;
	window._draw = editorDraw;
}

function code_click(code,x,y){
	if(!inrect(x,y,code.x,code.y,code.width(),code.height())){
		return false;
	}

	var codeArray = codeget().split('\n');

	code.crow = flr((y - code.y + code.wrow * code.fontHeight) / code.fontHeight);
	code.crow = clamp(code.crow, 0, codeArray.length-1);

	code.ccol = flr((x - code.x + code.wcol * code.fontWidth) / code.fontWidth);
	code.ccol = clamp(code.ccol, 0, codeArray[code.crow].length);

	return true;
}

function code_keydown(code, evt){

	var codeArray = codeget().split('\n');

	// Prevent tab'ing
	if(evt.which === 9) {
		codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, ' ');
		codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, ' ');
		code.ccol=min(code.ccol+2,codeArray[code.crow].length);
		evt.preventDefault();
	} else {
		switch(evt.keyCode){
		case 37: // left
			code.ccol=max(code.ccol-1,0);
			break;
		case 39: // right
			if(code.ccol === codeArray[code.crow].length && code.crow !== codeArray.length-1){
				code.ccol=0;
				code.crow=min(code.crow+1,codeArray.length-1);
			} else {
				code.ccol=min(code.ccol+1,codeArray[code.crow].length);
			}
			break;
		case 38: // up
			code.crow=max(code.crow-1,0);
			code.ccol=clamp(code.ccol,0,codeArray[code.crow].length);
			break;
		case 40: // down
			code.crow=min(code.crow+1,codeArray.length-1);
			code.ccol=clamp(code.ccol,0,codeArray[code.crow].length);
			break;
		case 8: // backspace
			if(code.ccol !== 0){
				var after = codeArray[code.crow].substr(code.ccol);
				var before = codeArray[code.crow].substr(0,code.ccol-1);
				codeArray[code.crow] = before + after;
				// Move cursor
				code.ccol=max(0,code.ccol-1);
			} else if(code.ccol === 0 && code.crow !== 0){
				// append to previous row
				var newCol = codeArray[code.crow-1].length;
				codeArray[code.crow-1] += codeArray[code.crow];
				codeArray.splice(code.crow, 1);
				code.crow -= 1;
				code.ccol = newCol;
			}
			break;
		case 46: // delete
			var after = codeArray[code.crow].substr(code.ccol+1);
			var before = codeArray[code.crow].substr(0,code.ccol);
			codeArray[code.crow] = before + after;
			break;
		}
	}

	codeset(codeArray.join('\n'));
}

function code_keypress(code, evt){
	var char = String.fromCharCode(evt.keyCode).toUpperCase();
	var codeArray = codeget().split('\n');

	if(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="+-{}<>!;_|&*~\'%'.indexOf(char) !== -1){
		if(char === "'") char = '"'; // temp fix until ' is supported
		char = char.toLowerCase();
		if(codeArray[code.crow] === ''){
			codeArray[code.crow] = char;
			code.ccol = 1;
		} else {
			codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, char);
			code.ccol=min(code.ccol+1,codeArray[code.crow].length);
		}
	} else if(evt.keyCode === 13){ // enter
		var after = codeArray[code.crow].substr(code.ccol);
		var before = codeArray[code.crow].substr(0,code.ccol);
		codeArray.splice(code.crow+1, 0, after);
		codeArray[code.crow] = before;
		// Move cursor
		code.ccol=0;
		code.crow=min(code.crow+1,codeArray.length-1);
	}

	codeset(codeArray.join('\n'));
}

window.addEventListener('keyup', function(evt){
	keysdown[evt.keyCode] = false;
});

function strInsertAt(str, index, character) {
	return str.substr(0, index) + character + str.substr(index+character.length-1);
}

function rotateSprite(spriteNumber){
	var pixels = [];
	var i,j;
	for(i=0; i<cellwidth(); i++){
		for(j=0; j<cellheight(); j++){
			var x = ssx(spriteNumber)*cellwidth() + i;
			var y = ssy(spriteNumber)*cellheight() + j;
			var newX = ssx(spriteNumber)*cellwidth() + cellwidth() - 1 - j;
			var newY = ssy(spriteNumber)*cellheight() + i;
			pixels.push(newX, newY, sget(x,y));
		}
	}
	for(i=0; i<pixels.length; i+=3){
		sset(pixels[i+0],pixels[i+1],pixels[i+2]);
	}
}

function clearSprite(spriteNumber){
	var i,j;
	for(i=0; i<cellwidth(); i++){
		for(j=0; j<cellheight(); j++){
			var x = ssx(spriteNumber)*cellwidth() + i;
			var y = ssy(spriteNumber)*cellheight() + j;
			sset(x, y, 0);
		}
	}
}

window.addEventListener('keydown', function(evt){
	keysdown[evt.keyCode] = true;

	if(mode === 'code'){
		code_keydown(code, evt);
	} else if(mode === 'run' && evt.keyCode === 27){
		code_stop(code);
	} else {
		switch(evt.keyCode){
			case 82: if(mode === 'sprite') rotateSprite(selectedSprite); break; // R
			case 46: if(mode === 'sprite') clearSprite(selectedSprite); break; // delete
			case 81: if(mode === 'sprite') selectedSprite--; break;
			case 87: if(mode === 'sprite') selectedSprite++; break;
			case 32: if(mode === 'sfx') sfx(sfxSelector.current); break;
			case 83: save('game.json'); break;
			case 79: openfile(); break;
		}
		selectedSprite = clamp(selectedSprite,0,16*16);
	}
	dirty = true;
});

// Prevent ctrl + s
document.addEventListener('keydown', function(e){
	if (e.keyCode == 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)){
		e.preventDefault();
	}
}, false);

window.addEventListener('keypress', function(evt){
	if(mode === 'code'){
		code_keypress(code, evt);
	}
});

function openfile(){
	var input = document.createElement('input');
	input.type = 'file';
	input.addEventListener('change', readSingleFile, false);
	input.click();
}

function readSingleFile(e) {
  var file = e.target.files[0];
  if (!file) {
	return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
	try {
		var json = JSON.parse(e.target.result);
		loadjson(json);
		dirty = true;
	} catch(err){
		console.error("Could not open file.");
	}
  };
  reader.readAsText(file);
}

function handlepaste (e) {
	var types, pastedData, savedContent;

	if(mode !== 'sprite') return;

	// Browsers that support the 'text/html' type in the Clipboard API (Chrome, Firefox 22+)
	if (e && e.clipboardData && e.clipboardData.types && e.clipboardData.getData) {
		types = e.clipboardData.types;

		if (((types instanceof DOMStringList) && types.contains("Files")) || (types.indexOf && types.indexOf('Files') !== -1)) {
			var data = e.clipboardData.items[0];
			if(data.kind == 'file' && data.type.match('^image/')) {

				// Extract data and pass it to callback
				var file = data.getAsFile();

				var urlCreator = window.URL || window.webkitURL;
				var img = new Image();
				img.onload = function(){
					// paste pixels into current sprite
					var tmpCanvas = document.createElement('canvas');
					tmpCanvas.width = img.width;
					tmpCanvas.height = img.height;
					tmpCanvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
					var imgData = tmpCanvas.getContext('2d').getImageData(0, 0, img.width, img.height);
					var pixels = imgData.data;

					for(var i=0; i<img.width && i < 16 * cellwidth(); i++){
						for(var j=0; j<img.height && j < 16 * cellheight(); j++){
							// Get best matching color
							var p = 4 * (i + j*img.width);
							var r = pixels[p + 0];
							var g = pixels[p + 1];
							var b = pixels[p + 2];

							var bestColor = 0;
							var distance = 1e10;
							for(var k=0; k<16; k++){
								var dec = palget(k);
								var dr = decToR(dec);
								var dg = decToG(dec);
								var db = decToB(dec);
								var newDistance = (r-dr)*(r-dr) + (g-dg)*(g-dg) + (b-db)*(b-db);
								if(newDistance < distance){
									bestColor = k;
									distance = newDistance;
								}
							}

							// write to spritesheet at current position
							var x = (ssx(selectedSprite) * cellwidth() + i);
							var y = (ssy(selectedSprite) * cellheight() + j);
							sset(x, y, bestColor);
							dirty = true;
						}
					}

					urlCreator.revokeObjectURL(file);
				};
				img.src = urlCreator.createObjectURL(file);

				// Stop the data from actually being pasted
				e.stopPropagation();
				e.preventDefault();
			}
			return false;
		}
	}
	return true;
}

window.addEventListener('paste', handlepaste, false);

})();