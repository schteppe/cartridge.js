(function(){

// For safari
if(Object.values === undefined){
	Object.values = function(obj){
		var vals = [];
		for(var key in obj) {
			vals.push(obj[key]);
		}
		return vals;
	};
}

// Parse query vars
function getQueryVariables(variables) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
	var result = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
		var varName = decodeURIComponent(pair[0]);
		var type = variables[varName];
        if (type === undefined) continue;

		var value = decodeURIComponent(pair[1]);
		var ok = false;
		switch(type){
			case 'i':
				value = parseInt(value, 10);
				ok = !isNaN(value);
				break;
			case 'b':
				value = (value === "1");
				ok = true;
				break;
			case 's':
				ok = true;
				break;
		}
		if(ok){
			result[varName] = value;
        }
    }
    return result;
}

var query = getQueryVariables({
	pixel_perfect: 'i',
	run: 'b',
	file: 's'
});

var editorDraw;

function resizeHandler(){
	dirty = true;
}
window.addEventListener("resize", resizeHandler);
window.addEventListener("mozfullscreenchange", resizeHandler);

var modes = ['game', 'sprite', 'map', 'sfx', 'code', 'music', 'run', 'help'];
var mode = modes[0];
var loading = false;

var selectedSprite = 1; // Because zero is "empty sprite"
var dirty = true;
var lastmx = 0;
var lastmy = 0;
var previousScroll = 0;
var keysdown = {};

var viewport = {
	x: 1,
	y: 8,
	sx: function(){ return flr((width() * 0.6) / cellwidth()); },
	sy: function(){ return flr(((height()-cellheight()*4-8) * 0.9) / cellheight()); }
};

var music = {
	x: 1,
	y: 8,
	width: function(){ return width() - 3; },
	height: function(){ return height() - 9; },
	row: 0,
	col: 0
};

function music_draw(){

}

function viewport_draw(viewport){
	var sx = ssx(selectedSprite);
	var sy = ssy(selectedSprite);
	var x = sx * cellwidth();
	var y = sy * cellheight();
	for(var i=0; i<cellwidth(); i++){
		for(var j=0; j<cellheight(); j++){
			var col = sget(x+i, y+j);
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
	margin: 1,
	initialized: false,
	width: function(){ return width() - 2; },
	height: function(){ return height() - 9; },
	fontHeight: 6,
	fontWidth: 4,
	ccol: 0, // cursor
	crow: 0,
	wcol: 0, // window position
	wrow: 0,
	cursorVisible: true,
	textColor: 7,
	bgColor: 5,
	errorBgColor: 4,
	currentLineBgColor: 4,
	keywordColor: 14,
	literalColor: 12,
	apiColor: 11,
	commentColor: 13,
	identifierColor: 6
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
	options: ['CRT', 'SPR', 'MAP', 'SFX', '.JS', 'MUS', 'RUN', '?'],
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
	x: function(){ return 1; },
	y: function(){ return 16; },
	current: 1,
	padding: 6,
	min: function(){ return 1; },
	max: function(){ return 64; },
	prefix: '',
	postfix: 'X'
};

var sfxSelector = {
	x: function(){ return 1; },
	y: function(){ return 8; },
	current: 0,
	padding: 6,
	min: function(){ return 0; },
	max: function(){ return 63; },
	prefix: '',
	postfix: ''
};

var spriteSheetPageSelector = {
	x: function(){ return width() - 54; },
	y: function(){ return height() - 4 * cellheight() - 7; },
	current: 0,
	padding: 6,
	min: function(){ return 0; },
	max: function(){ return ssget() === 16 ? 3 : 15; },
	prefix: '',
	postfix: ''
};

var resolutionSelectorX = {
	x: function(){ return 50; },
	y: function(){ return 80; },
	current: width(),
	padding: 8,
	min: function(){ return 128; },
	max: function(){ return 512; },
	prefix: '',
	postfix: ''
};

var resolutionSelectorY = {
	x: function(){ return 50; },
	y: function(){ return 88; },
	current: height(),
	padding: resolutionSelectorX.padding,
	min: resolutionSelectorX.min,
	max: resolutionSelectorX.max,
	prefix: '',
	postfix: ''
};

var spriteSheetSizeButtons = {
	x: function(){ return 80; },
	y: function(){ return 98; },
	options: [16,32],
	current: ssget() === 16 ? 0 : 1,
	padding: 2
};

var spriteSizeButtons = {
	x: function(){ return 80; },
	y: function(){ return 106; },
	options: [8,16,32],
	current: [8,16,32].indexOf(cellwidth()),
	padding: 2
};
console.log([8,16,32].indexOf(cellwidth()))

function intsel_draw(intsel){
	var padding = intsel.padding;
	var numDigits = intsel.max().toString().length;
	var chars = ['<', intsel.prefix + intsel.current + intsel.postfix, '>'];
	for(var i=0; i<3; i++){
		var x0 = intsel.x() + i * (6 + padding*2);
		rectfill(
			x0, intsel.y(),
			intsel.x() + 5+padding*2 + i * (6+padding*2)-1, intsel.y()+6,
			6
		);
		var x1 = intsel.x() + 1 + padding + i * (6 + padding*2);
		print(
			chars[i],
			(x0+1) + padding - (chars[i].length-1) * 2, intsel.y()+1,
			0
		);
	}
}

function intsel_click(intsel, x, y){
	if(inrect(x,y,intsel.x(),intsel.y(), 3 * (intsel.padding * 2 + 6),7)){
		var speed = keysdown[16] ? 10 : 1;
		var button = flr((x-intsel.x()) / (intsel.padding * 2 + 6));
		if(button === 0){
			intsel.current -= speed;
		} else if(button === 2){
			intsel.current += speed;
		}
		intsel.current = clamp(intsel.current, intsel.min(), intsel.max());
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
function ssx(n){ return n % ssget(); }
function ssy(n){ return Math.floor(n / ssget()) % (ssget() * ssget()); }
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
		} else if((forceMouseDown || mousebtn(1)) && inrect(mousex(), mousey(), 0, 8, width(), spriteSheetPageSelector.y()-9)){
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

function scrollhandler(delta){
	switch(mode){
		case 'code':
			code.crow -= delta;
			code_clamp_crow(code);
			code_clamp_ccol(code);
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
			var cw = cellwidth();
			var ch = cellheight();

			var spriteX, spriteY;


			if(ssget() === 16){
				spriteX = flr(mx / cw);
				spriteY = flr((my-spritesHeight) / ch) + spriteSheetPageSelector.current * 4;
			} else {
				spriteX = flr(mx / cw) + (spriteSheetPageSelector.current % 2) * 16;
				spriteY = flr((my-spritesHeight) / ch) + flr(spriteSheetPageSelector.current / 2) * 4;
			}
			if(spriteX < ssget() && spriteY < ssget()){
				selectedSprite = spriteX + spriteY * ssget();
				dirty = true;
			}
		} else if(intsel_click(spriteSheetPageSelector, mx, my)){
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
			code_run(code);
			dirty = true;
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

		if(intsel_click(resolutionSelectorX, mx, my)){
			width(resolutionSelectorX.current);
			dirty = true;
		}

		if(intsel_click(resolutionSelectorY, mx, my)){
			height(resolutionSelectorY.current);
			dirty = true;
		}
		if(buttons_click(spriteSheetSizeButtons,mx,my)){
			ssset(spriteSheetSizeButtons.current === 0 ? 16 : 32);
			dirty = true;
		}
		if(buttons_click(spriteSizeButtons,mx,my)){
			var newSize = spriteSizeButtons.options[spriteSizeButtons.current];
			cellwidth(newSize);
			cellheight(newSize);
			dirty = true;
		}
	}
}

var editorLoad = window._init = function _init(){

	setInterval(function(){
		save('autosave');
	}, 10000);

	if(!load('autosave')){
		// TODO: Load default JSON
		code_set([
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
	}

	dirty = true;
};

editorDraw = window._draw = function _draw(){
	if(loading) return;

	// Mouse move
	var mx = mousex();
	var my = mousey();
	if(!(lastmx === mx && lastmy === my)){
		mousemovehandler();
		dirty = true;
	}
	lastmx = mx;
	lastmy = my;

	// mouse scroll
	var currentScroll = mousescroll();
	if(currentScroll !== previousScroll){
		var delta = currentScroll - previousScroll;
		scrollhandler(delta);
		dirty = true;
	}
	previousScroll = currentScroll;

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
		buttons_draw(toolButtons);
		intsel_draw(spriteSheetPageSelector);
		flags_draw(flags);
		break;
	case 'map':
		map(0, 0, mapPanX, mapPanY, 128, 32);
		rect(mapPanX-1, mapPanY-1, mapPanX+cellwidth()*128, mapPanY+cellheight()*32, 0);
		sprites_draw();
		intsel_draw(spriteSheetPageSelector);
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
		print('- Press "O" to open JSON.', 5,68);

		print('Resolution:', 5,80);
		resolutionSelectorX.current = width();
		resolutionSelectorY.current = height();
		intsel_draw(resolutionSelectorX);
		intsel_draw(resolutionSelectorY);

		print('spritesheet size:', 5,99);
		spriteSheetSizeButtons.current = (ssget() === 16 ? 0 : 1);
		buttons_draw(spriteSheetSizeButtons);

		print('sprite size:', 5,106);
		spriteSizeButtons.current = spriteSizeButtons.options.indexOf(cellwidth());
		buttons_draw(spriteSizeButtons);

		break;
	case 'help':
		print([
			"Cartridge.js is an open source",
			"retro game engine for the web.",
			"Use it to make cool pixel-",
			"style games!",
			"Use tabs above to get started:",
			"",
			"- CRT: Save/80game.",
			"- SPR: Sprit10 editor.",
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
		var text = settings.options !== undefined ? (settings.options[i]+'').toUpperCase().substr(0,4) : ((i+1) + '');
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

	var cw = cellwidth();
	var ch = cellheight();

	rectfill(offsetX, offsetY, cw * 16, height(), 0);

	var n = spriteSheetPageSelector.current * 4 * 16;
	var viewX = 0;
	var viewY = 4 * spriteSheetPageSelector.current;
	if(ssget() === 32){
		viewX = (spriteSheetPageSelector.current % 2) * 16;
		viewY = flr(spriteSheetPageSelector.current/2) * 4;
		n = viewY * 32 + viewX;
	}
	spr(n, offsetX, offsetY, 16, 4);

	// Rectangle around the current editing sprite
	if(ssy(selectedSprite) >= viewY && ssy(selectedSprite) < viewY+ssget()){
		var x = offsetX + (ssx(selectedSprite) - viewX) * cw;
		var y = offsetY + (ssy(selectedSprite) - viewY) * ch;
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

var syntaxTree;
var syntaxTreeDirty = true;
var syntaxComments = [];
var cartridgeIdentifiers = [
	"abs",
	"alpha",
	"assert",
	"atan2",
	"btn",
	"btnp",
	"camera",
	"canvas",
	"cartridge",
	"ceil",
	"cellheight",
	"cellwidth",
	"clamp",
	"clip",
	"cls",
	"codeget",
	"codeset",
	"color",
	"cos",
	"fget",
	"fit",
	"flr",
	"fset",
	"fullscreen",
	"height",
	"load",
	"map",
	"max",
	"mget",
	"mid",
	"min",
	"mix",
	"mousebtn",
	"mousex",
	"mousey",
	"mset",
	"palget",
	"palset",
	"palt",
	"pget",
	"print",
	"pset",
	"rect",
	"rectfill",
	"rnd",
	"save",
	"sfx",
	"sget",
	"sgn",
	"sin",
	"spr",
	"sqrt",
	"sset",
	"time",
	"width",
	"inf",
	"log",
	"nan",
	"def"
];

function code_draw(code){
	var x = code.x;
	var y = code.y;
	var w = code.width();
	var h = code.height();
	var fontHeight = code.fontHeight;
	var fontWidth = code.fontWidth;
	var rows = flr(h / fontHeight);
	var cols = flr(w / fontWidth);

	// Background
	rectfill(
		x-code.margin,
		y-code.margin,
		x+w-1+code.margin,
		y+h-1+code.margin,
		code.bgColor
	);

	if(syntaxTreeDirty){
		syntaxComments.length = 0;
		try {
			syntaxTree = acorn.parse(codeget(), { onComment: syntaxComments });
		} catch(err){
			syntaxTree = { body: [] };
		}
		syntaxTreeDirty = false;
	}
	var codeArray = codeget().split('\n');

	code.crow = clamp(code.crow,0,codeArray.length-1);
	code.wrow = clamp(code.wrow,0,codeArray.length-1);
	if(code.crow < code.wrow) code.wrow = code.crow;
	if(code.crow > code.wrow + rows - 1) code.wrow = code.crow - rows + 1;
	if(code.ccol < code.wcol) code.wcol = code.ccol;
	if(code.ccol > code.wcol + cols - 1) code.wcol = code.ccol - cols + 1;

	// Highlight current row
	rectfill(
		x-code.margin,
		y-code.margin + (code.crow-code.wrow) * fontHeight,
		x+w-1+code.margin,
		y-code.margin + (code.crow-code.wrow+1) * fontHeight,
		code.currentLineBgColor
	);

	// Draw code
	var position = 0;
	for(var i=0; i<code.wrow; i++){
		var row = codeArray[i];
		position += row.length + 1;
	}
	for(var i=0; i+code.wrow < codeArray.length && h > (i+1) * fontHeight; i++){
		var row = codeArray[i + code.wrow];
		var rowY = y + i * fontHeight;
		var rowstart = position + code.wcol;
		var rowend = rowstart + (row.length - code.wcol);

		// Check if current line is in a block comment. Currently not working properly.
		var isInBlockComment = false;
		/*for(var j=0; j<syntaxComments.length; j++){
			var comment = syntaxComments[j];
			if(comment.end >= rowstart && comment.start <= rowend){
				isInBlockComment = true;
				break;
			}
		}*/
		print(row.substr(code.wcol, cols), x, rowY, isInBlockComment ? code.commentColor : code.textColor);

		// Any syntax highlighting on this row?
		var queue = syntaxTree.body.slice(0);
		queue.push.apply(queue, syntaxComments);
		while(queue.length){
			var node = queue.pop();
			if(node.end < rowstart || node.start > rowend){
				// Node not visible
				continue;
			}
			var nodeX = x + (node.start - rowstart) * fontWidth;

			switch(node.type){
				case "VariableDeclaration":
					print("var", nodeX, rowY, code.keywordColor);
					break;
				case "VariableDeclarator":
					break;
				case "Literal":
					print(node.raw, nodeX, rowY, code.literalColor);
					break;
				case "FunctionDeclaration":
					print("function", nodeX, rowY, code.keywordColor);
					break;
				case "Identifier":
					var isApi = cartridgeIdentifiers.indexOf(node.name) !== -1;
					var color = isApi ? code.apiColor : code.identifierColor;
					print(node.name, nodeX, rowY, color);
					break;
				case "ForStatement":
					print("for", nodeX, rowY, code.keywordColor);
					break;
				case "BinaryExpression":
					break;
				case "WhileStatement":
					print("while", nodeX, rowY, code.keywordColor);
					break;
				case "Line":
					print("//" + node.value, nodeX, rowY, code.commentColor);
					break;
			}
			function add(prop){
				if(!prop) return;
				if(prop instanceof acorn.Node){
					queue.push(prop);
				} else if(Array.isArray(prop)){
					prop.forEach(add);
				}
			}
			Object.values(node).forEach(add);
		}

		position += row.length + 1;
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

window._error = function(info){
	console.error(info);
	code_stop(code);

	// Handle error
	mode = 'code';
	code.ccol = info.column - 1;
	code.crow = info.line - 1;
	dirty = true;
};

function code_run(code){
	// Run code in global scope
	code.previousMode = mode;
	mode = 'run';
	code.initialized = false;

	delete window._update;
	delete window._update60;
	delete window._init;
	delete window._kill;
	delete window._draw;

	try {
		run();
		// Manually run the init
		if(window._init){
			window._init();
		}
		code.initialized = true;
	} catch(err){
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
	var oldCode = codeget();
	codeset("");
	run();
	codeset(oldCode);
	camera(0,0);
}

function code_click(code,x,y){
	if(!inrect(x,y,code.x,code.y,code.width(),code.height())){
		return false;
	}

	var codeArray = codeget().split('\n');

	code.crow = flr((y - code.y + code.wrow * code.fontHeight) / code.fontHeight);
	code.crow = clamp(code.crow, 0, codeArray.length-1);

	code.ccol = flr((x - code.x + code.wcol * code.fontWidth) / code.fontWidth);
	code_clamp_ccol(code, codeArray);

	return true;
}

function code_clamp_ccol(code, codeArray){
	if(codeArray === undefined){
		codeArray = codeget().split('\n');
	}
	code.ccol = clamp(code.ccol, 0, codeArray[code.crow].length);
}

function code_clamp_crow(code, codeArray){
	if(codeArray === undefined){
		codeArray = codeget().split('\n');
	}
	code.crow = clamp(code.crow, 0, codeArray.length-1);
}

function code_set(str){
	codeset(str);
	syntaxTreeDirty = true;
}

function code_paste(code, str){
	var codeArray = codeget().split('\n');
	var newCode = str.toLowerCase().split('\n');

	// Insert first row at current position
	var before = codeArray[code.crow].substr(0,code.ccol);
	var after = codeArray[code.crow].substr(code.ccol);

	if(newCode.length === 1){
		codeArray[code.crow] = before + newCode[0] + after;
		code.ccol += newCode[0].length;
	} else if(codeArray.length > code.crow){
		codeArray[code.crow] = before + newCode[0];
		codeArray.splice.apply(codeArray, [code.crow+1, 0].concat(newCode.slice(1,newCode.length-1)).concat(newCode[newCode.length - 1] + after));
		code.crow += newCode.length - 1;
		code.ccol = newCode[0].length;
	}

	code_set(codeArray.join('\n'));
	dirty = true;
}

function code_keydown(code, evt){

	var codeArray = codeget().split('\n');

	// Prevent tab'ing
	if(evt.which === 9) {
		codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, ' ');
		codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, ' ');
		code.ccol += 2;
		code_clamp_ccol(code, codeArray);
		evt.preventDefault();
	} else {
		switch(evt.keyCode){
		case 37: // left
			if(code.ccol === 0 && code.crow > 0){
				code.crow--;
				code.ccol = codeArray[code.crow].length;
			} else {
				var amount = 1;
				if(evt.altKey){
					var rowStr = codeArray[code.crow];
					while(code.ccol - amount > 0 && rowStr[code.ccol-amount-1].match(/[a-z\d]/)) amount++;
				}
				code.ccol -= amount;
				code_clamp_ccol(code, codeArray);
			}
			break;
		case 39: // right
			if(code.ccol === codeArray[code.crow].length && code.crow !== codeArray.length-1){
				code.ccol=0;
				code.crow++;
				code_clamp_crow(code, codeArray);
			} else {
				var amount = 1;
				if(evt.altKey){
					var rowStr = codeArray[code.crow];
					while(rowStr.length > code.ccol + amount && rowStr[code.ccol+amount].match(/[a-z\d]/)) amount++;
				}
				code.ccol += amount;
				code_clamp_ccol(code, codeArray);
			}
			break;
		case 38: // up
			code.crow--;
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 40: // down
			code.crow++;
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 8: // backspace
			if(code.ccol !== 0){
				var after = codeArray[code.crow].substr(code.ccol);
				var before = codeArray[code.crow].substr(0,code.ccol-1);
				codeArray[code.crow] = before + after;
				// Move cursor
				code.ccol--;
				code_clamp_ccol(code, codeArray);
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
			if(code.ccol !== codeArray[code.crow].length){
				var after = codeArray[code.crow].substr(code.ccol+1);
				var before = codeArray[code.crow].substr(0,code.ccol);
				codeArray[code.crow] = before + after;
			} else if(code.crow < codeArray.length-1){
				codeArray[code.crow] += codeArray[code.crow+1];
				codeArray.splice(code.crow+1,1);
			}
			break;
		case 33: // page up
			code.crow -= Math.floor(code.height() / code.fontHeight);
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 34: // page down
			code.crow += Math.floor(code.height() / code.fontHeight);
			code_clamp_crow(code, codeArray);
			code_clamp_ccol(code, codeArray);
			break;
		case 35: // end
			code.ccol = codeArray[code.crow].length;
			break;
		case 36: // home
			code.ccol = 0;
			break;
		}
	}

	code_set(codeArray.join('\n'));
}

function code_keypress(code, evt){
	var char = String.fromCharCode(evt.charCode).toUpperCase();
	var codeArray = codeget().split('\n');

	if(' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="+-{}<>!;_|&*~\'%'.indexOf(char) !== -1){
		if(char === "'") char = '"'; // temp fix until ' is supported
		char = char.toLowerCase();
		if(codeArray[code.crow] === ''){
			codeArray[code.crow] = char;
			code.ccol = 1;
		} else {
			codeArray[code.crow] = strInsertAt(codeArray[code.crow], code.ccol, char);
			code.ccol++;
			code_clamp_ccol(code, codeArray);
		}
	} else if(evt.keyCode === 11 && evt.ctrlKey){ // k - kill rest of the line
		codeArray[code.crow] = codeArray[code.crow].substr(0,code.ccol);
	} else if(evt.keyCode === 13){ // enter
		var after = codeArray[code.crow].substr(code.ccol);
		var before = codeArray[code.crow].substr(0,code.ccol);
		codeArray.splice(code.crow+1, 0, after);
		codeArray[code.crow] = before;
		// Move cursor
		code.ccol=0;
		code.crow++;
		code_clamp_crow(code, codeArray);
	}

	code_set(codeArray.join('\n'));
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

function flipSprite(spriteNumber, flipX){
	var pixels = [];
	var i,j,w=cellwidth(),h=cellheight();
	for(i=0; i<w; i++){
		for(j=0; j<h; j++){
			var x = ssx(spriteNumber)*w + i;
			var y = ssy(spriteNumber)*h + j;
			var newX = flipX ? ssx(spriteNumber)*w + w - 1 - i : x;
			var newY = flipX ? y : ssy(spriteNumber)*h + h - 1 - j;
			pixels.push(newX, newY, sget(x,y));
		}
	}
	for(i=0; i<pixels.length; i+=3){
		sset(pixels[i+0],pixels[i+1],pixels[i+2]);
	}
}

function copySprite(from,to){
	var i,j;
	for(i=0; i<cellwidth(); i++){
		for(j=0; j<cellheight(); j++){
			var x = ssx(from)*cellwidth() + i;
			var y = ssy(from)*cellheight() + j;
			var x1 = ssx(to)*cellwidth() + i;
			var y1 = ssy(to)*cellheight() + j;
			sset(x1, y1, sget(x,y));
		}
	}
}

function mod(a,b) { return ((a%b)+b)%b; }
function isMac(){ return navigator.platform.match("Mac"); }

window.addEventListener('keydown', function(evt){
	if(mode === 'run'){
		if(evt.keyCode === 27){
			code_stop(code);
			dirty = true;
		}
		return;
	}

	keysdown[evt.keyCode] = true;

	// ctrl+enter -> run game
	if(evt.keyCode === 13 && (isMac() ? evt.metaKey : evt.ctrlKey)){
		code_run(code);
		return;
	}

	if(mode === 'code'){
		code_keydown(code, evt);
	} else {
		switch(evt.keyCode){
			case 86: if(mode === 'sprite') flipSprite(selectedSprite, false); break; // V
			case 70: if(mode === 'sprite') flipSprite(selectedSprite, true); break; // F
			case 82: if(mode === 'sprite') rotateSprite(selectedSprite); break; // R
			case 46: if(mode === 'sprite') clearSprite(selectedSprite); break; // delete
			case 81: if(mode === 'sprite' || mode === 'map') selectedSprite=mod(selectedSprite-1,ssget()*ssget()); break; // Q
			case 87: if(mode === 'sprite' || mode === 'map') selectedSprite=mod(selectedSprite+1,ssget()*ssget()); break; // W
			case 32: if(mode === 'sfx') sfx(sfxSelector.current); break;
			case 83: save('game.json'); break;
			case 79: openfile(); break;
		}
		selectedSprite = clamp(selectedSprite,0,ssget()*ssget());
	}
	dirty = true;
});

document.addEventListener('keydown', function(e){
	if(mode === 'run') return;

	// Prevent ctrl + s
	if (e.keyCode == 83 && (isMac() ? e.metaKey : e.ctrlKey)){
		e.preventDefault();
	}

	// Prevent backspace
	if (mode === 'code' && e.keyCode === 8) {
		e.preventDefault();
	}

}, false);

window.addEventListener('keypress', function(evt){
	if(mode === 'run') return;
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
			load(json);
			dirty = true;
		} catch(err){
			console.error("Could not open file.");
		}
	};
	reader.readAsText(file);
}
window.addEventListener('paste', handlepaste, false);
function handlepaste (e) {
	if(mode === 'run') return;
	if (e && e.clipboardData && e.clipboardData.types && e.clipboardData.getData) {
		var types = e.clipboardData.types;
		var handled = false;

		if (((types instanceof DOMStringList) && types.contains("Files")) || (types.indexOf && types.indexOf('Files') !== -1)) {
			var data = e.clipboardData.items[0];
			if(data.kind == 'file' && data.type.match('^image/')) {
				var file = data.getAsFile();
				handlePasteImage(file);
				handled = true;
			}
		} else if (((types instanceof DOMStringList) && types.contains("text/plain")) || (types.indexOf && types.indexOf('text/plain') !== -1)) {
			var data = e.clipboardData.items[0];
			if(data.kind == 'string' && data.type.match('^text/')) {
				data.getAsString(handlePasteString);
				handled = true;
			}
		}

		if(handled){
			// Stop from actually pasting
			e.stopPropagation();
			e.preventDefault();
			return false;
		}
	}
	return true;
}

function handlePasteImage(file){
	if(mode !== 'sprite') return;

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

		for(var i=0; i<img.width && i < ssget() * cellwidth(); i++){
			for(var j=0; j<img.height && j < ssget() * cellheight(); j++){
				// Get best matching color
				var p = 4 * (i + j*img.width);
				var r = pixels[p + 0];
				var g = pixels[p + 1];
				var b = pixels[p + 2];
				var a = pixels[p + 3];

				var bestColor = 0;
				var distance = 1e10;
				for(var k=0; k<16; k++){
					var dec = palget(k);
					var dr = decToR(dec);
					var dg = decToG(dec);
					var db = decToB(dec);
					var da = palt(k) ? 0 : 255;
					var newDistance = (r-dr)*(r-dr) + (g-dg)*(g-dg) + (b-db)*(b-db) + (a-da)*(a-da);
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

		urlCreator.revokeObjectURL(img.src);
	};
	img.src = urlCreator.createObjectURL(file);
}

function handlePasteString(str){
	switch(mode){
	case 'sprite':
		var m = str.match(/sprite:([\d]+)/);
		if(m){
			copySprite(parseInt(m[1]), selectedSprite);
			dirty = true;
		}
		break;
	case 'code':
		code_paste(code, str);
		break;
	default:
		console.log('Unhandled paste string!');
		break;
	}
}

document.addEventListener('copy', function(e){
	switch(mode){
	case 'run':
		return;
	case 'sprite':
		e.clipboardData.setData('text/plain', 'sprite:'+selectedSprite);
		e.preventDefault();
		break;
	case 'code':
		e.clipboardData.setData('text/plain', codeget()); // until selection is supported
		e.preventDefault();
		break;
	}
});

cartridge({
	containerId: 'container',
	pixelPerfect: query.pixel_perfect
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

run();

if(query.file){
	loading = true;
	load(query.file);
}

window._load = function(){
	delete window._load; // only need to load once!
	loading = false;
	dirty = true;
	syntaxTreeDirty = true;
	if(query.run)
		code_run(code);
};

})();