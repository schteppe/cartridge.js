function defaultKeyMap(player){
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

var buttonStates = {};
var buttonStatesPrev = {};
var keyMap0 = defaultKeyMap(1);
var keyMap1 = defaultKeyMap(2);
var _mousex = 0;
var _mousey = 0;
var _mousebtns = {};

exports.btn = function btn(i, player){
	player = player !== undefined ? player : 1;
	var keyCode = 0;
	if(player === 1){
		keyCode = keyMap0[i];
	} else if(player === 2){
		keyCode = keyMap1[i];
	}
	return !!buttonStates[keyCode];
};

exports.btnp = function btnp(i, player){
	player = player !== undefined ? player : 1;
	var keyCode = 0;
	if(player === 1){
		keyCode = keyMap0[i];
	} else if(player === 2){
		keyCode = keyMap1[i];
	}
	return !!buttonStatesPrev[keyCode];
};

exports.update = function (){
	var keys = Object.keys(buttonStates);
	for(var i=0; i<keys.length; i++){
		buttonStatesPrev[keys[i]] = buttonStates[keys[i]];
	}
};

exports.init = function(canvases){
	addInputListeners(canvases);
};

exports.mousex = function mousex(){
	return _mousex;
};

exports.mousey = function mousey(){
	return _mousey;
};

exports.mousebtn = function mousebtn(i){
	return !!_mousebtns[i];
};

var clickListener = null;
exports.click = function(callback){
	clickListener = callback || null;
};

function addInputListeners(canvases){
	canvasListeners = {
		click: function(evt){
			if(clickListener !== null){
				clickListener();
			}
		},
		mousedown: function(evt){
			_mousebtns[evt.which] = true;
			updateMouseCoords(evt);
		},
		mouseup: function(evt){
			_mousebtns[evt.which] = false;
			updateMouseCoords(evt);
		}
	};
	for(var key in canvasListeners){
		canvases[0].addEventListener(key, canvasListeners[key]);
	}

	bodyListeners = {
		keydown: function(e){
			buttonStates[e.keyCode] = 1;
		},
		keyup: function(e){
			buttonStates[e.keyCode] = 0;
		},
		mousemove: function(evt){
			updateMouseCoords(evt);
		}
	};
	for(var key in bodyListeners){
		document.body.addEventListener(key, bodyListeners[key]);
	}
}

function removeInputListeners(canvases){
	for(var key in canvasListeners){
		canvases[0].removeEventListener(key, canvasListeners[key]);
	}
	for(var key in bodyListeners){
		document.body.removeEventListener(key, bodyListeners[key]);
	}
}

function updateMouseCoords(evt){
	var rect = evt.target.getBoundingClientRect(); // cache this?
	var size = Math.min(rect.width, rect.height);
	var subx = 0;
	var suby = 0;
	if(rect.width > rect.height){
		subx = (rect.width - size) * 0.5;
	} else {
		suby = (rect.height - size) * 0.5;
	}
	_mousex = Math.floor((evt.clientX - rect.left - subx) / size * 128);
	_mousey = Math.floor((evt.clientY - rect.top - suby) / size * 128);
}

exports.global = {
	btn: exports.btn,
	btnp: exports.btnp,
	mousex: exports.mousex,
	mousey: exports.mousey,
	mousebtn: exports.mousebtn,
	click: exports.click
};
