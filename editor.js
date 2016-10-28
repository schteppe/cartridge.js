var mode = 0; // 0=sprite, 1=map
var selectedSprite = 0;
var spritePage = 0;
var color = 8;
var offsetX = 1;
var offsetY = 7;
var scaleX = 9;
var scaleY = 9;
var dirty = true;
var lastmx = 0;
var lastmy = 0;
var paletteX = 79;
var paletteY = 7;
var paletteScaleX = 12;
var paletteScaleY = 12;
var flagsX = paletteX;
var flagsY = paletteY+paletteScaleY*4+1;
var buttonsX = 72;
var buttonsY = 96-8+1;
var keysdown = {};

var mapPanX = 0;
var mapPanY = 0;

cartridge({
	containerId: 'container',
	palette: [
		0x000000, // 0
		0x000053, // 1
		0x7e2500, // 2
		0x008000, // 3

		0xab5236, // 4
		0x5f574f, // 5
		0xc2c3c7, // 6
		0xfff1e8, // 7

		0xff004d, // 8
		0xffa300, // 9
		0xfff024, // 10
		0x00e756, // 11

		0x29adff, // 12
		0x83769c, // 13
		0xff77a8, // 14
		0xffffff  // 15
	]
});

function ssx(n){ return n % 16; }
function ssy(n){ return Math.floor(n / 16) % (16 * 16); }

function mousemovehandler(forceMouseDown){
	if(mode === 0){
		if(mousebtn(1)){
			var x = flr((mousex()-offsetX) / scaleX);
			var y = flr((mousey()-offsetY) / scaleY);

			// Within editing sprite?
			if(x < 8 && x >= 0 && y < 8 && y >= 0){
				sset(
					ssx(selectedSprite)*8 + x,
					ssy(selectedSprite)*8 + y,
					color
				);
				dirty = true;
			}
		}
	} else {
		if(keysdown[32] || mousebtn(2)){
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
		} else if((forceMouseDown || mousebtn(1)) && mousey() < 96){
			mset(
				flr((mousex() - mapPanX) / 8),
				flr((mousey() - mapPanY) / 8),
				selectedSprite
			);
			dirty = true;
		}
	}
}

function inrect(x,y,rx,ry,rw,rh){
	return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
}

function clickhandler(){
	var mx = mousex();
	var my = mousey();
	mousemovehandler(true);
	if(mode === 0){
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
	} else {
		// map
	}

	if(my>=96){
		var spriteX = flr(mx / 8);
		var spriteY = spritePage * 4 + flr((my-96) / 8);
		selectedSprite = spriteX + spriteY * 16;
		dirty = true;
	} else if(inrect(mx,my,buttonsX,buttonsY,4*14,10)){
		var button = flr((mx-buttonsX) / 14);
		spritePage = button;
		dirty = true;
	}
}
click(clickhandler);

function _load(callback){
	load('game');
	callback();
};

function _init(){}

function _update60(){
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

	rectfill(0, 0, 128, 128, 7);
	if(mode === 0){
		drawviewport(offsetX,offsetY,scaleX,scaleY);
		drawsprites(0,96);
		drawpalette(paletteX, paletteY, paletteScaleX, paletteScaleY);
		drawbuttons(buttonsX, buttonsY);
		drawflags(flagsX,flagsY,fget(selectedSprite));
		print('SPRITE ' + selectedSprite, 1, 1);
	} else {
		map(0, 0, mapPanX, mapPanY, 128, 32);
		drawsprites(0,96);
		drawbuttons(buttonsX, buttonsY);
	}
	drawmouse(mousex(), mousey());
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
	for(var i=0; i<8; i++){
		for(var j=0; j<8; j++){
			var x = (ssx(selectedSprite) * 8 + i) % 128;
			var y = (ssy(selectedSprite) * 8 + j) % 128;
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
	rectfill(offsetX, offsetY, 128, 128, 0);
	var n=spritePage*4*16;
	for(var j=0; j<4; j++){
		for(var i=0; i<16; i++){
			spr(n, i*8+offsetX, j*8+offsetY);
			n++;
		}
	}
	// Rectangle around the current editing sprite
	if(ssy(selectedSprite)/4 >= spritePage && ssy(selectedSprite)/4 < spritePage+1){
		var x = offsetX + ssx(selectedSprite) * 8;
		var y = offsetY + ssy(selectedSprite) * 8 - spritePage * 4 * 8;
		rect(
			x-1, y-1,
			x+8, y+8,
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
				rect(rx, ry, rw, rh, 0);
			}
			n++;
		}
	}
}

window.onkeyup = function(evt){
	keysdown[evt.keyCode] = false;
};

window.onkeydown = function(evt){
	keysdown[evt.keyCode] = true;
	var key = String.fromCharCode(evt.keyCode).toLowerCase();
	switch(key){
		case 's': mode = mode ? 0 : 1; break;
	}
	dirty = true;
};