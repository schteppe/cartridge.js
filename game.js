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
    var collidesBelow = false;
    var cw = cellwidth();
    var ch = cellheight();
    var jumpSfx = 0;

    function collides(x,y,dx,dy){
        x = flr(x);
        y = flr(y);
        var cx0 = flr(x / cw);
        var cy0 = flr(y / ch);
        if(dy !== 0){
            if((x % cw) === 0) cx0--;
            for(var i=0; i < w+1; i++){
                var adjust = dy > 0 ? ch : 0;
                var checkY = flr((y+dy+adjust) / ch);
                var checkX = cx0+i;
                if((groundFlag & fget(mget(checkX,checkY)))){
                    return true;
                }
            }
        }
        if(dx !== 0){
            if((y % ch) === 0) cy0--;
            for(var i=0; i < h+1; i++){
                var adjust = dx > 0 ? cw : 0;
                var checkY = cy0+i;
                var checkX = flr((x+dx) / cw);
                if((groundFlag & fget(mget(checkX,checkY)))){
                    return true;
                }
            }
        }
        return false;
    }

    this.update = function(){
        var i, tx, sx0;

        // Cell before movement
        var cx0 = flr(x / cw);
        var cy0 = flr(y / ch);

        var cy0_1px_up = flr((y-1) / ch);
        var cy0_1px_down = flr((y+1) / ch);
        var cx0_1px_left = flr((x-1) / ch);
        var cx0_1px_right = flr((x+1) / ch);

        collidesAbove = collides(x,y,0,-1);
        collidesBelow = collides(x,y,0,1);
        collidesRight = collides(x,y,1,0);
        collidesLeft = collides(x,y,-1,0);

        // Add velocities
        vy += gravity;

        vy = min(1,vy);

        vx = 0;
        if (btn(0,playerNumber)) vx -= 1;
        if (btn(1,playerNumber)) vx += 1;
        if (btn(2,playerNumber) && !btnp(2,playerNumber)){
            vy = -2;
            if(jumpSfx >= 0){
                sfx(jumpSfx);
            }
        }

        // Clamp motion
        var cx = flr((x+vx) / cw);
        var cy = flr((y+vy) / ch);
        var nx0 = ceil((x+w*cw) / cw) - cx0;
        var nx = ceil((x+vx+w*cw) / cw) - cx;

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