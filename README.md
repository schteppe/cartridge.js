cartridge.js
============

Minimalistic retro game engine inspired by Pico-8. You can use it as a library and/or create content for your game using the editor.

# Usage

```html
<html>
<head>
	<style>
	#container {
		width: 512px;
		height: 512px;
		background-color: black;
	}
	</style>
</head>
<body>
	<div id="container"></div>
	<script src="cartridge.js"></script>
	<script>
		var x = 50, y = 50;

		// Initialize
		cartridge({ containerId: 'container' });

		// Called at 60Hz
		function _update60(){
			if (btn(0,1)) x--;
			if (btn(1,1)) x++;
			if (btn(2,1)) y--;
			if (btn(3,1)) y++;
		}

		// Called each render frame
		function _draw(){
			cls(); // Clear screen
			print('HELLO WORLD', 10, 10); // draw a string at 10,10
			spr(1, x, y); // draw sprite 1 from spritesheet
		}
	</script>
</body>
</html>
```

# API documentation

### abs

```js
var y = abs(x);
```

Returns the absolute value of x.

### atan2

```js
var angle = atan2(x,y);
```

### btn

```js
var isdown = btn(i, player);
```

### camera

```js
camera(x, y);
```

### cartridge

```js
cartridge(options);
```

### click

```js
click(callback);
```

### cls

```js
cls();
```

### clip

```js
clip(x,y,w,h);
```

### color

```js
color(col);
```

### cos

```js
var y = cos(x);
```

### fget

```js
var flags = fget(n);
```

### fit

```js
fit();
```

### flr

```js
y = flr(x);
```

### fset

```js
fset(n, flags);
```

### fullscreen

```js
fullscreen();
```

### map

```js
map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer);
```

### max

```js
var z = max(x, y);
```

### mget

```js
var z = mget(x, y);
```

### min

```js
var z = min(x, y);
```

### mousebtn

```js
var isdown = mousebtn(i);
```

### mousex

```js
var x = mousex();
```

### mousey

```js
var y = mousey();
```

### mset

```js
mset(x, y, i);
```

### palt

```js
palt(col, t);
```

### pget

```js
var color = pget(x, y);
```

### print

```js
print(text, x, y, col);
```

### pset

```js
pset(x, y, col);
```

### rect

```js
rect(x0, y0, x1, y1, col);
```

### rectfill

```js
rectfill(x0, y0, x1, y1, col);
```

### rnd

```js
y = rnd(x);
```

### sfx

```js
sfx(n [, channelIndex [, offset]]);
```

### sget

```js
color = sget(x, y);
```

### sgn

```js
y = sgn(x);
```

### sin

```js
y = sin(x);
```

### spr

```js
spr(n, x, y, w, h, flip_x, flip_y);
```

### sqrt

```js
y = sqrt(x);
```

### sset

```js
sset(x, y, col);
```

### time

```js
t = time();
```