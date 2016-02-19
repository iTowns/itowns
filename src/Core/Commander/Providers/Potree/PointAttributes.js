define(['./PointAttribute','./PointAttributeNames'], function(PointAttribute, PointAttributeNames){

var PointAttributes = function(pointAttributes){
	this.attributes = new Array();
	this.byteSize = 0;
	this.size = 0;
	
	if(pointAttributes != null){	
		for(var i = 0; i < pointAttributes.length; i++){
			var pointAttributeName = pointAttributes[i];
			var pointAttribute = PointAttribute[pointAttributeName];
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		}
	}
}

PointAttributes.prototype.add = function(pointAttribute){
	this.attributes.push(pointAttribute);
	this.byteSize += pointAttribute.byteSize;
	this.size++;
};

PointAttributes.prototype.hasColors = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute.name === PointAttributeNames.COLOR_PACKED){
			return true;
		}
	}
	
	return false;
};

PointAttributes.prototype.hasNormals = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(
			pointAttribute === PointAttribute.NORMAL_SPHEREMAPPED || 
			pointAttribute === PointAttribute.NORMAL_FLOATS ||
			pointAttribute === PointAttribute.NORMAL ||
			pointAttribute === PointAttribute.NORMAL_OCT16){
			return true;
		}
	}
	
	return false;
};

return PointAttributes;

});