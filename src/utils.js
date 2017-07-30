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
	var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	if(iOS){
		var isUnlocked = false;
		element.ontouchend = function(){
			console.log('ontouchend')
			if(isUnlocked) return;

			isUnlocked = true;
			if(callback) callback();
		};
	} else {
		if(callback) callback();
	}
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

var input = null;
exports.opentextfile = function(callback){
	if(!input){
		input = document.createElement('input');
		input.style.display = 'none';
		input.type = 'file';
		input.value = null;
		document.body.appendChild(input);
	}
	input.onchange = function(e) {
		var file = e.target.files[0];
		if (!file) {
			return callback(new Error('No file.'));
		}
		var reader = new FileReader();
		reader.onload = function(e) {
			callback(null, e.target.result);
		};
		reader.onerror = function(e) {
			callback(new Erorr('Could not open file.'));
		};
		reader.readAsText(file);
		this.value = null;
	};

	input.click();
};

exports.inrect = function(x,y,rx,ry,rw,rh){
	return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
};

exports.isMobile = function() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
};

exports.downloadStringAsTextFile = function(str, filename){
	var url = URL.createObjectURL(new Blob([str]));
	var a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};