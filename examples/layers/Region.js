 itowns.viewer.addImageryLayer({
	url       : "https://wxs.ign.fr/gratuit/geoportail/v/wms",
	protocol  : 'wms',
	version   : '1.3.0',
	id        : 'Region',
	name      : 'REGION.2016',
	style      : "",
	projection : "EPSG:4326",
	transparent : true,
	// min long, min lat, max long, max lat
	bbox      : [-61.80983300000002, -21.38963079935857, 55.83665389999998, 51.0890011990783],
	featureInfoMimeType : "",
	dateTime  : "",
	heightMapWidth : 256,
	waterMask      : false,
	updateStrategy: {
		type: 0, /* see LayerUpdateStrategy.js */
		options: {}
	},
	options: {
		mimetype  : "image/png"
	}
});