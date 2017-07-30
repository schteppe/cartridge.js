var math = require('./math');
var utils = require('./utils');

var _mousex = 0;
var _mousey = 0;
var _mousescroll = 0;
var _mousebtns = {};

exports.init = function(canvases){
	addListeners(canvases);
};

exports.mousex = function mousex(){ return _mousex; };
exports.mousey = function mousey(){ return _mousey; };
exports.mousescroll = function mousescroll(){ return _mousescroll; };

exports.mousebtn = function mousebtn(i){
	return !!_mousebtns[i];
};

var _touches = {};
exports.touchn = function touchn(){ return Object.keys(_touches).length; };
exports.touchid = function touchn(i){
	var key = Object.keys(_touches)[i];
	return _touches[ key ].identifier;
};
exports.touchdown = function touchdown(id){
	return !!_touches[id];
};
exports.touchxNormalized = function touchxNormalized(id){
	var clientX = _touches[id].clientX;
	var rect = _touches[id].target.getBoundingClientRect(); // cache this?
	return math.clamp((clientX - rect.left) / rect.width, 0, 1);
};
exports.touchyNormalized = function touchyNormalized(id){
	var clientY = _touches[id].clientY;
	var rect = _touches[id].target.getBoundingClientRect(); // cache this?
	var y = math.clamp((clientY - rect.top) / rect.height, 0, 1);
	return y;
};

function addListeners(canvases){
	canvasListeners = {
		click: function(evt){
			if(typeof(_click) !== 'undefined'){
				updateMouseCoords(evt, canvases);
				_mousebtns[evt.which] = true;
				_click();
				_mousebtns[evt.which] = false;
			}
		},
		mousedown: function(evt){
			_mousebtns[evt.which] = true;
			updateMouseCoords(evt, canvases);
		},
		mouseup: function(evt){
			_mousebtns[evt.which] = false;
			updateMouseCoords(evt, canvases);
		},
		mouseleave: function(evt){
			_mousebtns[evt.which] = false;
			updateMouseCoords(evt, canvases);
		},
		mousewheel: function(evt){
			var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
			_mousescroll += delta;
		},
		touchstart: function(evt){
			evt.preventDefault();
			for(var i=0; i<evt.changedTouches.length; i++){
				_touches[evt.changedTouches[i].identifier] = evt.changedTouches[i];
			}
		},
		touchmove: function(evt){
			evt.preventDefault();
			for(var i=0; i<evt.changedTouches.length; i++){
				_touches[evt.changedTouches[i].identifier] = evt.changedTouches[i];
			}
		},
		touchend: function(evt){
			evt.preventDefault();
			for(var i=0; i<evt.changedTouches.length; i++){
				delete _touches[evt.changedTouches[i].identifier];
			}
		}
	};
	canvasListeners.DOMMouseScroll = canvasListeners.mousewheel;

	var key;
	for(key in canvasListeners){
		canvases[0].addEventListener(key, canvasListeners[key]);
	}

	bodyListeners = {
		mousemove: function(evt){
			updateMouseCoords(evt, canvases);
		}
	};
	for(key in bodyListeners){
		document.body.addEventListener(key, bodyListeners[key]);
	}
}

function removeListeners(canvases){
	var key;
	for(key in canvasListeners){
		canvases[0].removeEventListener(key, canvasListeners[key]);
	}
	for(key in bodyListeners){
		document.body.removeEventListener(key, bodyListeners[key]);
	}
}

function updateMouseCoords(evt, canvases){
	if(canvases.indexOf(evt.target) === -1) return;

	var rect = evt.target.getBoundingClientRect(); // cache this?
	var parentRect = evt.target.parentNode.getBoundingClientRect(); // cache this?
	var subx = 0;
	var suby = 0;
	var clientX = evt.clientX;
	var clientY = evt.clientY;
	if(evt.changedTouches){
		clientX = evt.changedTouches[0].clientX;
		clientY = evt.changedTouches[0].clientY;
	}
	_mousex = math.clamp((clientX - rect.left - subx) / rect.width, 0, 1);
	_mousey = math.clamp((clientY - rect.top - suby) / rect.height, 0, 1);
}

exports.mousexNormalized = function(){ return _mousex; };
exports.mouseyNormalized = function(){ return _mousey; };

exports.global = {
	mousebtn: exports.mousebtn,
	click: exports.click,
	mousescroll: exports.mousescroll,
	touchn: exports.touchn,
	touchid: exports.touchid,
	touchdown: exports.touchdown
};
