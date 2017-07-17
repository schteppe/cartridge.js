function Action(){};
Action.prototype = {
	undo: function(){},
	redo: function(){},
};

function PsetAction(x,y,newColor){
	this.x = x;
	this.y = y;
	this.oldColor = pget(x,y);
	this.newColor = newColor;
};
PsetAction.prototype = Object.create(Action.prototype, {
	undo: function(){ pset(this.x, this.y, this.oldColor); },
	redo: function(){ pset(this.x, this.y, this.newColor); },
});

module.exports = {
	Action: Action,
	PsetAction: PsetAction
};