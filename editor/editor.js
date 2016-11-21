cartridge({
	containerId: 'container',
	layers: 2,
	width: 256,
	height: 240,
	cellwidth: 16,
	cellheight: 16,
	palette: [
		0x000000, // 0
		0x0829fc, // 1
		0x7e2500, // 2
		0x008000, // 3

		0xab5236, // 4
		0x5f574f, // 5
		0xc2c3c7, // 6
		0xfff1e8, // 7

		0xe40405, // 8
		0xffa300, // 9
		0xfff024, // 10
		0x00e756, // 11

		0x8bf9fc, // 12
		0x83769c, // 13
		0xff8e7d, // 14
		0xffffff  // 15
	]
});

var root = new EDITOR.RootComponent();
root.add(new EDITOR.Editor());
function _draw(){
	root.draw();
}