cartridge.js
============

Create a full game containing your own sprites, maps, sounds, gamepad input, music, and code in the [editor](https://schteppe.github.io/cartridge.js/editor/).

![cartridge-spr](https://cloud.githubusercontent.com/assets/1063152/21720212/3147227c-d422-11e6-9484-149fb534830e.png)
![cartridge-map](https://cloud.githubusercontent.com/assets/1063152/21720211/3138b93a-d422-11e6-837e-708bb0742084.png)
![cartridge-sfx](https://cloud.githubusercontent.com/assets/1063152/21720210/3121a6b4-d422-11e6-934d-53ec301d5d10.png)
![cartridge-code](https://cloud.githubusercontent.com/assets/1063152/21720207/2e36373a-d422-11e6-9d71-9d021ba08e6f.png)

## Demos

[![twister](https://cloud.githubusercontent.com/assets/1063152/21720721/06ad239c-d425-11e6-99c3-e0ae6fb37739.png)](https://schteppe.github.io/cartridge.js/editor/?file=../carts/twister.json&run=1)
[![megaman-intro](https://cloud.githubusercontent.com/assets/1063152/21720795/6fa28680-d425-11e6-8530-f516e8697b5d.png)](https://schteppe.github.io/cartridge.js/editor/?file=../carts/megaman-intro.json&run=1)


# Editor documentation

`ctrl + enter` run game

### Sprite editor

`r` rotate

`f` / `v` flip left / right

`q` / `w` previous / next

`ctrl + c` copy sprite

`ctrl + v` paste sprite or image

### Map editor

`mmb` / `space` pan

`lmb` draw

### Sound editor

`space` play current sound

### Code editor

`ctrl + v` paste

`tab` insert two spaces

`home` / `end` end/start of line

`ctrl + k` remove characters on the right on the line

`pagedown` / `pageup` move up/down a screen

### Run mode

`escape` Return to editor

### Editor startup parameters

You the editor takes a few query parameters to its URL. Use these to control the initial behavior of the editor.

<dl>
  <dt>file</dt>
  <dd>Tries to load a cart/JSON-file from the given URL.</dd>Usage
  <dt>run</dt>
  <dd>If set to 1, the editor will start the current cart when loaded. Default is 0.</dd>
  <dt>pixel_perfect</dt>
  <dd>If set to 1, canvas will be stretched to fit the browsers' window. If 0, it will scale up the canvas by an integer number (1x, 2x, 3x etc) while fitting inside the browser window. Default is 0.</dd>
</dl>

For example, `https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json` will load a cart from the URL `../carts/twister.json` before starting the editor ([try here](https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json)).

`https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json&run=1` will load a cart from the URL `../carts/twister.json` and run it ([try here](https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json&run=1)).

# Library usage

See the [examples](examples/);

# API documentation

#### Game loop

* [_init()](#_init) - called on game start
* [_update()](#_update) - called at 30fps
* [_update60()](#_update60) - called at 60fps
* [_draw()](#_draw) - called every render frame
* [_kill()](#_kill) - called on game end

#### Math

* [abs(x)](#abs) - absolute value
* [atan2(x,y)](#atan2)
* [ceil(x)](#ceil) - round up
* [clamp(x,min,max)](#clamp) - clamp a number
* [cos(x)](#cos) - cosine
* [flr(x)](#flr) - floor
* [inf](#inf) - infinity
* [max(x,y)](#max) - maximum of two numbers
* [mid(x,y,z)](#mid) - middle of three numbers
* [min(x,y)](#min) - minimum
* [mix(a,b,alpha)](#mix) - linear interpolation
* [nan(x)](#nan) - check for NaN
* [rnd(n)](#rnd) - generate floating point random number between 0 and n
* [sgn(x)](#sgn) - sign
* [sin(x)](#sin) - sine
* [sqrt(x)](#sqrt) - square root

#### Input

* [btn(n,[p])](#btn) - get button state
* [btnp(n,[p])](#btnp) - get previous button state
* [_click](#_click) - called upon click
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
* [def()](#def) - check if a value is defined
* [fit()](#fit) - fit canvas to the container
* [fullscreen()](#fullscreen) - enter fullscreen mode
* [height([newHeight])](#height) - get or set height
* [load(str)](#load) - load cartridge
* [log()](#log) - log to console
* [save(str)](#save) - save cartridge
* [time()](#time) - get current time in seconds
* [width([newWidth])](#width) - get or set width

### _init

#### _init ()

```js
function _init(){
  // game start logic
}
```

===

### _update

#### _update ()

```js
function _update(){
  // game update logic
}
```

===

### _update60

#### _update60 ()

```js
function _update60(){
  // game update logic
}
```

===

### _draw

#### _draw ()

```js
function _draw(){
  // draw game here
}
```

===

### _kill

#### _kill ()

```js
function _kill(){
  // destroy game here
}
```

===

### abs

#### abs ( x )

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

### atan2

#### atan2 ( x , y )

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

### btn

#### btn ( n , [player] )

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

### btnp

#### btnp ( n , [player] )

<dl>
	<dt>n</dt>
	<dd>See `btn`</dd>
	<dt>player</dt>
	<dd>See `btn`</dd>
	<dt>Return value</dt>
	<dd>A boolean indicating if the button is pressed or not.</dd>
</dl>

```js
if(btnp(0)){
  player.x--;
}
```

===

### camera

#### camera ( x , y )

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

### cartridge

#### cartridge ( options )

Initialize the library.

```js
cartridge({ containerId: 'myContainerElementId' });
```

===

### ceil

#### ceil ( x )

Round up a number

<dl>
	<dt>x</dt>
	<dd>A number</dd>
	<dt>Return value</dt>
	<dd>Rounded number</dd>
</dl>

```js
var y = ceil(1.34); // 2
```

===

### clamp

#### clamp ( x, min, max )

Clamp a number

<dl>
	<dt>x</dt>
	<dd>A number</dd>
	<dt>min</dt>
	<dd>A number</dd>
	<dt>max</dt>
	<dd>A number</dd>
	<dt>Return value</dt>
	<dd>A number</dd>
</dl>

```js
var a = clamp(1.34, 1, 2); // 1.34
var b = clamp(3.14, 1, 2); // 2
var c = clamp(0.11, 1, 2); // 1
```

===

### _click

#### _click ()

Click handler.

```js
function _click(){
  console.log('User clicked!');
}
```

===

### cls

#### cls ()

Clear the whole screen.

```js
cls();
```

===

### clip

#### clip ( x , y , w , h )

Set drawing area for draw operations. Similar to "scissor test" in other rendering engines.

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
clip(0,0,20,30);
```

===

### color

#### color ( col )

<dl>
	<dt>col</dt>
	<dd>New default color</dd>
</dl>

```js
color(2); // new default color is 2
```

===

### cos

#### cos ( x )

<dl>
	<dt>x</dt>
	<dd>A number</dd>
	<dt>Return value</dt>
	<dd>The cosine of x</dd>
</dl>

```js
var a = cos(0); // 1
var b = cos(1); // 1
var c = cos(0.25); // 0
var c = cos(0.5); // -1
```

===

### fget

#### fget ( n )

<dl>
	<dt>n</dt>
	<dd>Sprite index</dd>
	<dt>Return value</dt>
	<dd>Flags for the sprite (a bitmask)</dd>
</dl>

```js
var flags = fget(0); // get flags for sprite 0
```

===

### fit

#### fit ()

Fit the canvas to the container element.

```js
fit();
```

===

### flr

#### flr ( x )

Floor a number

<dl>
	<dt>x</dt>
	<dd>A number</dd>
	<dt>Return value</dt>
	<dd>Floored number</dd>
</dl>

```js
var y = flr(1.34); // 1
```

===

### in

#### inf

A number, set to `Infinity`.

```js
if(x < inf){
	dosomething();
}
```

===

### fset

#### fset ( n , flags )

Set flags for a sprite

<dl>
	<dt>n</dt>
	<dd>Sprite index</dd>
	<dt>flags</dt>
	<dd>Bitmask flags for the sprite.</dd>
</dl>

```js
fset(1, 1|2|4); // set first, second and third flag for sprite 1
```

===

### fullscreen

#### fullscreen ()

Enable full screen.

```js
fullscreen();
```

===

### map

#### map ( cel_x , cel_y , sx , sy , cel_w , cel_h , [layer] )

Draw a portion of the map to the canvas.

<dl>
	<dt>cel_x</dt>
	<dd></dd>
	<dt>cel_y</dt>
	<dd></dd>
	<dt>sx</dt>
	<dd></dd>
	<dt>sy</dt>
	<dd></dd>
	<dt>cel_w</dt>
	<dd></dd>
	<dt>cel_h</dt>
	<dd></dd>
	<dt>layer (optional)</dt>
	<dd></dd>
</dl>

```js
map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer);
```

===

### max

#### max ( x , y )

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>y</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd>The maximum of x and y</dd>
</dl>

```js
var z = max(x, y);
```

===

### mget

#### mget ( x , y )

Get a cell from the map, as a sprite index.

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>y</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd>A sprite index.</dd>
</dl>

```js
var sprite = mget(1, 2); // get sprite at position 1,2 in the map
```

===

### mid

#### mid ( x , y , z )

Get the middle number of three numbers

<dl>
	<dt>x</dt>
	<dd>A number</dd>
	<dt>y</dt>
	<dd>A number</dd>
	<dt>z</dt>
	<dd>A number</dd>
	<dt>Return value</dt>
	<dd>The middle number</dd>
</dl>

```js
var a = mid(1, 2, 3); // 2
```

===

### min

#### min ( x , y )

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>y</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd>The minimum of x and y</dd>
</dl>

```js
var z = min(1, 2); // 1
```

===

### mix

#### mix ( x , y , alpha )

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>y</dt>
	<dd></dd>
	<dt>alpha</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd></dd>
</dl>

===

### nan

#### nan ( x )

Checks if `x` is not-a-number. Does the same job as `isNaN` in JavaScript.

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd>True or false</dd>
</dl>

===

### mousebtn

#### mousebtn ( n )

Get mouse button state.

<dl>
	<dt>n</dt>
	<dd>Mouse button number</dd>
	<dt>Return value</dt>
	<dd>True if the button is being pressed, else false</dd>
</dl>

```js
var isdown = mousebtn(1);
```

===

### mousex

#### mousex ()

Returns the x position of the mouse.

```js
var x = mousex();
```

===

### mousey

#### mousey ()

```js
var y = mousey();
```

===

### mset

#### mset ( x , y , n )

Set the sprite to be rendered at a cell position in the map.

<dl>
	<dt>x</dt>
	<dd>Cell position in the map</dd>
	<dt>y</dt>
	<dd>Cell position in the map</dd>
	<dt>n</dt>
	<dd>A sprite index</dd>
</dl>

```js
mset(x, y, i);
```

===

### palget

#### palget ( col )

<dl>
	<dt>col</dt>
	<dd>Palette color</dd>
	<dt>Return value</dt>
	<dd></dd>
</dl>

```js
var dec = palget(0); // 0x000000
```

===

### palset

#### palset ( col , dec )

<dl>
	<dt>col</dt>
	<dd>Palette color</dd>
	<dt>dec</dt>
	<dd>Color in decimal format</dd>
</dl>

```js
palset(1, 0xff0000); // Set color 1 to red
```

===

### palt

#### palt ( col , t )

<dl>
	<dt>col</dt>
	<dd>Palette color</dd>
	<dt>t</dt>
	<dd>Boolean indicating if the color should be transparent.</dd>
</dl>

```js
palt(col, t);
```

===

### pget

#### pget ( x , y )

Get a pixel color on the screen.

<dl>
	<dt>x</dt>
	<dd>X position on the screen</dd>
	<dt>y</dt>
	<dd>Y position on the screen</dd>
	<dt>Return value</dt>
	<dd>A palette color</dd>
</dl>

```js
var color = pget(x, y);
```

===

### print

#### print ( text , x , y , [col] )

Print a text on the screen.

<dl>
	<dt>text</dt>
	<dd>A string of text</dd>
	<dt>x</dt>
	<dd>X position on the screen</dd>
	<dt>y</dt>
	<dd>Y position on the screen</dd>
	<dt>Return value</dt>
	<dd>A palette color</dd>
</dl>

```js
print("Hello world!", 15, 10, 7);
```

===

### pset

#### pset ( x , y , col )

Set pixel color.

<dl>
	<dt>x</dt>
	<dd>X position on the screen</dd>
	<dt>y</dt>
	<dd>Y position on the screen</dd>
	<dt>col</dt>
	<dd>A palette color</dd>
</dl>

```js
pset(5, 4, 8); // Set pixel (5,4) to color 8
```

===

### rect

#### rect ( x0 , y0 , x1 , y1 , [col] )

Draw a rectangle.

<dl>
	<dt>x0</dt>
	<dd>X position on the screen</dd>
	<dt>y0</dt>
	<dt>x1</dt>
	<dd>X position on the screen</dd>
	<dt>y1</dt>
	<dd>Y position on the screen</dd>
	<dt>col (optional)</dt>
	<dd>A palette color</dd>
</dl>

```js
rect(x0, y0, x1, y1, col);
```

===

### rectfill

#### rectfill ( x0 , y0 , x1 , y1 , [col] )

Draw a filled rectangle.

<dl>
	<dt>x0</dt>
	<dd>X position on the screen</dd>
	<dt>y0</dt>
	<dt>x1</dt>
	<dd>X position on the screen</dd>
	<dt>y1</dt>
	<dd>Y position on the screen</dd>
	<dt>col (optional)</dt>
	<dd>A palette color</dd>
</dl>

```js
rectfill(10, 10, 20, 20, 3);
```

===

### rnd

#### rnd ( [n] )

Get a random number.

<dl>
	<dt>n (optional, default is 1)</dt>
	<dd>Max random number</dd>
	<dt>Return value</dt>
	<dd>A floating point number between 0 and n.</dd>
</dl>

```js
var a = rnd(); // a random number between 0 and 1
var b = rnd(1); // a random number between 0 and 1
var c = rnd(2); // a random number between 0 and 2
```

===

### sfx

#### sfx ( n , [channel] , [offset] )

<dl>
	<dt>n</dt>
	<dd>Sound index</dd>
	<dt>channel</dt>
	<dd></dd>
	<dt>offset</dt>
	<dd></dd>
</dl>

```js
sfx(0); // play sound effect 0
```

===

### sget

#### sget ( x , y )

Get a sprite sheet pixel color.

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>y</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd>A palette color</dd>
</dl>

```js
var color = sget(4, 3);
```

===

### sgn

#### sgn ( x )

Returns the sign of a number

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd></dd>
</dl>

```js
var a = sgn(-2); // -1
var b = sgn(1); // 1
var c = sgn(42); // 1
var d = sgn(0); // 0
```

===

### sin

#### sin ( x )

Calculates the sine of x.

<dl>
	<dt>x</dt>
	<dd>A normalized angle. Number between 0 and 1.</dd>
	<dt>Return value</dt>
	<dd>The sine of x.</dd>
</dl>

```js
var a = sin(0); // 0
var b = sin(0.25); // 1
var c = sin(0.5); // 0
var d = sin(0.75); // -1
var e = sin(1); // 0
```

===

### spr

#### spr ( n , x , y , [w] , [h] , [flip_x] , [flip_y] )

Draws a sprite.

<dl>
	<dt>n</dt>
	<dd>Sprite index</dd>
	<dt>x</dt>
	<dd></dd>
	<dt>y</dt>
	<dd></dd>
	<dt>w</dt>
	<dd></dd>
	<dt>h</dt>
	<dd></dd>
	<dt>flip_x</dt>
	<dd></dd>
	<dt>flip_y</dt>
	<dd></dd>
</dl>

```js
spr(1, 10, 20); // draw sprite 1 at coordinate (10,20)
```

===

### sqrt

#### sqrt ( x )

Square root.

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd></dd>
</dl>


```js
var y = sqrt(25); // 5
```

===

### sset

#### sset ( x , y , col )

Set sprite sheet pixel color.

<dl>
	<dt>x</dt>
	<dd></dd>
	<dt>y</dt>
	<dd></dd>
	<dt>col</dt>
	<dd></dd>
	<dt>Return value</dt>
	<dd></dd>
</dl>

```js
sset(10, 5, 3);
```

===

### time

#### time ()

Get current time in seconds.

```js
var t = time();
```

===

### log

#### log ( message )

Log something to the JavaScript console. Equivalent to `console.log`.

```js
log("hello world!");
```

===

### def

#### def ( value )

Check if a value is defined. Equivalent to `value !== undefined`.

```js
def(1);         // true
def(null);      // true
def(undefined); // false
```
