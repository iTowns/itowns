 define(['./workers'], function(workers){
       
        
        var LAZLoader = function(arraybuffer) {
		this.arraybuffer = arraybuffer;
		this.ww = workers.laslaz.getWorker();

		this.nextCB = null;
		var o = this;

		this.ww.onmessage = function(e) {
			if (o.nextCB !== null) {
				o.nextCB(e.data);
				o.nextCB = null;
			}
		};

		this.dorr = function(req, cb) {
			o.nextCB = cb;
			o.ww.postMessage(req);
		};
	};

	LAZLoader.prototype.open = function() {

		// nothing needs to be done to open this file
		//
		var o = this;
		return new Promise(function(res, rej) {
			o.dorr({type:"open", arraybuffer: o.arraybuffer}, function(r) {
				if (r.status !== 1)
					return rej(new Error("Failed to open file"));

				res(true);
			});
		});
	};

	LAZLoader.prototype.getHeader = function() {
		var o = this;

		return new Promise(function(res, rej) {
			o.dorr({type:'header'}, function(r) {
				if (r.status !== 1)
					return rej(new Error("Failed to get header"));

				res(r.header);
			});
		});
	};

	LAZLoader.prototype.readData = function(count, offset, skip) {
		var o = this;

		return new Promise(function(res, rej) {
			o.dorr({type:'read', count: count, offset: offset, skip: skip}, function(r) {
				if (r.status !== 1)
					return rej(new Error("Failed to read data"));
				res({
					buffer: r.buffer,
					count: r.count,
					hasMoreData: r.hasMoreData
				});
			});
		});
	};

	LAZLoader.prototype.close = function() {
		var o = this;

		return new Promise(function(res, rej) {
			o.dorr({type:'close'}, function(r) {
				workers.laslaz.returnWorker(o.ww);
			
				if (r.status !== 1)
					return rej(new Error("Failed to close file"));

				res(true);
			});
		});
	};
        
        return  LAZLoader;

 });
        