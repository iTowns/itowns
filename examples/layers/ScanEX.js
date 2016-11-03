itowns.viewer.addImageryLayer({
	protocol:   "wmts",
	id:         "ScanEX",
	url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
	fx :        2.5,
	updateStrategy: {
		type: 0, /* see LayerUpdateStrategy.js */
		options: {}
	},
	options: {
		name: 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD',
		mimetype: "image/jpeg",
		tileMatrixSet: "PM",
		tileMatrixSetLimits: {
		  '6' : {
				'minTileRow': 21,
				'maxTileRow': 35,
				'minTileCol':20,
				'maxTileCol':41
			},
			'7' : {
				'minTileRow': 42,
				'maxTileRow': 71,
				'minTileCol':41,
				'maxTileCol':83
			},
			'8' : {
				'minTileRow': 85,
				'maxTileRow': 143,
				'minTileCol':82,
				'maxTileCol':167
			},
			'9' : {
				'minTileRow': 170,
				'maxTileRow': 287,
				'minTileCol':165,
				'maxTileCol':335
			},
			'10' : {
				'minTileRow': 340,
				'maxTileRow': 574,
				'minTileCol': 331,
				'maxTileCol': 671
			},
			'11' : {
				'minTileRow': 681,
				'maxTileRow': 1149,
				'minTileCol':663,
				'maxTileCol':1342
			},
			'12' : {
				'minTileRow': 1363,
				'maxTileRow': 2298,
				'minTileCol':1327,
				'maxTileCol':2684
			},
			'13' : {
				'minTileRow': 2726,
				'maxTileRow': 4602,
				'minTileCol':2655,
				'maxTileCol':5371
			},
			'14' : {
				'minTileRow': 5452,
				'maxTileRow': 9204,
				'minTileCol':5311,
				'maxTileCol':10742
			},
			'15' : {
				'minTileRow': 10944,
				'maxTileRow': 18381,
				'minTileCol':10632,
				'maxTileCol':21467
			},
			'16' : {
				'minTileRow': 21889,
				'maxTileRow': 36763,
				'minTileCol':21264,
				'maxTileCol':42934
			},
			'17' : {
				'minTileRow': 43778,
				'maxTileRow': 73526,
				'minTileCol':42528,
				'maxTileCol':85869
			},
			'18' : {
				'minTileRow': 87557,
				'maxTileRow': 147052,
				'minTileCol':85058,
				'maxTileCol':171738
			}
		}
	}
});
