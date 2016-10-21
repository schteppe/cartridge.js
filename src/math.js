module.exports = {
	sin: Math.sin,
	cos: Math.cos,
	flr: Math.floor,
	rnd: function (x){
		return Math.random() * x;
	},
	abs: Math.abs,
	atan2: Math.atan2,
	max: Math.max,
	min: Math.min,
	sgn: Math.sign, // sgn(x) -- returns argument sign: -1, 1; sgn(0) = 1,
	sqrt: Math.sqrt
};