exports.disableImageSmoothing = function(ctx) {
	if(ctx.imageSmoothingEnabled !== undefined){
		ctx.imageSmoothingEnabled = false;
	} else if(ctx.mozImageSmoothingEnabled !== undefined){
		ctx.mozImageSmoothingEnabled = false;
	} else if(ctx.webkitImageSmoothingEnabled !== undefined){
		ctx.webkitImageSmoothingEnabled = false;
	} else if(ctx.msImageSmoothingEnabled !== undefined){
		ctx.msImageSmoothingEnabled = false;
	}
};

exports.hexToRgb = function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return [
		parseInt(result[1], 16),
		parseInt(result[2], 16),
		parseInt(result[3], 16)
	];
};

exports.rgbToDec = function(r, g, b){
	var c = r * (256*256) + g * 256 + b;
	return c;
};

exports.decToR = function(c){
	return Math.floor(c / (256*256));
};

exports.decToG = function(c){
	return Math.floor(c / 256) % 256;
};

exports.decToB = function(c){
	return c % 256;
};

function isSafari(){
	return navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1;
}

exports.isMac = function(){
	return navigator.platform.match("Mac");
};

exports.makeGlobal = function(obj){
	for(var key in obj){
		window[key] = obj[key];
	}
};

exports.scaleToFit = function scaleToFit(element, containerElement, pixelPerfectMode){
	var containerWidth = window.innerWidth;
	var containerHeight = window.innerHeight;
	if(containerElement){
		var rect = containerElement.getBoundingClientRect();
		containerWidth = rect.width;
		containerHeight = rect.height;
	}
	var scaleX = containerWidth / element.width;
	var scaleY = containerHeight / element.height;
	var scale = Math.min(scaleX, scaleY);

	var dpr = window.devicePixelRatio || 1;

	if(pixelPerfectMode){
		scale = (Math.floor(scale * dpr)/dpr) || (1/dpr);
	}

	var offsetX = (containerWidth - element.width * scale) * 0.5;
	var offsetY = (containerHeight - element.height * scale) * 0.5;

	if(pixelPerfectMode){
		offsetX = Math.floor(offsetX * dpr) / dpr;
		offsetY = Math.floor(offsetY * dpr) / dpr;
	}

	// Safari doesn't have nearest neighbor rendering when using CSS3 scaling
	if (isSafari()){
		element.style.width = (element.width * scale) + "px";
		element.style.height = (element.height * scale) + "px";
		element.style.marginLeft = offsetX + 'px';
		element.style.marginTop = offsetY + 'px';
	} else {
		element.style.transformOrigin = "0 0"; //scale from top left
		element.style.transform = "translate(" + offsetX + "px, " + offsetY + "px) scale(" + scale + ")";
	}
};

exports.fullscreen = function(element) {
	if(document.fullscreenElement) return false;

	// Use the specification method before using prefixed versions
	if (element.requestFullscreen) {
		element.requestFullscreen();
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen();
	} else if (element.mozRequestFullScreen) {
		element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen();
	} else {
		return false;
	}

	return true;
};

exports.zeros = function(n, reusableArray){
	if(reusableArray === undefined){
		var a = [];
		while(n--){
			a.push(0);
		}
		return a;
	} else {
		for(var i=0; i<reusableArray.length; i++){
			reusableArray[0] = 0;
		}
		while(reusableArray.length < n) reusableArray.push(0);
		return reusableArray;
	}
};

exports.createCanvas = function(w,h,pixelSmoothing){
	pixelSmoothing = pixelSmoothing === undefined ? true : pixelSmoothing;

	var canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	if(pixelSmoothing){
		exports.disableImageSmoothing(canvas.getContext('2d'));
	}

	return canvas;
}

exports.createCanvasFromAscii = function(asciiArray, charToColorMap){
	var width = asciiArray[0].length;
	var height = asciiArray.length;
	var canvas = exports.createCanvas(width, height);
	var ctx = canvas.getContext('2d');
	var imageData = ctx.createImageData(width, height);
	for(var i=0; i<height; i++){
		for(var j=0; j<width; j++){
			var p = 4 * (i * width + j);
			var rgba = charToColorMap[asciiArray[i][j]];
			imageData.data[p+0] = rgba[0];
			imageData.data[p+1] = rgba[1];
			imageData.data[p+2] = rgba[2];
			imageData.data[p+3] = rgba[3];
		}
	}
	ctx.putImageData(imageData, 0, 0);
	return canvas;
};

// Get the line and column of an error. Works in all major browsers.
exports.getErrorInfo = function(err) {
	var line = -1;
	var column = -1;
	if(err.lineNumber!==undefined && err.columnNumber!==undefined){
		line = err.lineNumber;
		column = err.columnNumber;
	} else if(err.line!==undefined && err.column!==undefined){
		line = err.line;
		column = err.column;
	}
	var stack = err.stack;
	var m = stack.match(/:(\d+):(\d+)/mg);
	if(m){
		var nums = m[1].split(':');
		line = parseInt(nums[1]);
		column = parseInt(nums[2]);
	}
	return {
		message: err.message,
		line: line,
		column: column,
		originalError: err
	};
};

exports.loadJsonFromUrl = function(url, callback){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				callback(null, JSON.parse(xhr.responseText));
			} else {
				callback(xhr);
			}
		}
	};
	xhr.open("GET", url, true);
	xhr.send();
};

exports.removeTrailingZeros = function(arr){
	while(arr[arr.length-1] === 0){
		arr.pop();
	}
};

// iOS audio fix, to allow playing sounds from the first touch
exports.iosAudioFix = function(element, callback){
	var isUnlocked = false;
	element.ontouchend = function(){
		if(isUnlocked) return;

		if(callback) callback();

		// by checking the play state after some time, we know if we're really unlocked
		setTimeout(function() {
			if((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
				isUnlocked = true;
			}
		}, 0);
	};
};

exports.values = function(obj){
	var vals = [];
	for(var key in obj) {
		vals.push(obj[key]);
	}
	return vals;
};

// Parse query vars
// "search" is window.location.search
exports.parseQueryVariables = function(search,variables) {
    var query = search.substring(1);
    var vars = query.split('&');
	var result = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
		var varName = decodeURIComponent(pair[0]);
		var type = variables[varName];
        if (type === undefined) continue;

		var value = decodeURIComponent(pair[1]);
		var ok = false;
		switch(type){
			case 'i':
				value = parseInt(value, 10);
				ok = !isNaN(value);
				break;
			case 'b':
				value = (value === "1");
				ok = true;
				break;
			case 's':
				ok = true;
				break;
		}
		if(ok){
			result[varName] = value;
        }
    }
    return result;
};

exports.floodfill = function(get, set, x, y, target, replace, xmin, xmax, ymin, ymax){
	if(target === replace) return;
	if(get(x,y) !== target) return;
	var q = [];
	q.push(x,y);
	while(q.length){
		var nx = q.shift();
		var ny = q.shift();
		if(get(nx,ny) === target){
			set(nx,ny,replace);
			if(nx > xmin && get(nx-1,ny) === target) q.push(nx-1,ny);
			if(nx < xmax && get(nx+1,ny) === target) q.push(nx+1,ny);
			if(ny < ymax && get(nx,ny+1) === target) q.push(nx,ny+1);
			if(ny > ymin && get(nx,ny-1) === target) q.push(nx,ny-1);
		}
	}
};

// Reliable modulo
exports.mod = function(a,b) {
	return ((a%b)+b)%b;
};
