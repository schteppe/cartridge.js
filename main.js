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

// Use to load stuff
function _load(callback){
	spriteSheetImage = new Image();
	mapImage = new Image();
	fontImage = new Image();
	spriteSheetImage.onload = function(){
		mapImage.onload = function(){
			fontImage.onload = function(){

				// Load the sprite sheet
				var spriteSheetCanvas = document.createElement('canvas');
				spriteSheetCanvas.width = 128;
				spriteSheetCanvas.height = 128;
				spriteSheetCanvas.getContext('2d').drawImage(spriteSheetImage, 0, 0, spriteSheetImage.width, spriteSheetImage.height);
				var spriteSheetPixelData = spriteSheetCanvas.getContext('2d').getImageData(0, 0, spriteSheetCanvas.width, spriteSheetCanvas.height).data;
				for(var i=0; i<128; i++){
					for(var j=0; j<128; j++){
						var alpha = spriteSheetPixelData[4 * (j * 128 + i) + 3];
						var red = spriteSheetPixelData[4 * (j * 128 + i)];
						if(alpha){
							sset(i,j,red);
						}
					}
				}

				// Load the data into the map
				var mapImageCanvas = document.createElement('canvas');
				mapImageCanvas.width = 128;
				mapImageCanvas.height = 32;
				mapImageCanvas.getContext('2d').drawImage(mapImage, 0, 0, mapImage.width, mapImage.height);
				var mapPixelData = mapImageCanvas.getContext('2d').getImageData(0, 0, mapImageCanvas.width, mapImageCanvas.height).data;
				for(var i=0; i<128; i++){
					for(var j=0; j<32; j++){
						var red = mapPixelData[4 * (j * 128 + i)];
						var alpha = mapPixelData[4 * (j * 128 + i) + 3];
						if(alpha){
							mset(i,j,red);
						}
					}
				}

				save('game');
				load('game');

				callback();
			}
			fontImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM8AAAAFAQMAAADYPCrOAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAGUExURQAAAAAAAKVnuc8AAAABdFJOUwBA5thmAAAAiklEQVQI1xXLsQkCMRgG0A8J4hhyWFg5wxUprDKF1SGZQYKFpLghQorwIZlCjkOcIhwiIfwzyL3+Qa4ySGrWWDI3yaPA6GlziwD9w+tUyTsZYpccEZzTJvVo/jPqmfm5MC7xK0WwdU71kHVRJ6b3IddjdF0ICutCj2x/tWXOw+tSReRUylnpabcH/k5GRml9ekAwAAAAAElFTkSuQmCC";
		};
		mapImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAgMAAAC+UIlYAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAJUExURQAAAAQAAAMAABq0FY8AAAABdFJOUwBA5thmAAAAJ0lEQVRYw+3KMQ0AMAgAMESCR4JKHPDtWdq7MdNxqsrXAQAAAPjaAiHkBPfg4mmYAAAAAElFTkSuQmCC";
	};
	spriteSheetImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAMAAAByFOZhAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABdUExURQAAAA/qWP+pExDrWP+oE/kGRplmAMyZMzNmM/gFRf//O/+oEhDqWPX45X0iU3wiU/gFRqpUN/X55giGUR4nVgmGUgICBPgGRvX55X0iVKpUOKlUN///Og/qVwmGUQmetpIAAAABdFJOUwBA5thmAAAAwUlEQVRYw+3PWXLDQAgEUBjACrNojZ099z+mkeXEqZTiygH6lQa+ulATCUsWITJzH51IU04p0cNVd0V7hDkzi5jbEHFXTSVrST/Ch/Xth09zra2xxeXezbUlLTG6NXc7vH+ZW/uQ+VR9tifzZ9fHpK8xvlOH7e1frsvyubD44EPvL6aap7d3LV+hu5drdM4sPI7ROIqXSOfofbt5p3M4Hrfd99uephjdL39kaxRftxH5uvXy/eu3AQAAAAAAAADg4gzcoQjX+MlqSgAAAABJRU5ErkJggg==";
};

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
	spr(1, mousex(), mousey(), 1, 1, mousebtn(1), flr(time()) % 2 === 0);
}