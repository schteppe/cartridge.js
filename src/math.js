module.exports = {
	sin: Math.sin,
	cos: Math.cos,
	flr: Math.floor,
	rnd: function (x){ return Math.random() * x; },
	abs: Math.abs,
	atan2: Math.atan2,
	max: Math.max,
	min: Math.min,
	sgn: Math.sign, // sgn(x) -- returns argument sign: -1, 1; sgn(0) = 1,
	sqrt: Math.sqrt,
	mid: function(x,y,z){
		var m = z;
		if(x >= y && x <= z){
			m = x;
		} else if(y >= x && y <= z){
			m = y;
		} else if(z >= x && z <= y){
			m = z;
		}
		return m;
	}
};