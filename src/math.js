var tau = 2 * Math.PI;

module.exports = {
	// trigonometric functions use normalized angles!
	sin: function(radians){ return Math.sin(radians * tau); },
	cos: function(radians){ return Math.cos(radians * tau); },
	atan2: function(y,x){ return Math.atan2(y,x) / tau; },

	flr: Math.floor,
	ceil: Math.ceil,
	rnd: function (x){ return Math.random() * x; },
	abs: Math.abs,
	max: Math.max,
	min: Math.min,
	mix: function(a,b,alpha){
		return a * alpha + b * ( 1.0 - alpha );
	},
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
	},
	clamp: function(x,min,max){
		return Math.min(Math.max(x,min), max);
	}
};