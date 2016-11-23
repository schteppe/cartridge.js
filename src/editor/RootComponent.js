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
        var component = queue.pop();
        var shouldStop = f.call(this, component);
        if(!shouldStop){
            for(var i=0; i<component.children.length; i++){
                var child = component.children[i];
                if(component.hidden !== null)
                    child.hidden = component.hidden;
                queue.push(child);
            }
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

    var drawComponents = [];
    this.traverse(function(component){
        if(component.root === component) return false;
        if(component.hidden) return true;
        drawComponents.push(component);
    });
    drawComponents = drawComponents.sort(function(a,b){ // todo: cache sorted list
        return a.z - b.z;
    });
    for(var i=0; i<drawComponents.length; i++){
        drawComponents[i].draw();
    }
};

RootComponent.prototype.click = function(x,y){
    this.traverse(function(component){
        if(component.root === component) return false;
        return component.click(x,y);
    });
};