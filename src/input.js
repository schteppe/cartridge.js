var math = require('./math');
var utils = require('./utils');

var maxPlayers = 6; // 0-1 keyboard, 2-5 gamepad
var maxButtons = 5;
var buttonStates = utils.zeros(maxPlayers * maxButtons);
var prevButtonStates = utils.zeros(maxPlayers * maxButtons);
var buttonMap = { // Maps keycodes to button index

	// Player 0
	37: 0, // left
	39: 1, // right
	38: 2, // up
	40: 3, // down
	90: 4, // z
	88: 5, // x

	// Player 1
	83: 6, // S
	70: 7, // F
	69: 8, // E
	68: 9, // D
	65: 10, // A
	81: 11  // Q
};

var _mousex = 0;
var _mousey = 0;
var _mousebtns = {};
var stickSensitivity = 0.1;

exports.btn = function btn(i, player){
	i = i !== undefined ? i : 0;
	player = player !== undefined ? player : 0;
	return buttonStates[player * maxPlayers + i];
};

// TODO: need to support multiple "prev" button states, so it can work in _update, _draw, etc
exports.btnp = function btnp(i, player){
	i = i !== undefined ? i : 0;
	player = player !== undefined ? player : 0;
	return prevButtonStates[player * maxPlayers + i];
};

exports.update = function (){
	updateGamepadInputs();
	for(var i=0; i<buttonStates.length; i++){
		prevButtonStates[i] = buttonStates[i];
	}
};

exports.init = function(canvases){
	addInputListeners(canvases);
};

exports.mousex = function mousex(){ return _mousex; };
exports.mousey = function mousey(){ return _mousey; };

exports.mousebtn = function mousebtn(i){
	return !!_mousebtns[i];
};

function addInputListeners(canvases){
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
		}
	};
	for(var key in canvasListeners){
		canvases[0].addEventListener(key, canvasListeners[key]);
	}

	bodyListeners = {
		keydown: function(e){
			buttonStates[buttonMap[e.keyCode]] = 1;
		},
		keyup: function(e){
			buttonStates[buttonMap[e.keyCode]] = 0;
		},
		mousemove: function(evt){
			updateMouseCoords(evt, canvases);
		}
	};
	for(var key in bodyListeners){
		document.body.addEventListener(key, bodyListeners[key]);
	}
}

function removeInputListeners(canvases){
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
	_mousex = (evt.clientX - rect.left - subx) / rect.width;
	_mousey = (evt.clientY - rect.top - suby) / rect.height;
}

function buttonPressed(b) {
	if (typeof(b) == "object") {
		return b.pressed;
	}
	return b == 1.0;
}

function updateGamepadInputs() {
	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

	for(var i=0; i<gamepads.length && i < maxPlayers; i++){
		if(!gamepads[i]) continue;
		var p = 2 + maxPlayers * i;
		buttonStates[p + 0] = gamepads[i].axes[0] < -stickSensitivity;
		buttonStates[p + 1] = gamepads[i].axes[0] > stickSensitivity;
		buttonStates[p + 2] = gamepads[i].axes[1] < -stickSensitivity;
		buttonStates[p + 3] = gamepads[i].axes[1] > stickSensitivity;
		buttonStates[p + 4] = buttonPressed(gamepads[i].buttons[0]);
		buttonStates[p + 5] = buttonPressed(gamepads[i].buttons[1]);
	}
}

exports.mousexNormalized = function(){ return _mousex; };
exports.mouseyNormalized = function(){ return _mousey; };

exports.global = {
	btn: exports.btn,
	btnp: exports.btnp,
	mousebtn: exports.mousebtn,
	click: exports.click
};
