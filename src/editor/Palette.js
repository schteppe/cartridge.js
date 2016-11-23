var Component = require('./Component');

module.exports = Palette;

function Palette(){
    Component.call(this);
    this.selectedColor = 1;
}
Palette.prototype = Object.create(Component.prototype);

Palette.prototype.draw = function(){
    var n=0;
    var x = this.x;
    var y = this.y;
    var sx = flr(this.w / 4);
    var sy = flr(this.h / 4);

    for(var j=0; j<4; j++){
        for(var i=0; i<4; i++){
            var rx = x+i*sx;
            var ry = y+j*sy;
            var rw = x+(i+1)*sx-1;
            var rh = y+(j+1)*sy-1;
            rectfill(rx, ry, rw, rh, n);
            if(this.selectedColor === n){
                rect(rx, ry, rw, rh, this.selectedColor === 0 ? 7 : 0);
            }
            n++;
        }
    }
};
