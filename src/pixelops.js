var ctx;
var writeData = null;
var readData = null;
var width;
var height;
var pixelsQueued = 0;
var tempCanvas = null;
var tempCanvasContext = null;

exports.init = function(canvas){
	ctx = canvas.getContext('2d');
	writeData = ctx.createImageData(canvas.width, canvas.height);
	width = canvas.width;
	height = canvas.height;

	tempCanvas = document.createElement('canvas');
	tempCanvas.width = width;
	tempCanvas.height = height;
	tempCanvasContext = tempCanvas.getContext('2d');
};

exports.resize = function(canvas){
	exports.init(canvas);
};

// Call if you're going to write to the canvas.
exports.beforeChange = function(){
	readData = null;
	if(pixelsQueued !== 0){
		exports.flush();
	}
};

exports.pset = function(x,y,r,g,b){
	var p = (y * width + x) * 4;
	writeData.data[p + 0] = r;
	writeData.data[p + 1] = g;
	writeData.data[p + 2] = b;
	writeData.data[p + 3] = 255;
	pixelsQueued++;
};

exports.pget = function(x,y,out){
	var p = (y * width + x) * 4;
	if(writeData.data[p + 3] === 255){
		out[0] = writeData.data[p + 0];
		out[1] = writeData.data[p + 1];
		out[2] = writeData.data[p + 2];
	} else {
		if(!readData){
			readData = ctx.getImageData(0, 0, width, height);
		}
		out[0] = readData.data[p + 0];
		out[1] = readData.data[p + 1];
		out[2] = readData.data[p + 2];
	}
};

// call to flush all stored pixels to canvas
exports.flush = function(){
	if(pixelsQueued === 0) return;

	// write all the writeData to canvas
	var sourceX = 0;
	var sourceY = 0;
	var destX = 0;
	var destY = 0;
	tempCanvasContext.putImageData(writeData, sourceX, sourceY, destX, destY, width, height);
	ctx.drawImage(tempCanvas,0,0);

	pixelsQueued = 0;
	exports.beforeChange();

	// Reset the writeData until next time
	var data = writeData.data;
	for(var i=0; i<width; i++){
		for(var j=0; j<height; j++){
			data[(j*width + i)*4 + 3] = 0; // set alpha to zero
		}
	}
};