exports.defaultPalette = function(){
	return [
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
		0xffccaa  // 15
	];
};

exports.int2hex = function(int){
	var hex = int.toString(16);
	// left pad
	while(hex.length < 6){
		hex = "0" + hex;
	}
	hex = '#' + hex;

	return hex;
}