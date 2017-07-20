function Action(editor,hasDiff){
	this.editor = editor;
	this.valid = hasDiff;
}
Action.prototype = {
	undo: function(){},
	redo: function(){},
	merge: function(otherAction){ return null; }
};

function PsetAction(editor,x,y,newColor){
	this.x = x;
	this.y = y;
	this.oldColor = pget(x,y);
	this.newColor = newColor;
	Action.call(this,editor,this.oldColor != this.newColor);
}
PsetAction.prototype = Object.create(Action.prototype);
Object.assign(PsetAction.prototype, {
	undo: function(){ pset(this.x, this.y, this.oldColor); this.editor.dirty = true; },
	redo: function(){ pset(this.x, this.y, this.newColor); this.editor.dirty = true; },
});

function SsetAction(editor,x,y,newColor){
	this.x = x;
	this.y = y;
	this.oldColor = sget(x,y);
	this.newColor = newColor;
	Action.call(this,editor,this.oldColor != this.newColor);
}
SsetAction.prototype = Object.create(Action.prototype);
Object.assign(SsetAction.prototype, {
	undo: function(){ sset(this.x, this.y, this.oldColor); this.editor.dirty = true; },
	redo: function(){ sset(this.x, this.y, this.newColor); this.editor.dirty = true; },
});

function MsetAction(editor,x,y,newSpriteId){
	this.x = x;
	this.y = y;
	this.oldSpriteId = mget(x,y);
	this.newSpriteId = newSpriteId;
	Action.call(this,editor,this.oldSpriteId != this.newSpriteId);
}
MsetAction.prototype = Object.create(Action.prototype);
Object.assign(MsetAction.prototype, {
	undo: function(){ mset(this.x, this.y, this.oldSpriteId); this.editor.dirty = true; },
	redo: function(){ mset(this.x, this.y, this.newSpriteId); this.editor.dirty = true; },
});

module.exports = {
	Action: Action,
	PsetAction: PsetAction,
	SsetAction: SsetAction,
	MsetAction: MsetAction
};