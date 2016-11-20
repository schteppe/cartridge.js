function Player(){
    var w = 1, h = 1; // Player size in cells
    var x = 0, y = 0; // relative to map origin
    var px = 0, py = 0; // previous position
    var vx = 0, vy = 0; // velocity
    var gravity = 0.1;
    var playerNumber = 1;
    var groundFlag = 1 << 0;
    var collidesBelow = false, collidesAbove = false, collidesLeft = false, collidesRight = false;
    var cw = cellwidth();
    var ch = cellheight();
    var jumpSfx = 0;
    var direction = -1;

    function collides(x,y,dx,dy){
        var adjust, checkX, checkY, i;
        x = flr(x);
        y = flr(y);
        var cx0 = flr(x / cw);
        var cy0 = flr(y / ch);
        if(dy !== 0){
            for(i = 0; i < w + ((x % cw) ? 1 : 0); i++){
                adjust = dy > 0 ? ch : 0;
                checkY = flr((y+dy+adjust) / ch);
                checkX = cx0+i;
                if((groundFlag & fget(mget(checkX,checkY)))){
                    return true;
                }
            }
        }
        if(dx !== 0){
            for(i = 0; i < h+((y % ch) ? 1 : 0); i++){
                adjust = dx > 0 ? cw : 0;
                checkY = cy0+i;
                checkX = flr((x+dx+adjust) / cw);
                if((groundFlag & fget(mget(checkX,checkY)))){
                    return true;
                }
            }
        }
        return false;
    }

    this.update = function(){
        var i, tx, sx0;
        px = x;
        py = y;

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

        // Clamp velocity to max
        vy = min(1,vy);

        vx = 0;
        if (btn(0,playerNumber)) vx -= 1;
        if (btn(1,playerNumber)) vx += 1;
        if (btn(2,playerNumber) && !btnp(2,playerNumber) && collidesBelow && !collidesAbove){
            vy = -2;
            if(jumpSfx >= 0){
                sfx(jumpSfx);
            }
        }

        // Fall down into pit

        // Clamp motion
        var cx = flr((x+vx) / cw);
        var cy = flr((y+vy) / ch);
        var nx0 = ceil((x+w*cw) / cw) - cx0;
        var nx = ceil((x+vx+w*cw) / cw) - cx;

        var ny = ceil((y+h*ch) / ch) - cy;
        var right = false;
        for(i=0; i < ny; i++){
            // Check tile(s) to the right
            if(vx > 0 && groundFlag & fget(mget(cx+1,cy+i))){
                tx = (cx+1) * ch;
                sx0 = x + ch;
                vx = max(0, tx - sx0);
                right = true;
            }

            // Check tile(s) to the left
            if(vx < 0 && groundFlag & fget(mget(cx,cy+i))){
                tx = cx * ch;
                sx0 = x - ch;
                vx = min(0, tx - sx0);
                right = true;
            }
        }

        if(vy > 0){
            // Check tile(s) below
            for(i=0; i < nx0; i++){
                if(groundFlag & fget(mget(cx0+i,cy+1))){
                    var ty = (cy+1) * ch;
                    var sy0 = y + ch;
                    // sy0 + vy = ty  <=>  vy = ty - sy0
                    vy = max(right ? -0.3*gravity : 0, ty - sy0); // not zero, to overcome the situation when precisely overcoming an edge
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

        if(vx !== 0){
            direction = sgn(vx);
        }
    };

    this.x = function(a){ return flr(mix(px, x, a)); };
    this.y = function(a){ return flr(mix(py, y, a)); };

	this.draw = function(a){
        spr(
            1+flr(abs(vx))*flr(time()*20)%2,
            flr(mix(px, x, a)), flr(mix(py, y, a)),
            1, 1,
            direction < 0,
            false
        );
    };
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
    player.update();
}

function _draw(){
    camera(64-player.x(alpha()), 0);
	cls();
	map(0, 0, 0, 0, 128, 32, 0);
    player.draw(alpha());
}