// === async loads: Not needed if we encode the images in arrays and draw them using ImageData ===
var spriteSheet = new Image();
var mapImage = new Image();
var fontImage = new Image();
spriteSheet.onload = function(){
	mapImage.onload = function(){
		fontImage.onload = function(){
    	initialize();
    }
    fontImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM8AAAAFAQMAAADYPCrOAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAGUExURQAAAAAAAKVnuc8AAAABdFJOUwBA5thmAAAAiklEQVQI1xXLsQkCMRgG0A8J4hhyWFg5wxUprDKF1SGZQYKFpLghQorwIZlCjkOcIhwiIfwzyL3+Qa4ySGrWWDI3yaPA6GlziwD9w+tUyTsZYpccEZzTJvVo/jPqmfm5MC7xK0WwdU71kHVRJ6b3IddjdF0ICutCj2x/tWXOw+tSReRUylnpabcH/k5GRml9ekAwAAAAAElFTkSuQmCC";
  };
  mapImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAJUExURQAAAAQAAAMAABq0FY8AAAABdFJOUwBA5thmAAAAJ0lEQVRYw+3KMQ0AMAgAMESCR4JKHPDtWdq7MdNxqsrXAQAAAPjaAiHkBPfg4mmYAAAAAElFTkSuQmCC";
};
spriteSheet.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAMAAAByFOZhAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABdUExURQAAAA/qWP+pExDrWP+oE/kGRplmAMyZMzNmM/gFRf//O/+oEhDqWPX45X0iU3wiU/gFRqpUN/X55giGUR4nVgmGUgICBPgGRvX55X0iVKpUOKlUN///Og/qVwmGUQmetpIAAAABdFJOUwBA5thmAAAAwUlEQVRYw+3PWXLDQAgEUBjACrNojZ099z+mkeXEqZTiygH6lQa+ulATCUsWITJzH51IU04p0cNVd0V7hDkzi5jbEHFXTSVrST/Ch/Xth09zra2xxeXezbUlLTG6NXc7vH+ZW/uQ+VR9tifzZ9fHpK8xvlOH7e1frsvyubD44EPvL6aap7d3LV+hu5drdM4sPI7ROIqXSOfofbt5p3M4Hrfd99uephjdL39kaxRftxH5uvXy/eu3AQAAAAAAAADg4gzcoQjX+MlqSgAAAABJRU5ErkJggg==";



// === API ===
var ctx;
var _time = 0;
var defaultColor = 0;
var camX = 0;
var camY = 0;
function cls(){ ctx.clearRect(0,0,128,128); }
function time(){ return _time / 1000; }
function color(col){ defaultColor = col; }
var sin = Math.sin;
var cos = Math.cos;
var flr = Math.floor;
function rnd(x){ return Math.random() * x; }
var abs = Math.abs;
var atan2 = Math.atan2;
var max = Math.max;
var min = Math.min;
var sgn = Math.sign; // sgn(x) -- returns argument sign: -1, 1; sgn(0) = 1;
var sqrt = Math.sqrt;
function rectfill(x0, y0, x1, y1, col){
	col = col !== undefined ? col : defaultColor;
  ctx.fillStyle = paletteHex[col];
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function camera(x, y){ // set camera position
	if(camX !== x || camY !== y){
    ctx.translate(x - camX, y - camY);
    camX = x;
    camY = y;
  }
}

// mouse
var _mousex = 0;
var _mousey = 0;
var _mousebtns = {};
function mousex(){ return _mousex; }
function mousey(){ return _mousey; }
function mousebtn(i){ return !!_mousebtns[i]; }

/*
Draw map, layers from flags, sprite 0 is empty
celx The column location of the map cell in the upper left corner of the region to draw, where 0 is the leftmost column.
cely The row location of the map cell in the upper left corner of the region to draw, where 0 is the topmost row.
sx The x coordinate of the screen to place the upper left corner.
sy The y coordinate of the screen to place the upper left corner.
celw The number of map cells wide in the region to draw.
celh The number of map cells tall in the region to draw.
layer If specified, only draw sprites that have flags set for every bit in this value (a bitfield). The default is 0 (draw all sprites).
*/
var cellsize = 8;
var mapCanvas = document.createElement('canvas');
mapCanvas.width = mapCanvas.height = 128;
function map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer){
	layer = layer !== undefined ? layer : 0;
  var _sx = cel_x * cellsize; // Clip start
  var _sy = cel_y * cellsize;
  var _x = sx; // Draw position
  var _y = sy;
  var _swidth = cel_w * cellsize; // Clip end
  var _sheight = cel_h * cellsize;
  var _width = cel_w * cellsize; // Width on target canvas
  var _height = cel_h * cellsize;
  ctx.drawImage(mapCanvas,_sx,_sy,_swidth,_sheight,_x,_y, _width, _height);
}
function spr(n, x, y, w, h, flip_x, flip_y){
	w = w !== undefined ? w : 1;
	h = h !== undefined ? h : 1;
	flip_x = flip_x !== undefined ? flip_x : false;
	flip_y = flip_y !== undefined ? flip_y : false;
  ctx.drawImage(spriteSheet, n * 8, 0, 8 * w, 8 * h, x, y, 8*w, 8*h);
}
var buttonStates = {};
var keyMap0 = {
	0: 37, // left
	2: 38, // up
	1: 39, // right
	3: 40, // down
	4: 90, // z
	5: 88 // x
};
var keyMap1 = {
	0: 83, // S
	2: 69, // E
	1: 70, // F
	3: 68, // D
	4: 65, // A
	5: 81 // Q
};
function btn(i, player){
  player = player !== undefined ? player : 1;
  var keyCode = 0;
	if(player === 1){
  	keyCode = keyMap0[i];
  } else if(player === 2){
  	keyCode = keyMap1[i];
  }
  return !!buttonStates[keyCode];
}

// === Full screen ===
function makeFullScreen() {
	if(document.fullscreenElement) return;
  var divObj = document.getElementById("container");
  //Use the specification method before using prefixed versions
  if (divObj.requestFullscreen) {
    divObj.requestFullscreen();
  } else if (divObj.msRequestFullscreen) {
    divObj.msRequestFullscreen();
  } else if (divObj.mozRequestFullScreen) {
    divObj.mozRequestFullScreen();
  } else if (divObj.webkitRequestFullscreen) {
    divObj.webkitRequestFullscreen();
  } else {
    console.error("Fullscreen API is not supported");
  }
}
function scaleToFit(element){
  var scaleX = window.innerWidth / element.width;
  var scaleY = window.innerHeight / element.height;
  var scaleToFit = Math.min(scaleX, scaleY);
  var offsetX = window.innerWidth > window.innerHeight ? (window.innerWidth - window.innerHeight) * 0.5 : 0;
  var offsetY = window.innerWidth > window.innerHeight ? 0 : (window.innerHeight - window.innerWidth) * 0.5;
	if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1){
    element.style.width = element.style.height = Math.min(window.innerWidth, window.innerHeight) + "px";
    element.style.marginLeft = (offsetX) + 'px';
  } else {
    element.style.transformOrigin = "0 0"; //scale from top left
    element.style.transform = "translate(" + offsetX + "px, " + offsetY + "px) scale(" + scaleToFit + ")";
  }
}


// === Palette ===
var palette = [
	0x000000, // 0
	0x1d2b53, // 1
  0x7e2553, // 2
  0x008751, // 3

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
  0xffccaa // 15
];
var paletteHex = [];
for(var i=0; i<palette.length; i++){
	paletteHex[i] = palette[i].toString(16);
  while(paletteHex[i].length < 6) paletteHex[i] = "0" + paletteHex[i];
  paletteHex[i] = '#' + paletteHex[i];
}


var fontX = 4;
var fontY = 5;
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="´+-';
var fontImages = [];

function print(text, x, y, col){ // TODO: how to change text color?
	x = x !== undefined ? x : 0;
 	y = y !== undefined ? y : 0;
  col = col !== undefined ? col : defaultColor;
  for(var i=0; i<text.length; i++){
  	var index = chars.indexOf(text[i]);
    if(index !== -1){
		  ctx.drawImage(
      	fontImages[col],
      	index * (fontX), 0,
        fontX, fontY,
        x + (fontX) * i, y,
        fontX, fontY
    	);
		}
	}
}

function initialize(){
  var mapCanvasContext = mapCanvas.getContext('2d');
  mapCanvasContext.fillStyle = 'green';
  mapCanvasContext.fillRect(0,0,128,128);
  var mapImageAsCanvas = document.createElement('canvas');
  mapImageAsCanvas.width = mapImage.width;
  mapImageAsCanvas.height = mapImage.height;
  mapImageAsCanvas.getContext('2d').drawImage(mapImage, 0, 0, mapImage.width, mapImage.height);
  var pixelData = mapImageAsCanvas.getContext('2d').getImageData(0, 0, mapImage.width, mapImage.height).data;
  for(var i=0; i<128; i++){
    for(var j=0; j<128; j++){
      var spriteNumber = pixelData[4 * i + 4 * 128 * j];
      mapCanvasContext.drawImage(
        spriteSheet,
        8 * spriteNumber, 0,
        8, 8,
        8 * i, 8 * j,
        8, 8
      );
    }
  }

	// Make a canvas for each palette color for the font
  var fontImageAsCanvas = document.createElement('canvas');
  fontImageAsCanvas.width = fontImage.width;
  fontImageAsCanvas.height = fontImage.height;
  fontImageAsCanvas.getContext('2d').drawImage(fontImage, 0, 0, fontImage.width, fontImage.height);
  var fontImageData = fontImageAsCanvas.getContext('2d').getImageData(0, 0, fontImage.width, fontImage.height);
  function hexToRgb(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ];
  }
  for(var i=0; i<paletteHex.length; i++){
    var coloredFontCanvas = document.createElement('canvas');
    // Replace color
    for(var j=0; j<fontImageData.data.length / 4; j++){
      if(!(
        fontImageData.data[4 * j + 0] === 0 &&
        fontImageData.data[4 * j + 1] === 0 &&
        fontImageData.data[4 * j + 2] === 0 &&
        fontImageData.data[4 * j + 3] === 0
      )){
        var rgb = hexToRgb(paletteHex[i]);
        fontImageData.data[4 * j + 0] = rgb[0];
        fontImageData.data[4 * j + 1] = rgb[1];
        fontImageData.data[4 * j + 2] = rgb[2];
      }
    }
    coloredFontCanvas.getContext('2d').putImageData(fontImageData, 0, 0);
    fontImages.push(coloredFontCanvas);
  }


  // Init canvas & animation
  var canvas = document.getElementById('myCanvas');
  ctx = canvas.getContext('2d');
  canvas.onclick = makeFullScreen;
  canvas.onmousedown = function(evt){
  	_mousebtns[evt.which] = true;
  };
  canvas.onmouseup = function(evt){
  	_mousebtns[evt.which] = false;
  };
  document.body.addEventListener('keydown', function(e){
    buttonStates[e.keyCode] = 1;
  });
  document.body.addEventListener('keyup', function(e){
    buttonStates[e.keyCode] = 0;
  });
  document.body.onmousemove = function(evt){
    var rect = canvas.getBoundingClientRect();
    var size = Math.min(rect.width, rect.height);
    var subx = 0;
    var suby = 0;
    if(rect.width > rect.height){
      subx = (rect.width - size) * 0.5;
    } else {
      suby = (rect.height - size) * 0.5;
    }
    _mousex = Math.floor((evt.clientX - rect.left - subx) / size * 128);
    _mousey = Math.floor((evt.clientY - rect.top - suby) / size * 128);
  };

  // Needed in Safari!
  ctx.mozImageSmoothingEnabled =
  ctx.webkitImageSmoothingEnabled =
  ctx.msImageSmoothingEnabled =
  ctx.imageSmoothingEnabled = false;

  document.body.onresize = document.body.mozfullscreenchange = function(){
		scaleToFit(canvas);
  };
	scaleToFit(canvas);
  var currentTime = 0;
  var t0 = 0;
  var t1 = 0;
  var dt0 = Math.floor(1 / 30 * 1000);
  var dt1 = Math.floor(1 / 60 * 1000);
  var accumulator0 = 0;
  var accumulator1 = 0;
  _init();
  function render(newTime){
    if (currentTime) {
      var frameTime = newTime - currentTime;
      if ( frameTime > 250 )
          frameTime = 250;
      accumulator0 += frameTime;
      while ( accumulator0 >= dt0 ){
        _time = t0;
        _update();
        t0 += dt0;
        accumulator0 -= dt0;
      }
      accumulator1 += frameTime;
      while ( accumulator1 >= dt1 ){
        _time = t1;
        _update60();
        t1 += dt1;
        accumulator1 -= dt1;
      }
    }
    _time = newTime;
    _draw();
    currentTime = newTime;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}