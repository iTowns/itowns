itowns.viewer.addImageryLayer({
    protocol:   "wmtsc",
    id:         "OPENSM",
    customUrl:  'http://b.tile.openstreetmap.fr/osmfr/%TILEMATRIX/%COL/%ROW.png',
    options: { 
		tileMatrixSet: "PM",
		mimetype: "image/png"},
    fx :        2.5,
});