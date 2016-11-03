itowns.viewer.addElevationLayer({
	protocol:   "wmts",
	id:         "IGN_MNT_HIGHRES",
	url:        "http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/geoportail/wmts",
	noDataValue : -99999,
	updateStrategy: {
		type: 1, /* see LayerUpdateStrategy.js */
		options: {
			groups: [3, 7, 11, 14]
		}
	},
	options: {
		name: "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES",
		mimetype: "image/x-bil;bits=32",
		tileMatrixSet: "WGS84G",
		tileMatrixSetLimits: {
			"6": {
				"minTileRow": 13,
				"maxTileRow": 36,
				"minTileCol": 62,
				"maxTileCol": 80
			},
			"7": {
				"minTileRow": 27,
				"maxTileRow": 73,
				"minTileCol": 124,
				"maxTileCol": 160
			},
			"8": {
				"minTileRow": 55,
				"maxTileRow": 146,
				"minTileCol": 248,
				"maxTileCol": 320
			},
			"9": {
				"minTileRow": 110,
				"maxTileRow": 292,
				"minTileCol": 497,
				"maxTileCol": 640
			},
			"10": {
				"minTileRow": 221,
				"maxTileRow": 585,
				"minTileCol": 994,
				"maxTileCol": 1281
			},
			"11": {
				"minTileRow": 442,
				"maxTileRow": 1171,
				"minTileCol": 1989,
				"maxTileCol": 2563
			},
			"12": {
				"minTileRow": 885,
				"maxTileRow": 2343,
				"minTileCol": 3978,
				"maxTileCol": 5126
			},
			"13": {
				"minTileRow": 1770,
				"maxTileRow": 4687,
				"minTileCol": 7957,
				"maxTileCol": 10253
			},
			"14": {
				"minTileRow": 3540,
				"maxTileRow": 9375,
				"minTileCol": 15914,
				"maxTileCol": 20507
			}
		}
	}
});