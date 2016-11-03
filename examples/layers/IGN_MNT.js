itowns.viewer.addElevationLayer({
	protocol:   "wmts",
	id:         "IGN_MNT",
	url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
	noDataValue : -99999,
	updateStrategy: {
		type: 1, /* see LayerUpdateStrategy.js */
		options: {
			groups: [3, 7, 11, 14]
		}
	},
	options: {
		name: "ELEVATION.ELEVATIONGRIDCOVERAGE",
		mimetype: "image/x-bil;bits=32",
		tileMatrixSet: "WGS84G",
		tileMatrixSetLimits: {
			"3": {
				"minTileRow": 1,
				"maxTileRow": 5,
				"minTileCol": 5,
				"maxTileCol": 15
			},
			"4": {
				"minTileRow": 3,
				"maxTileRow": 10,
				"minTileCol": 10,
				"maxTileCol": 30
			},
			"5": {
				"minTileRow": 6,
				"maxTileRow": 20,
				"minTileCol": 20,
				"maxTileCol": 61
			},
			"6": {
				"minTileRow": 13,
				"maxTileRow": 40,
				"minTileCol": 41,
				"maxTileCol": 123
			},
			"7": {
				"minTileRow": 27,
				"maxTileRow": 80,
				"minTileCol": 82,
				"maxTileCol": 247
			},
			"8": {
				"minTileRow": 54,
				"maxTileRow": 160,
				"minTileCol": 164,
				"maxTileCol": 494
			},
			"9": {
				"minTileRow": 108,
				"maxTileRow": 321,
				"minTileCol": 329,
				"maxTileCol": 989
			},
			"10": {
				"minTileRow": 216,
				"maxTileRow": 642,
				"minTileCol": 659,
				"maxTileCol": 1979
			},
			"11": {
				"minTileRow": 432,
				"maxTileRow": 1285,
				"minTileCol": 1319,
				"maxTileCol": 3959
			}
		}
	}
});