module.exports = Component;

function Component(){
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 128;
    this.h = 128;
    this.root = null;
    this.parent = null;
    this.hidden = null; // null, true or false. Children will inherit if not null.
    this.children = [];
    this.onclick = function(x,y){};
    this.onmousemove = function(x,y){};
    this.onmouseup = function(x,y){};
    this.onmousedown = function(x,y){};
}
Component.prototype = {
    add: function(child){
        child.parent = this;
        child.root = this.root;
        this.children.push(child);
    },
    draw: function(){},
    click: function(x,y){
        if(this.hit(x,y)){
            this.onclick();
        }
    },
    mousedown: function(x,y){},
    mouseup: function(x,y){},
    mousemove: function(x,y){},
    hit: function(x,y){
	    return x >= this.x && y >= this.y && x < this.x + this.w && y < this.y + this.h;
    }
};