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
}

var keyboardStates = {};
var keyboardStatesPrev = {};
var keyMap0 = defaultKeyMap(1);
var keyMap1 = defaultKeyMap(2);
var _mousex = 0;
var _mousey = 0;
var _mousebtns = {};
var gamepads = [];
var stickSensitivity = 0.1;

function buttonPressed(b) {
  if (typeof(b) == "object") {
    return b.pressed;
  }
  return b == 1.0;
}

exports.btn = function btn(i, player){
	player = player !== undefined ? player : 1;
	var keyCode = 0;

	if(player === 1 || player === 2){
		if(player === 1){
			keyCode = keyMap0[i];
		} else if(player === 2){
			keyCode = keyMap1[i];
		}
		return !!keyboardStates[keyCode];
	} else if(player === 3){
		if(gamepads[0]){
			if(i === 4) return buttonPressed(gamepads[0].buttons[0]);
			else if(i === 5) return buttonPressed(gamepads[0].buttons[1]);
			else if(i === 0) return gamepads[0].axes[0] < -stickSensitivity;
			else if(i === 1) return gamepads[0].axes[0] > stickSensitivity;
			else if(i === 2) return gamepads[0].axes[1] < -stickSensitivity;
			else if(i === 3) return gamepads[0].axes[1] > stickSensitivity;
		}
	}
};

exports.btnp = function btnp(i, player){
	player = player !== undefined ? player : 1;
	var keyCode = 0;

	if(player === 1 || player === 2){
		if(player === 1){
			keyCode = keyMap0[i];
		} else if(player === 2){
			keyCode = keyMap1[i];
		}
		return !!keyboardStatesPrev[keyCode];
	} else if(player === 3){
		// TODO
		return false;
	}
};

exports.update = function (){
	var keys = Object.keys(keyboardStates);
	for(var i=0; i<keys.length; i++){
		keyboardStatesPrev[keys[i]] = keyboardStates[keys[i]];
	}
	updateGamepads();
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
			keyboardStates[e.keyCode] = 1;
		},
		keyup: function(e){
			keyboardStates[e.keyCode] = 0;
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

function updateGamepads() {
  gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
}

exports.global = {
	btn: exports.btn,
	btnp: exports.btnp,
	mousex: exports.mousex,
	mousey: exports.mousey,
	mousebtn: exports.mousebtn,
	click: exports.click
};
