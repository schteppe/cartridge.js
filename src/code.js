var code = '';

exports.codeset = function(codeString){
	code = codeString;
};

exports.codeget = function(){
	return code;
};

exports.run = function(){
	eval.call(null, code);
};