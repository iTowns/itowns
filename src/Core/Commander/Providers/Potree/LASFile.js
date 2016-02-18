define(['./pointFormatReaders','./LAZLoader'], function(pointFormatReaders, LAZLoader){

        function readAs(buf, Type, offset, count) {
		count = (count === undefined || count === 0 ? 1 : count);
		var sub = buf.slice(offset, offset + Type.BYTES_PER_ELEMENT * count);

		var r = new Type(sub);
		if (count === undefined || count === 1)
			return r[0];

		var ret = [];
		for (var i = 0 ; i < count ; i ++) {
			ret.push(r[i]);
		}

		return ret;
	}


        var LASFile = function(arraybuffer) {
		this.arraybuffer = arraybuffer;

		this.determineVersion();
		if (this.version > 12)
			throw new Error("Only file versions <= 1.2 are supported at this time");

		this.determineFormat();
		if (pointFormatReaders[this.formatId] === undefined)
			throw new Error("The point format ID is not supported");

		this.loader = this.isCompressed ?
			new LAZLoader(this.arraybuffer) :
			new LASLoader(this.arraybuffer);
	};

	LASFile.prototype.determineFormat = function() {
		var formatId = readAs(this.arraybuffer, Uint8Array, 32*3+8);
		var bit_7 = (formatId & 0x80) >> 7;
		var bit_6 = (formatId & 0x40) >> 6;

		if (bit_7 === 1 && bit_6 === 1)
			throw new Error("Old style compression not supported");

		this.formatId = formatId & 0x3f;
		this.isCompressed = (bit_7 === 1 || bit_6 === 1);
	};

	LASFile.prototype.determineVersion = function() {
		var ver = new Int8Array(this.arraybuffer, 24, 2);
		this.version = ver[0] * 10 + ver[1];
		this.versionAsString = ver[0] + "." + ver[1];
	};

	LASFile.prototype.open = function() {
		return this.loader.open();
	};

	LASFile.prototype.getHeader = function() {
		return this.loader.getHeader();
	};

	LASFile.prototype.readData = function(count, start, skip) {
		return this.loader.readData(count, start, skip);
	};

	LASFile.prototype.close = function() {
		return this.loader.close();
	};
        
       return LASFile;
       
});