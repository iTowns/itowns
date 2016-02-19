define([], function(){

        var pointFormatReaders = {
		0: function(dv) {
			return {
				"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
				"intensity": dv.getUint16(12, true),
				"classification": dv.getUint8(16, true)
			};
		},
		1: function(dv) {
			return {
				"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
				"intensity": dv.getUint16(12, true),
				"classification": dv.getUint8(16, true)
			};
		},
		2: function(dv) {
			return {
				"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
				"intensity": dv.getUint16(12, true),
				"classification": dv.getUint8(16, true),
				"color": [dv.getUint16(20, true), dv.getUint16(22, true), dv.getUint16(24, true)]
			};
		},
		3: function(dv) {
			return {
				"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
				"intensity": dv.getUint16(12, true),
				"classification": dv.getUint8(16, true),
				"color": [dv.getUint16(28, true), dv.getUint16(30, true), dv.getUint16(32, true)]
			};
		}
	};
        
        return pointFormatReaders;
        
});        