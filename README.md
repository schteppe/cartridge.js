cartridge.js
============

Create a full game containing your own sprites, maps, sounds, gamepad input, music, and code in the [editor](https://schteppe.github.io/cartridge.js/editor/).

![cartridge-spr](https://cloud.githubusercontent.com/assets/1063152/21720212/3147227c-d422-11e6-9484-149fb534830e.png)
![cartridge-map](https://cloud.githubusercontent.com/assets/1063152/21720211/3138b93a-d422-11e6-837e-708bb0742084.png)
![cartridge-sfx](https://cloud.githubusercontent.com/assets/1063152/21720210/3121a6b4-d422-11e6-934d-53ec301d5d10.png)
![cartridge-code](https://cloud.githubusercontent.com/assets/1063152/21720207/2e36373a-d422-11e6-9d71-9d021ba08e6f.png)

## Demos

[![megaman-intro](https://cloud.githubusercontent.com/assets/1063152/21720795/6fa28680-d425-11e6-8530-f516e8697b5d.png)](https://schteppe.github.io/cartridge.js/editor/?file=../carts/megaman-intro.json&run=1)
[![lemmings](https://cloud.githubusercontent.com/assets/1063152/21808248/c1c28e54-d742-11e6-8c07-50e40d8ba6d2.png)](https://schteppe.github.io/cartridge.js/editor/?file=../carts/lemmings.json&run=1)
[![game-of-life](https://cloud.githubusercontent.com/assets/1063152/22184077/616345b6-e0cb-11e6-940d-4e61c1455421.png)](https://schteppe.github.io/cartridge.js/editor/?file=../carts/gameoflife.json&run=1)

[![twister](https://cloud.githubusercontent.com/assets/1063152/22183937/61f1ff60-e0c9-11e6-8835-0c99ebd31d0b.png)](https://schteppe.github.io/cartridge.js/editor/?file=../carts/twister.json&run=1)
[![input-test](https://cloud.githubusercontent.com/assets/1063152/22183938/6498d446-e0c9-11e6-81a9-29a9c39780ea.png)](https://schteppe.github.io/cartridge.js/editor/?file=../carts/input.json&run=1)

# Editor documentation

`ctrl + enter` run game

`alt + left` / `alt + right` switch between editors

### Sprite editor (SPR)

`r` rotate

`del` clear sprite

`f` / `v` flip left / right

`q` / `w` previous / next

`ctrl + c` copy sprite

`ctrl + v` paste sprite or image

### Map editor (MAP)

`mmb` / `space` pan

`lmb` draw

### Sound editor (SFX)

`space` play current sound

`lmb` add sound

`rmb + drag` remove sound(s)

### Code editor (.JS)

`ctrl + v` paste

`tab` insert two spaces

`home` / `end` end/start of line

`ctrl + k` remove characters on the right on the line

`pagedown` / `pageup` move up/down a screen

### Track editor (TRK)

`space` play current track

`ZSXDCVGBHNJM` C C# D D# E F F# G G# A A# B

`Q2W3ER5T6Y7U` C C# D D# E F F# G G# A A# B, in the next octave

### Music editor (MUS)

`space` play current pattern

### Run mode

`escape` Return to editor

### Editor startup parameters

You the editor takes a few query parameters to its URL. Use these to control the initial behavior of the editor.

<dl>
  <dt>file</dt>
  <dd>Tries to load a cart/JSON-file from the given URL.</dd>
  <dt>run</dt>
  <dd>If set to 1, the editor will start the current cart when loaded. Default is 0.</dd>
  <dt>pixel_perfect</dt>
  <dd>If set to 1, canvas will be stretched to fit the browsers' window. If 0, it will scale up the canvas by an integer number (1x, 2x, 3x etc) while fitting inside the browser window. Default is 0.</dd>
</dl>

For example, `https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json` will load a cart from the URL `../carts/twister.json` before starting the editor ([try here](https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json)).

`https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json&run=1` will load a cart from the URL `../carts/twister.json` and run it ([try here](https://schteppe.github.io/cartridge.js/editor?file=../carts/twister.json&run=1)).

# Library usage

See the [examples](examples/).

# API documentation

See the [Wiki](https://github.com/schteppe/cartridge.js/wiki).
