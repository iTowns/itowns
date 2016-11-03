itowns.viewer.addImageryLayer({
	protocol:   "wmts",
	id:         "Ortho",
	url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
	updateStrategy: {
		type: 0, /* see LayerUpdateStrategy.js */
		options: {}
	},
	options: {
		name: "ORTHOIMAGERY.ORTHOPHOTOS",
		mimetype: "image/jpeg",
		tileMatrixSet: "PM",
		tileMatrixSetLimits: {
			"2": {
				"minTileRow": 0,
				"maxTileRow": 4,
				"minTileCol": 0,
				"maxTileCol": 4
			},
			"3": {
				"minTileRow": 0,
				"maxTileRow": 8,
				"minTileCol": 0,
				"maxTileCol": 8
			},
			"4": {
				"minTileRow": 0,
				"maxTileRow": 6,
				"minTileCol": 0,
				"maxTileCol": 16
			},
			"5": {
				"minTileRow": 0,
				"maxTileRow": 32,
				"minTileCol": 0,
				"maxTileCol": 32
			},
			"6": {
				"minTileRow": 1,
				"maxTileRow": 64,
				"minTileCol": 0,
				"maxTileCol": 64
			},
			"7": {
				"minTileRow": 3,
				"maxTileRow": 28,
				"minTileCol": 0,
				"maxTileCol": 128
			},
			"8": {
				"minTileRow": 7,
				"maxTileRow": 256,
				"minTileCol": 0,
				"maxTileCol": 256
			},
			"9": {
				"minTileRow": 15,
				"maxTileRow": 512,
				"minTileCol": 0,
				"maxTileCol": 512
			},
			"10": {
				"minTileRow": 31,
				"maxTileRow": 1024,
				"minTileCol": 0,
				"maxTileCol": 1024
			},
			"11": {
				"minTileRow": 62,
				"maxTileRow": 2048,
				"minTileCol": 0,
				"maxTileCol": 2048
			},
			"12": {
				"minTileRow": 125,
				"maxTileRow": 4096,
				"minTileCol": 0,
				"maxTileCol": 4096
			},
			"13": {
				"minTileRow": 2739,
				"maxTileRow": 4628,
				"minTileCol": 41,
				"maxTileCol": 7917
			},
			"14": {
				"minTileRow": 5478,
				"maxTileRow": 9256,
				"minTileCol": 82,
				"maxTileCol": 15835
			},
			"15": {
				"minTileRow": 10956,
				"maxTileRow": 8513,
				"minTileCol": 165,
				"maxTileCol": 31670
			},
			"16": {
				"minTileRow": 21912,
				"maxTileRow": 37026,
				"minTileCol": 330,
				"maxTileCol": 63341
			},
			"17": {
				"minTileRow": 43825,
				"maxTileRow": 74052,
				"minTileCol": 660,
				"maxTileCol": 126683
			},
			"18": {
				"minTileRow": 87651,
				"maxTileRow": 48105,
				"minTileCol": 1320,
				"maxTileCol": 253366
			},
			"19": {
				"minTileRow": 175302,
				"maxTileRow": 294060,
				"minTileCol": 170159,
				"maxTileCol": 343473
			},
			"20": {
				"minTileRow": 376733,
				"maxTileRow": 384679,
				"minTileCol": 530773,
				"maxTileCol": 540914
			}
		}
	}
});