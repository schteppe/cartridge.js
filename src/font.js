var utils = require('./utils');

var coloredFontCanvases = [];
var coloredSpecialCharsCanvases = [];
var fontX = 4;
var fontY = 5;
var paletteHex = [];
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="a+-!{}<>;_|&*~%';
var specialChars = "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x8b\x8c\x8d\x8e\x8f\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99";
var dirty = true; // Should redraw!

exports.init = function(palHex){
	exports.changePalette(palHex);
};

exports.changePalette = function(palHex){
	paletteHex = palHex.slice();
	dirty = true;
};

function redrawCanvases(){
	var backgroundColor = [0,0,0,0];
	for(var i=0; i<paletteHex.length; i++){
		var rgba = utils.hexToRgb(paletteHex[i]);
		rgba[3] = 255;

		var colorMap = {
			'#': rgba,
			' ': backgroundColor
		};

		// Normal font
		coloredFontCanvases[i] = utils.createCanvasFromAscii([
			"### ###  ## ##  ### ###  ## # # ### ### # # #   ### ##   ## ###  #  ###  ## ### # # # # # # # # # # ### ### ##  ### ### # # ### #   ### ### ###          #  ###  #   #  ##   ##       # #       # #  #           #   ## ##    # #            #   ## # #     # #",
			"# # # # #   # # #   #   #   # #  #   #  # # #   ### # # # # # # # # # # #    #  # # # # # # # # # #   # # #  #    #   # # # #   #     # # # # #         # #   # #     # #     #  #   #   #  ### # # #    #       #   #   #   #   #    #      #  #    #    #   #",
			"### ##  #   # # ##  ##  #   ###  #   #  ##  #   # # # # # # ### # # ##  ###  #  # # # # # #  #  ###  #  # #  #  ###  ## ### ### ###   # ### ###              ## #     # #     #      #   #              ### ###  #  #     # #     #          #   #  ### ###  # ",
			"# # # # #   # # #   #   # # # #  #   #  # # #   # # # # # # #   ##  # #   #  #  # # ### ### # #   # #   # #  #  #     #   #   # # #   # # #   #      #          #     # #     #  #   #   #  ###          #           #   #   #   #    #      #  # #  #  #   #  ",
			"# # ###  ## ### ### #   ### # # ### ##  # # ### # # # # ##  #    ## # # ##   #   ##  #  ### # # ### ### ### ### ### ###   # ### ###   # ###   #  #  #        #   #   #  ##   ##     #     #                      #   ## ##    # #    #  ###  #  ### # #     # #"
		], colorMap);

		// Special chars
		coloredSpecialCharsCanvases[i] = utils.createCanvasFromAscii([
			"####### # # # # #     #  #####  #   #     #      ###    ## ##    ###     ###     ###    #####  #######    ###   #####     #             #####     #     #####   #####                   #####  ####### # # # # ",
			"#######  # # #  ####### ##   ##   #   #   ####  ### #   #####   ## ##    ###    #####  ###  ## # ### #    #    ##   ##   ###           ##  ###   ###     ###   ### ### # #     #   #   ## # ##         # # # # ",
			"####### # # # # # ### # ##   ## #   #     ###   #####   #####  ### ###  #####  ####### ##   ## #######    #    ## # ##  #####  # # # # ##   ## #######    #    ##   ##  #  # #  # # #  ### ### ####### # # # # ",
			"#######  # # #  # ### # ### ###   #   #  ####   #####    ###    ## ##    ###    # # #  ###  ## #     #  ###    ##   ##   ###           ##  ###  #####    ###   ##   ##      #    #   # ## # ##         # # # # ",
			"####### # # # #  #####   #####  #   #       #    ###      #      ###     # #    # ###   #####  #######  ###     #####     #             #####   #   #   #####   #####                   #####  ####### # # # # "
		], colorMap);
	}
}

exports.draw = function(ctx, text, x, y, col){
	if(dirty){
		redrawCanvases();
		dirty = false;
	}

	var position = 0;
	for(var i=0; i<text.length; i++){
		var index = chars.indexOf(text[i]);
		if(index !== -1){
			ctx.drawImage(
				coloredFontCanvases[col],
				index * fontX, 0,
				fontX, fontY,
				x + fontX * position, y,
				fontX, fontY
			);
		} else if((index = specialChars.indexOf(text[i])) !== -1){
			ctx.drawImage(
				coloredSpecialCharsCanvases[col],
				index * fontX * 2, 0,
				fontX * 2, fontY,
				x + fontX * position, y,
				fontX * 2, fontY
			);
			position++;
		}
		position++;
	}
};
