var utils = require('./utils');

var fontImageAsCanvas;
var coloredFontCanvases = [];
var fontX = 4;
var fontY = 5;
var paletteHex = [];
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="a+-!{}<>;_|&*~%';
var dirty = true; // Should redraw!

exports.init = function(fontImage, palHex){
	fontImageAsCanvas = document.createElement('canvas');
	fontImageAsCanvas.width = fontImage.width;
	fontImageAsCanvas.height = fontImage.height;
	fontImageAsCanvas.getContext('2d').drawImage(fontImage, 0, 0, fontImage.width, fontImage.height);
	exports.changePalette(palHex);
};

exports.changePalette = function(palHex){
	paletteHex = palHex.slice();
	dirty = true;
};

function redrawCanvases(){
	// Make a canvas for each palette color for the font
	while(coloredFontCanvases.length < paletteHex.length){
		var coloredFontCanvas = document.createElement('canvas');
		coloredFontCanvas.width = fontImageAsCanvas.width;
		coloredFontCanvas.height = fontImageAsCanvas.height;
		coloredFontCanvases.push(coloredFontCanvas);
	}

	var fontImageData = fontImageAsCanvas.getContext('2d').getImageData(0, 0, fontImageAsCanvas.width, fontImageAsCanvas.height);
	for(var i=0; i<paletteHex.length; i++){
		// Replace color
		var data = fontImageData.data;
		for(var j=0; j<data.length/4; j++){
			if(!(
				data[4 * j + 0] === 0 &&
				data[4 * j + 1] === 0 &&
				data[4 * j + 2] === 0 &&
				data[4 * j + 3] === 0
			)){
				var rgb = utils.hexToRgb(paletteHex[i]);
				data[4 * j + 0] = rgb[0];
				data[4 * j + 1] = rgb[1];
				data[4 * j + 2] = rgb[2];
			}
		}
		var ctx = coloredFontCanvases[i].getContext('2d');
		utils.disableImageSmoothing(ctx);
		ctx.putImageData(fontImageData, 0, 0);
	}
}

exports.draw = function(ctx, text, x, y, col){
	if(dirty){
		redrawCanvases();
		dirty = false;
	}
	for(var i=0; i<text.length; i++){
		var index = chars.indexOf(text[i]);
		if(index !== -1){
			ctx.drawImage(
				coloredFontCanvases[col],
				index * (fontX), 0,
				fontX, fontY,
				x + (fontX) * i, y,
				fontX, fontY
			);
		}
	}
};

exports.load = function(callback){
	var im = new Image();
	im.onload = function(){
		callback(im);
	};
	// To decode, paste the URL below in a browser
	// To encode, use e.g. https://www.base64-image.de/
	im.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAP8AAAAFAgMAAAD3b9ImAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAJUExURQAAAAAAAAQAAIRqQRwAAAABdFJOUwBA5thmAAAAsklEQVQY0zWQsREEMQgDFRB8SOACHH4ZBCqAQAVdeKVcmS8892CPwR7QGkirvSmx1EupJY5JvqdKEpDK7IUoMJ2tdoT9vXGDLFYVM93gVFaeI5gRfgoSYJQ9My2TyLHAvvbnA3Wxu0ahRpetaWBJDowUQ4A1DVzpUMqTYO/n2S8BD8HINyPnP2GoCjPY4bo/ASZ5Ce59XeDIGF5tdXYtdi6T6ljMiqwp8QxGF+8MUvvxDH5Q4jvxySaSSgAAAABJRU5ErkJggg==";
};