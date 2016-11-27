cartridge({
	containerId: 'container',
	layers: 2,
	width: 256,
	height: 240,
	cellwidth: 16,
	cellheight: 16,
	palette: [
		0x000000, // 0
		0x0829fc, // 1
		0x7e2500, // 2
		0x008000, // 3
		0xab5236, // 4
		0x5f574f, // 5
		0xc2c3c7, // 6
		0xfff1e8, // 7
		0xe40405, // 8
		0xffa300, // 9
		0xfff024, // 10
		0x00e756, // 11
		0x8bf9fc, // 12
		0x83769c, // 13
		0xff8e7d, // 14
		0xffffff  // 15
	]
});

document.body.onresize = document.body.mozfullscreenchange = fit;

var modes = ['sprite', 'map', 'sfx'];
var mode = modes[0];

var selectedSprite = 1; // Because zero is "empty sprite"
var currentSoundEffect = 0;
var spritePage = 0;
var color = 8;
var dirty = true;
var lastmx = 0;
var lastmy = 0;
var keysdown = {};

var viewport = {
	x: 1,
	y: 8,
	sx: flr((width() * 0.5) / cellwidth()),
	sy: flr((height() * 0.5) / cellheight()),
	draw: function(){
		for(var i=0; i<cellwidth(); i++){
			for(var j=0; j<cellheight(); j++){
				var x = (ssx(selectedSprite) * cellwidth() + i) % width();
				var y = (ssy(selectedSprite) * cellheight() + j) % height();
				var col = sget(x, y);
				rectfill(
					this.x + i * this.sx,
					this.y + j * this.sy,
					this.x + (i+1) * this.sx-1,
					this.y + (j+1) * this.sy-1,
					col
				);
			}
		}
	}
};

var mapPanX = 0;
var mapPanY = 0;

var paletteScaleX = flr((width() * 0.4) / 4);
var paletteScaleY = flr((height() * 0.4) / 4);
var paletteX = width() - paletteScaleX * 4 - 1;
var paletteY = 8;

var flagsX = paletteX;
var flagsY = paletteY + paletteScaleY * 4 + 1;

var buttonsX = width() - 56;
var buttonsY = height() - 4 * cellheight() - 7;

var pitchesX = 0;
var pitchesY = 14;
var pitchesW = width();
var pitchesH = flr(height() / 2);

var volumesX = pitchesX;
var volumesY = pitchesY + pitchesH + 2;
var volumesW = pitchesW;
var volumesH = flr(height() / 6);

// Helpers
function ssx(n){ return n % 16; }
function ssy(n){ return Math.floor(n / 16) % (16 * 16); }
function inrect(x,y,rx,ry,rw,rh){ return x >= rx && y >= ry && x < rx + rw && y < ry + rh; }

function mousemovehandler(forceMouseDown){
	switch(mode){
	case 'sprite':
		if(mousebtn(1) || forceMouseDown){
			// Draw on sprite
			var x = flr((mousex()-viewport.x) / viewport.sx);
			var y = flr((mousey()-viewport.y) / viewport.sy);
			if(inrect(x, y, 0, 0, cellwidth(), cellheight())){
				sset(
					ssx(selectedSprite) * cellwidth() + x,
					ssy(selectedSprite) * cellheight() + y,
					color
				);
				dirty = true;
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
		} else if((forceMouseDown || mousebtn(1)) && inrect(mousex(), mousey(), 0, 8, width(), buttonsY-9)){
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
		if(mousebtn(1) || forceMouseDown){
			var n = flr(mousex() / width() * 32);
			var pitch = flr((pitchesH - mousey() + pitchesY) / pitchesH * 255);
			var vol = flr((volumesH - mousey() + volumesY) / volumesH * 255);

			// Within editing area?
			if(clamp(n,0,32) === n && clamp(pitch,0,255) === pitch){
				afset(currentSoundEffect, n, pitch);
				awset(currentSoundEffect, n, 4); // TODO: waveform select
				dirty = true;
			} else if(clamp(n,0,32) === n && clamp(vol,0,255) === vol){
				avset(currentSoundEffect, n, vol);
				dirty = true;
			}
		}
		break;
	}
}

function clickhandler(){
	var mx = mousex();
	var my = mousey();
	mousemovehandler(true);
	if(mode === 'sprite'){
		if(inrect(mx,my,paletteX,paletteY,paletteScaleX*4,paletteScaleY*4)){
			var x = flr((mx-paletteX) / paletteScaleX);
			var y = flr((my-paletteY) / paletteScaleY);
			color = x + 4 * y;
			dirty = true;
		} else if(inrect(mx,my,flagsX,flagsY,6*8,5)){
			var flagIndex = flr((mx-flagsX) / 6);
			var oldFlags = fget(selectedSprite);
			var clickedFlag = (1 << flagIndex);
			var newFlags = (oldFlags & clickedFlag) ? (oldFlags & (~clickedFlag)) : (oldFlags | clickedFlag);
			fset(selectedSprite, newFlags);
			dirty = true;
		}
	}

	// Sprite select
	if(mode === 'sprite' || mode === 'map'){
		var spritesHeight = height() - cellheight() * 4;
		if(my >= height() - cellheight() * 4){
			var spriteX = flr(mx / cellwidth());
			var spriteY = spritePage * 4 + flr((my-spritesHeight) / cellheight());
			selectedSprite = spriteX + spriteY * 16;
			dirty = true;
		} else if(inrect(mx,my,buttonsX,buttonsY,4*14,10)){
			var button = flr((mx-buttonsX) / 14);
			spritePage = button;
			dirty = true;
		}
	}

	// Click the upper left corner - switch mode
	if(inrect(mx,my,0,0,32,8)){
		mode = modes[(modes.indexOf(mode) + 1) % modes.length];
		dirty = true;
	}
}
click(clickhandler);

function _load(callback){
	load();
	callback();
}

function _draw(){
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
	switch(mode){
	case 'sprite':
		viewport.draw();
		drawsprites(0,height() - cellheight() * 4);
		drawpalette(paletteX, paletteY, paletteScaleX, paletteScaleY);
		drawbuttons(buttonsX, buttonsY);
		drawflags(flagsX,flagsY,fget(selectedSprite));
		break;
	case 'map':
		map(0, 0, mapPanX, mapPanY, 128, 32);
		rect(mapPanX, mapPanY, mapPanX+cellwidth()*128, mapPanY+cellheight()*32, 0);
		drawsprites(0,height() - cellheight() * 4);
		drawbuttons(buttonsX, buttonsY);
		break;
	case 'sfx':
		drawpitches(pitchesX, pitchesY, pitchesW, pitchesH, 0);
		drawpitches(volumesX, volumesY, volumesW, volumesH, 1);
		break;
	}

	drawtop();
	canvas(1);
	cls();
	drawmouse(mousex(), mousey());
	canvas(0);
}

function drawtop(){
	rectfill(0, 0, width(), 6, 0);
	print(mode.toUpperCase(), 1, 1, 15);
}

function drawbuttons(x,y){
	var padding = 4;
	for(var i=0; i<4; i++){
		rectfill(
			x + i * (6 + padding*2), y,
			x+5+padding*2 + i * (6+padding*2)-1, y+6,
			spritePage === i ? 0 : 6
		);
		print('' + (i+1), x+1+padding + i * (6+padding*2), y+1, spritePage === i ? 6 : 0);
	}
}

function drawflags(x,y,flags){
	var size = 3;
	for(var i=0; i<8; i++){
		var rx = x + i * (size+3);
		var ry = y;
		var qx = x+(1+size) + i * (3+size);
		var qy = y+1+size;
		if((flags & (1 << i)) !== 0)
			rectfill(rx, ry, qx, qy, 0);
		else
			rect(rx, ry, qx, qy, 0);
	}
}

function drawmouse(x,y){
	rectfill(x-4, y, x+4, y);
	rectfill(x, y-4, x, y+4);
	rectfill(x, y, x, y, 4);
}

function drawsprites(offsetX, offsetY){
	rectfill(offsetX, offsetY, width(), height(), 0);
	var n=spritePage*4*16;
	for(var j=0; j<4; j++){
		for(var i=0; i<16; i++){
			spr(n, i*cellwidth()+offsetX, j*cellheight()+offsetY);
			n++;
		}
	}
	// Rectangle around the current editing sprite
	if(ssy(selectedSprite)/4 >= spritePage && ssy(selectedSprite)/4 < spritePage+1){
		var x = offsetX + ssx(selectedSprite) * cellwidth();
		var y = offsetY + ssy(selectedSprite) * cellheight() - spritePage * 4 * cellheight();
		rect(
			x-1, y-1,
			x+cellwidth(), y+cellheight(),
			6
		);
	}
}

function drawpalette(x, y, sx, sy){
	var n=0;
	for(var j=0; j<4; j++){
		for(var i=0; i<4; i++){
			var rx = x+i*sx;
			var ry = y+j*sy;
			var rw = x+(i+1)*sx-1;
			var rh = y+(j+1)*sy-1;
			rectfill(rx, ry, rw, rh, n);
			if(color === n){
				rect(rx, ry, rw, rh, color === 0 ? 7 : 0);
			}
			n++;
		}
	}
}

function drawpitches(x, y, w, h, source){
	var pitchWidth = flr(w / 32);
	for(var i=0; i<32; i++){
		var x0 = x + i * pitchWidth + 1;
		var y0 = y + h - 1;
		var value = source === 1 ? (avget(currentSoundEffect,i) / 255) : (afget(currentSoundEffect,i) / 255);
		var pitch = flr(value * h);
		rectfill(x0, y0 - pitch, x0 + pitchWidth - 2, y0, 1);
	}
}

window.onkeyup = function(evt){
	keysdown[evt.keyCode] = false;
};

window.onkeydown = function(evt){
	keysdown[evt.keyCode] = true;
	switch(evt.keyCode){
		case 32: if(mode === 'sfx') sfx(currentSoundEffect); break;
		case 83: save('game.json'); break;
		case 79: openfile(); break;
	}
	dirty = true;
};

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
