var Component = require('./Component');

module.exports = RootComponent;

function RootComponent(){
    Component.call(this);
    this.root = this;

    var that = this;
    click(function(){
        that.click(mousex(),mousey());
    });
}
RootComponent.prototype = Object.create(Component.prototype);

RootComponent.prototype.traverse = function(f){
    var queue = [];
    queue.push(this);
    while(queue.length){
        var component = queue.shift();
        var shouldStop = f.call(this, component);
        if(shouldStop) return;
        for(var i=0; i<component.children.length; i++){
            queue.push(component.children[i]);
        }
    }
};

RootComponent.prototype.draw = function(){

    // Update dimensions - needed?
    this.w = width();
    this.h = height();

	// Mouse move
    var mx = mousex();
	var my = mousey();
	if(!(this.lastmx === mx && this.lastmy === my)){
        this.traverse(function(component){
    		return component.mousemove(mx, my);
        });
	}
	this.lastmx = mx;
	this.lastmy = my;

    this.traverse(function(component){
        if(component.root === component) return false;
        if(component.hidden) return true;
        return component.draw();
    });
};

RootComponent.prototype.click = function(x,y){
    this.traverse(function(component){
        if(component.root === component) return false;
        return component.click(x,y);
    });
};