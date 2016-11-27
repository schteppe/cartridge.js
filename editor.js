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

var mode = 0;
var numModes = 3;
var SPRITE = 0;
var MAP = 1;
var SFX = 2;

var selectedSprite = 1; // Because zero is "empty sprite"
var currentSoundEffect = 0;
var spritePage = 0;
var color = 8;
var offsetX = 1;
var offsetY = 8;
var dirty = true;
var lastmx = 0;
var lastmy = 0;
var keysdown = {};

var mapPanX = 0;
var mapPanY = 0;

var scaleX = flr((width() * 0.5) / cellwidth());
var scaleY = flr((height() * 0.5) / cellheight());
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
	if(mode === SPRITE){
		if(mousebtn(1) || forceMouseDown){
			var x = flr((mousex()-offsetX) / scaleX);
			var y = flr((mousey()-offsetY) / scaleY);

			// Within editing sprite?
			if(x < cellwidth() && x >= 0 && y < cellheight() && y >= 0){
				sset(
					ssx(selectedSprite) * cellwidth() + x,
					ssy(selectedSprite) * cellheight() + y,
					color
				);
				dirty = true;
			}
		}
	} else if(mode === MAP) {
		if(keysdown[32] || mousebtn(2) || mousebtn(3)){
			var dx = mousex() - lastmx;
			var dy = mousey() - lastmy;
			mapPanX += dx;
			mapPanY += dy;

			// TODO: clamp panning
			/*mapPanX = min(128*8,mapPanX);
			mapPanX = max(0,mapPanX);
			mapPanY = max(0,mapPanY);
			mapPanX = min(128,mapPanX);
			mapPanY = min(32,mapPanY);*/
			dirty = true;
		} else if((forceMouseDown || mousebtn(1)) && mousey() < buttonsY && mousey() > 8){
			mset(
				flr((mousex() - mapPanX) / cellwidth()),
				flr((mousey() - mapPanY) / cellheight()),
				selectedSprite
			);
			dirty = true;
		}
	} else if(mode === SFX){
		if(mousebtn(1) || forceMouseDown){
			var n = flr(mousex() / width() * 32);
			var pitch = flr((pitchesH - mousey() + pitchesY) / pitchesH * 255);
			var vol = flr((volumesH - mousey() + volumesY) / volumesH * 255);

			// Within editing area?
			if(mid(0,n,32) === n && mid(0,pitch,255) === pitch){
				afset(
					currentSoundEffect,
					n,
					pitch
				);
				awset(
					currentSoundEffect,
					n,
					4
				);
				dirty = true;
			} else if(mid(0,n,32) === n && mid(0,vol,255) === vol){
				avset(
					currentSoundEffect,
					n,
					vol
				);
			}
		}
	}
}

function clickhandler(){
	var mx = mousex();
	var my = mousey();
	mousemovehandler(true);
	if(mode === SPRITE){
		// sprite
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
	} else if(mode === MAP){
		// map
	}

	// Sprite select
	if(mode === SPRITE || mode === MAP){
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
		mode = (mode + 1) % numModes;
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
	if(mode === SPRITE){
		drawviewport(offsetX,offsetY,scaleX,scaleY);
		drawsprites(0,height() - cellheight() * 4);
		drawpalette(paletteX, paletteY, paletteScaleX, paletteScaleY);
		drawbuttons(buttonsX, buttonsY);
		drawflags(flagsX,flagsY,fget(selectedSprite));
	} else if(mode === MAP){
		map(0, 0, mapPanX, mapPanY, 128, 32);
		rect(mapPanX, mapPanY, mapPanX+cellwidth()*128, mapPanY+cellheight()*32, 0);
		drawsprites(0,height() - cellheight() * 4);
		drawbuttons(buttonsX, buttonsY);
	} else if(mode === SFX){
		drawpitches(pitchesX, pitchesY, pitchesW, pitchesH, 0);
		drawpitches(volumesX, volumesY, volumesW, volumesH, 1);
	}

	drawtop();
	canvas(1);
	cls();
	drawmouse(mousex(), mousey());
	canvas(0);
}

function drawtop(){
	rectfill(0, 0, width(), 6, 0);
	var modeText = '';
	switch(mode){
		case SPRITE: modeText = 'SPRITE'; break;
		case MAP: modeText = 'MAP'; break;
		case SFX: modeText = 'SFX'; break;
	}
	print(modeText, 1, 1, 15);
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

function drawviewport(offsetX, offsetY, scaleX, scaleY){
	for(var i=0; i<cellwidth(); i++){
		for(var j=0; j<cellheight(); j++){
			var x = (ssx(selectedSprite) * cellwidth() + i) % width();
			var y = (ssy(selectedSprite) * cellheight() + j) % height();
			var col = sget(x, y);
			rectfill(
				offsetX + i * scaleX,
				offsetY + j * scaleY,
				offsetX + (i+1) * scaleX-1,
				offsetY + (j+1) * scaleY-1,
				col
			);
		}
	}
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
		case 32: if(mode === SFX) sfx(currentSoundEffect); break;
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
