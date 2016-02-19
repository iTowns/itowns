define(['./pointFormatReaders'], function(pointFormatReaders){
        
        var LASDecoder = function(buffer, pointFormatID, pointSize, pointsCount, scale, offset, mins, maxs) {
		this.arrayb = buffer;
		this.decoder = pointFormatReaders[pointFormatID];
		this.pointsCount = pointsCount;
		this.pointSize = pointSize;
		this.scale = scale;
		this.offset = offset;
		this.mins = mins;
		this.maxs = maxs;
	};

	LASDecoder.prototype.getPoint = function(index) {
		if (index < 0 || index >= this.pointsCount)
			throw new Error("Point index out of range");

		var dv = new DataView(this.arrayb, index * this.pointSize, this.pointSize);
		return this.decoder(dv);
	};
        
    return LASDecoder;
    
});    