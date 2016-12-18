var utils = require('./utils');

var fontImageAsCanvas;
var coloredFontCanvases = [];
var fontX = 4;
var fontY = 5;
var paletteHex = [];
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="a+-!{}<>;_|&*~%';
var specialChars = "\x80\x81\x82\x83\x83\x84\x85\x86\x87\x88\x89\x8a\x8b\x8c\x8d\x8e\x8f\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99";
var dirty = true; // Should redraw!

exports.init = function(palHex){
	var chars = [
		"### ###  ## ##  ### ###  ## # # ### ### # # #   ### ##   ## ###  #  ###  ## ### # # # # # # # # # # ### ### ##  ### ### # # ### #   ### ### ###          #  ###  #   #  ##   ##       # #       # #  #           #   ## ##    # #            #   ## # #     # #",
		"# # # # #   # # #   #   #   # #  #   #  # # #   ### # # # # # # # # # # #    #  # # # # # # # # # #   # # #  #    #   # # # #   #     # # # # #         # #   # #     # #     #  #   #   #  ### # # #    #       #   #   #   #   #    #      #  #    #    #   #",
		"### ##  #   # # ##  ##  #   ###  #   #  ##  #   # # # # # # ### # # ##  ###  #  # # # # # #  #  ###  #  # #  #  ###  ## ### ### ###   # ### ###              ## #     # #     #      #   #              ### ###  #  #     # #     #          #   #  ### ###  # ",
		"# # # # #   # # #   #   # # # #  #   #  # # #   # # # # # # #   ##  # #   #  #  # # ### ### # #   # #   # #  #  #     #   #   # # #   # # #   #      #          #     # #     #  #   #   #  ###          #           #   #   #   #    #      #  # #  #  #   #  ",
		"# # ###  ## ### ### #   ### # # ### ##  # # ### # # # # ##  #    ## # # ##   #   ##  #  ### # # ### ### ### ### ### ###   # ### ###   # ###   #  #  #        #   #   #  ##   ##     #     #                      #   ## ##    # #    #  ###  #  ### # #     # #"
	];
	var width = chars[0].length;
	var height = chars.length;
	fontImageAsCanvas = document.createElement('canvas');
	fontImageAsCanvas.width = width;
	fontImageAsCanvas.height = height;
	var ctx = fontImageAsCanvas.getContext('2d');
	var imageData = ctx.createImageData(width, height);
	for(var i=0; i<height; i++){
		for(var j=0; j<width; j++){
			var p = 4 * (i * width + j);
			imageData.data[p+3] = (chars[i][j] === '#') ? 255 : 0;
		}
	}
	ctx.putImageData(imageData, 0, 0);
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
