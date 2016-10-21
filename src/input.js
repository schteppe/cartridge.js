exports.defaultKeyMap = function(player){
	if(player === 1){
		return {
			0: 37, // left
			2: 38, // up
			1: 39, // right
			3: 40, // down
			4: 90, // z
			5: 88 // x
		};
	} else if(player === 2){
		return {
			0: 83, // S
			2: 69, // E
			1: 70, // F
			3: 68, // D
			4: 65, // A
			5: 81 // Q
		};
	}

	return null;
};
