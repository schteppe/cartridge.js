var editSprite = 0;
var spritePage = 0;
var color = 8;
var offsetX = 1;
var offsetY = 7;
var scaleX = 8;
var scaleY = 8;
var dirty = true;
var lastmx = 0;
var lastmy = 0;

cartridge('container');
document.body.onresize = document.body.mozfullscreenchange = function(){
	fit();
};

function ssx(n){
	return n % 16;
}

function ssy(n){
	return Math.floor(n / 16) % (16 * 16);
}

function handler(){
	if(!mousebtn(1)) return;

	var x = flr((mousex()-offsetX) / scaleX);
	var y = flr((mousey()-offsetY) / scaleY);

	// Within editing sprite?
	if(x < 8 && x >= 0 && y < 8 && y >= 0){
		sset(
			ssx(editSprite)*8 + x,
			ssy(editSprite)*8 + y,
			color
		);
		dirty = true;
	}
}

function clickhandler(){
	var mx = mousex();
	var my = mousey();
	if(my>=96){
		var spriteX = flr(mx / 8);
		var spriteY = spritePage * 4 + flr((my-96) / 8);
		editSprite = spriteX + spriteY * 16;
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
	handler();
	var mx = mousex();
	var my = mousey();
	if(!(lastmx === mx && lastmy === my)) dirty = true;
	lastmx = mx;
	lastmy = my;

	if(!dirty) return;
	dirty = false;

	rectfill(0, 0, 128, 128, 7);
	drawviewport(offsetX,offsetY,scaleX,scaleY);
	drawsprites(0,96);
	drawmouse(mousex(), mousey());
	print('SPRITE ' + editSprite, 1, 1);
}

function drawmouse(x,y){
	rectfill(x-4, y, x+5, y+1);
	rectfill(x, y-4, x+1, y+5);
}

function drawviewport(offsetX, offsetY, scaleX, scaleY){
	for(var i=0; i<8; i++){
		for(var j=0; j<8; j++){
			var x = (ssx(editSprite) * 8 + i) % 128; // wrong!
			var y = (ssy(editSprite) * 8 + j) % 128;
			var col = sget(x, y);
			rectfill(
				offsetX + i * scaleX,
				offsetY + j * scaleY,
				offsetX + (i+1) * scaleX,
				offsetY + (j+1) * scaleY,
				col
			);
		}
	}
}

function drawsprites(offsetX, offsetY){
	var n=0;
	for(var j=0; j<4; j++){
		for(var i=0; i<16; i++){
			spr(n++, i*8+offsetX, j*8+offsetY);
		}
	}
	var x = offsetX + ssx(editSprite) * 8;
	var y = offsetY + ssy(editSprite) * 8;
	rect(
		x-1,
		y-1,
		x + 8,
		y + 8,
		6
	);
}