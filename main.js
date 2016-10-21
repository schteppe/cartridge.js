// Init
cartridge('container');

// Go fullscreen on click
click(fullscreen);

// Resize (fit) the canvas when the container changes size
document.body.onresize = document.body.mozfullscreenchange = function(){
	fit();
};

var fpsAverage = 0;
var prevTime = 0;
var x = 0, y = 0;
var x1 = 0, y1 = 0;

// Called before the first render frame.
function _init(){}

// Called at 30Hz
function _update(){}

// Called at 60Hz
function _update60(){
	if (btn(0,1)) x--;
	if (btn(1,1)) x++;
	if (btn(2,1)) y--;
	if (btn(3,1)) y++;
	if (btn(0,2)) x1--;
	if (btn(1,2)) x1++;
	if (btn(2,2)) y1--;
	if (btn(3,2)) y1++;
}

// Called each render frame
function _draw(){
	rectfill(0, 0, 128, 128, 7);
	map(0, 0, 0, 40, 4, 4, 0);
	for(var i=0; i<5; i++){
		print('HELLO'[i], i * 4 + 64 - 5/2 * 4, 10 + flr(5 + 5*sin(i + 5 * time())), flr(10*time()) % 16);
	}
	var fps = 1 / (time() - prevTime);
	fpsAverage = fps * 0.2 + 0.8 * fpsAverage;
	print((fpsAverage + "").substr(0,5) + ' FPS', 1, 1);
	prevTime = time();
	spr(0, x + 20, y + 20);
	if(mousebtn(1)){
		spr(1, mousex(), mousey(), 1, 1, false, flr(time()) % 2 === 0);
	} else {
		spr(2, mousex(), mousey(), 1, 1, false, flr(time()) % 2 === 0);
	}
}