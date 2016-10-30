exports.hello = function(){
	console.log([
		'CARTRIDGE.JS',
		'JavaScript retro game engine.',
		'',
		'For help, run help().'
	].join('\n'));
};

exports.print = function(){
	console.log([
		'download()   Download the contents to a JSON file.',
		'help()       Print this message.',
		'load([name]) Load sprites and map from localStorage.',
		'save([name]) Save sprites and map to localStorage.'
	].join('\n'));
};