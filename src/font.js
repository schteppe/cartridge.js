var utils = require('./utils');

var fontImages = [];
var fontX = 4;
var fontY = 5;
var paletteHex = [];
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="´+-';

exports.init = function(fontImage, palette){
	for(var i=0; i<palette.length; i++){
		paletteHex[i] = palette[i].toString(16);
		// left pad
		while(paletteHex[i].length < 6){
			paletteHex[i] = "0" + paletteHex[i];
		}
		paletteHex[i] = '#' + paletteHex[i];
	}

	// Make a canvas for each palette color for the font
	var fontImageAsCanvas = document.createElement('canvas');
	fontImageAsCanvas.width = fontImage.width;
	fontImageAsCanvas.height = fontImage.height;
	fontImageAsCanvas.getContext('2d').drawImage(fontImage, 0, 0, fontImage.width, fontImage.height);
	var fontImageData = fontImageAsCanvas.getContext('2d').getImageData(0, 0, fontImage.width, fontImage.height);
	for(var i=0; i<paletteHex.length; i++){
		var coloredFontCanvas = document.createElement('canvas');
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
		coloredFontCanvas.getContext('2d').putImageData(fontImageData, 0, 0);
		fontImages.push(coloredFontCanvas);
	}
};

exports.draw = function(ctx, text, x, y, col){
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
};