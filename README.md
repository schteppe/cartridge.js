cartridge.js
============

HTML5 retro game engine inspired by [Pico-8](http://www.lexaloffle.com/pico-8.php). You can use it as a library and/or create content for your game using the [editor](https://schteppe.github.io/cartridge.js/editor.html).

# Usage

```html
<html>
<body>
	<div id="container" style="width: 100%; height: 100%; background-color: black"></div>
	<script src="cartridge.js"></script>
	<script>
		var x = 50, y = 50;

		// Initialize
		cartridge({ containerId: 'container' });

		function _draw(){
			// Process input
			if (btn(0)) x--;
			if (btn(1)) x++;
			if (btn(2)) y--;
			if (btn(3)) y++;

			cls(); // Clear screen
			print('HELLO WORLD', 10, 10); // draw a text
			spr(1, x, y); // draw sprite 1 from spritesheet
		}
	</script>
</body>
</html>
```

# API documentation

#### Game loop

* [_init()](#_init-) - called on game start
* [_update()](#_update-) - called at 30fps
* [_update60()](#_update60-) - called at 60fps
* [_draw()](#_draw-) - called every render frame
* [_kill()](#_kill-) - called on game end

#### Math

* [abs(x)](#abs--x-) - absolute value
* [atan2(x,y)](#atan2--x--y-)
* [ceil(x)](#ceil) - round up
* [clamp(x,min,max)](#clamp) - clamp a number
* [cos(x)](#cos) - cosine
* [flr(x)](#flr) - floor
* [max(x,y)](#max) - maximum of two numbers
* [mid(a,b,c)](#mid) - middle of three numbers
* [min(x,y)](#min) - minimum
* [mix(a,b,alpha)](#mix) - linear interpolation
* [rnd(n)](#rnd) - generate floating point random number between 0 and n
* [sgn(x)](#sgn) - sign
* [sin(x)](#sin) - sine
* [sqrt(x)](#sqrt) - square root

#### Input

* [btn(n,[p])](#btn--n--player-) - get button state
* [btnp(n,[p])](#btn) - get previous button state
* [_click](#_click-) - called upon click
* [mousebtn(n)](#mousebtn) - get mousebutton state
* [mousex()](#mousex) - get mouse x position
* [mousey()](#mousey) - get mouse x position

#### Audio

* [sfx(n,[channel],[offset])](#sfx) - play sound effect

#### Graphics

* [camera(x,y)](#camera)
* [clip(x,y,w,h)](#clip) - only allow rendering within a rectangle
* [cls()](#cls) - clear screen
* [color(col)](#color) - set default color
* [fget(n)](#fget) - get flags for a map cell
* [fset(n,flags)](#fset) - set flags for a map cell
* [palget(n)](#palget) - get palette color in decimal form
* [palset(n,col)](#palset) - set palette color
* [palt(col,t)](#palt) - set transparency color
* [pget(x,y)](#pget) - get screen pixel color
* [print(text,x,y,[col])](#print) - draw text
* [pset(x,y,col)](#pset) - set pixel color
* [rect(x0,y0,x1,y1,[col])](#rect) - draw rectangle
* [rectfill(x0,y0,x1,y1,[col])](#rectfill) - draw filled rectangle
* [sget(x,y)](#sget) - get spritesheet pixel color
* [spr(n,x,y,[w],[h],[flip_x],[flip_y])](#spr) - draw sprite
* [sset(x,y,col)](#sset) - set pixel color in spritesheet

#### Map

* [map(cel_x,cel_y,sx,sy,cel_w,cel_h,[layer])](#map) - draw map
* [mget(x,y)](#mget) - get sprite from the map
* [mset(x,y,n)](#mset) - set sprite to be rendered in a map cell

#### Misc

* [alpha()](#alpha) - interpolation value
* [canvas(n)](#canvas) - swap to another rendering canvas layer
* [cartridge(options)](#cartridge)
* [cellheight([newCellHeight])](#cellheight) - get or set cell height
* [cellwidth([newCellWidth])](#cellwidth) - get or set cell width
* [codeget()](#codeget) - get code
* [codeset(codeString)](#codeset) - set code
* [fit()](#fit) - fit canvas to the container
* [fullscreen()](#fullscreen) - enter fullscreen mode
* [height([newHeight])](#height) - get or set height
* [load(str)](#load) - load cartridge
* [save(str)](#save) - save cartridge
* [time()](#time) - get current time in seconds
* [width([newWidth])](#width) - get or set width

### _init ()

```js
function _init(){
  // game start logic
}
```

===

### _update ()

```js
function _update(){
  // game update logic
}
```

===

### _update60 ()

```js
function _update60(){
  // game update logic
}
```

===

### _draw ()

```js
function _draw(){
  // draw game here
}
```

===

### _kill ()

```js
function _kill(){
  // destroy game here
}
```

===

### abs ( x )

<dl>
  <dt>x</dt>
  <dd>A real number</dd>
  <dt>Return value</dt>
  <dd>The absolute value of x</dd>
</dl>

```js
var a = abs(-2.3); // 2.3
var b = abs(5.6); // 5.6
```

===

### atan2 ( x , y )

<dl>
  <dt>x</dt>
  <dd>A real number</dd>
  <dt>y</dt>
  <dd>A real number</dd>
  <dt>Return value</dt>
  <dd>An angle</dd>
</dl>

```js
var angle = atan2(x,y);
```

===

### btn ( n , [player] )

<dl>
	<dt>n</dt>
	<dd>A button number: 0 = left, 1 = right, 2 = up, 3 = down, 4 = A, 5 = B</dd>
	<dt>player</dt>
	<dd>The gamepad/player number, starting from 1. Default is 1.</dd>
	<dt>Return value</dt>
	<dd>A boolean indicating if the button is pressed or not.</dd>
</dl>

```js
if(btn(0)){
  player.x--;
}
```

===

### camera ( x , y )

<dl>
	<dt>x</dt>
	<dd>New camera X position</dd>
	<dt>y</dt>
	<dd>New camera Y position</dd>
</dl>

```js
camera(x, y);
```

===

### cartridge ( options )
```js
cartridge(options);
```

===

### _click ()
```js
click(callback);
```

===

### cls ()

Clear the whole screen.

```js
cls();
```

===

### clip ( x , y , w , h )

<dl>
	<dt>x</dt>
	<dd>Clip start x</dd>
	<dt>y</dt>
	<dd>Clip start y</dd>
	<dt>w</dt>
	<dd>Clip rectangle width</dd>
	<dt>h</dt>
	<dd>Clip rectangle height</dd>
</dl>

```js
clip(x,y,w,h);
```

===

### color ( col )

<dl>
	<dt>col</dt>
	<dd>New default color</dd>
</dl>

```js
color(col);
```

===

### cos ( x )

<dl>
	<dt>x</dt>
	<dd>A number</dd>
	<dt>Return value</dt>
	<dd>The cosine of x</dd>
</dl>

```js
var y = cos(x);
```

===

### fget ( n )
```js
var flags = fget(n);
```

===

### fit ()
```js
fit();
```

===

### flr ( x )
```js
y = flr(x);
```

### fset ( n , flags )
```js
fset(n, flags);
```

### fullscreen ()
```js
fullscreen();
```

### map ( cel_x , cel_y , sx , sy , cel_w , cel_h , [layer] )
```js
map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer);
```

### max ( x , y )
```js
var z = max(x, y);
```

### mget ( x , y )
```js
var z = mget(x, y);
```

### min ( x , y )
```js
var z = min(x, y);
```

### mousebtn ( n )
```js
var isdown = mousebtn(i);
```

### mousex ()
```js
var x = mousex();
```

### mousey ()
```js
var y = mousey();
```

### mset ( x , y , spriteNumber )
```js
mset(x, y, i);
```

### palt ( n )
```js
palt(col, t);
```

### pget ( x , y )
```js
var color = pget(x, y);
```

### print ( text , x , y , [col] )
```js
print(text, x, y, col);
```

### pset ( x , y , col )
```js
pset(x, y, col);
```

### rect ( x0 , y0 , x1 , y1 , [col] )
```js
rect(x0, y0, x1, y1, col);
```

### rectfill 
```js
rectfill(x0, y0, x1, y1, col);
```

### rnd ( [n] )
```js
y = rnd(x);
```

### sfx ( n , [channel] , [offset] )
```js
sfx(n [, channelIndex [, offset]]);
```

### sget ( x , y )
```js
color = sget(x, y);
```

### sgn ( x )
```js
y = sgn(x);
```

### sin ( x )
```js
y = sin(x);
```

### spr ( n , x , y , w , h , flip_x , flip_y )
```js
spr(n, x, y, w, h, flip_x, flip_y);
```

### sqrt ( x )
```js
y = sqrt(x);
```

### sset ( x , y )
```js
sset(x, y, col);
```

### time ()
```js
t = time();
```
