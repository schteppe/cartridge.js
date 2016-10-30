cartridge.js
============

Minimalistic retro game engine.

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

### y = abs(x)

Returns the absolute value of x.

### angle = atan2(x,y)
### isdown = btn(i, player)
### camera(x, y)
### cartridge(containerId)
### click(callback)
### cls()
### clip(x,y,w,h)
### color(col)
### y = cos(x)
### flags = fget(n)
### fit()
### y = flr(x)
### fset(n, flags)
### fullscreen()
### map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer)
### z = max(x, y)
### z = mget(x, y)
### z = min(x, y)
### isdown = mousebtn(i)
### x = mousex()
### y = mousey()
### mset(x, y, i)
### palt(col, t)
### color = pget(x, y)
### print(text, x, y, col)
### pset(x, y, col)
### rect(x0, y0, x1, y1, col)
### rectfill(x0, y0, x1, y1, col)
### y = rnd(x)
### color = sget(x, y)
### y = sgn(x)
### y = sin(x)
### spr(n, x, y, w, h, flip_x, flip_y)
### y = sqrt(x)
### sset(x, y, col)
### t = time()