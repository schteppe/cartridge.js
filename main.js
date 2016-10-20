// === GAME ===
var x = 0, y = 0;
var x1 = 0, y1 = 0;

function _init(){}

function _update(){}

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

var fpsAverage = 0;
var prevTime = 0;
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
		spr(1, mousex(), mousey());
  } else {
  	spr(2, mousex(), mousey());
  }
}
// === GAME END ===

