function Player(){
    var w = 1; // Player size in cells
    var h = 1;
    var x = 0; // relative to map origin
    var y = 0;
    var vx = 0;
    var vy = 0;
    var gravity = 0.1;
    var playerNumber = 1;
    var groundFlag = 1 << 0;
    var onground = false;
    var cw = cellwidth();
    var ch = cellheight();
    var jumpSfx = 0;

    this.update = function(){
        var i, tx, sx0;

        // Add velocities
        vy += gravity;
        vy = min(1,vy);

        vx = 0;
        if (btn(0,playerNumber)) vx -= 1;
        if (btn(1,playerNumber)) vx += 1;
        if (btn(2,playerNumber) && onground){
            vy = -2;
            if(jumpSfx >= 0){
                sfx(jumpSfx);
            }
        }

        // Clamp motion
        var cx = flr((x+vx) / cw);
        var cx0 = flr(x / cw);
        var cy = flr((y+vy) / ch);
        var cy0 = flr(y / ch);
        var nx0 = ceil((x+w*cw) / cw) - cx0;
        var nx = ceil((x+vx+w*cw) / cw) - cx;
        onground = false;

        var ny = ceil((y+h*ch) / ch) - cy;
        for(i=0; i < ny; i++){
            // Check tile(s) to the right
            if(vx > 0 && groundFlag & fget(mget(cx+1,cy+i))){
                tx = (cx+1) * ch;
                sx0 = x + ch;
                vx = max(0, tx - sx0);
            }

            // Check tile(s) to the left
            if(vx < 0 && groundFlag & fget(mget(cx,cy+i))){
                tx = cx * ch;
                sx0 = x - ch;
                vx = min(0, tx - sx0);
            }
        }

        if(vy > 0){
            // Check tile(s) below
            for(i=0; i < nx0; i++){
                if(groundFlag & fget(mget(cx0+i,cy+1))){
                    var ty = (cy+1) * ch;
                    var sy0 = y + ch;
                    // sy0 + vy = ty  <=>  vy = ty - sy0
                    vy = max(0, ty - sy0);
                    onground = true;
                }
            }
        }

        if(vy < 0){
            // Check tile(s) above
            for(i=0; i < nx0; i++){
                if(groundFlag & fget(mget(cx0+i,cy))){
                    var ty = cy * ch;
                    var sy0 = y - ch;
                    vy = min(0, ty - sy0);
                }
            }
        }


        // Add
        x += vx;
        y += vy;
    };

    this.x = function(){ return flr(x); };
    this.y = function(){ return flr(y); };
}

cartridge({ containerId: 'container' });
document.body.onresize = document.body.mozfullscreenchange = function(){
	fit();
};

var player = new Player();

function _init(){
    load('game');
}
function _update(){
}
function _update60(){
}

function _draw(){
    player.update();
	cls();
	map(0, 0, 0, 0, 100, 32, 0);
	spr(1, player.x(), player.y());
}