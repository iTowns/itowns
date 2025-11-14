import * as itowns from 'itowns';

export const Scene2 = {
    placement: {
        coord: { long: 9, lat: 44.5 },
        range: 300000,
        tilt: 0,
        heading: 0,
    },
    layers: [],
    onEnter: (_) => {
    },
    onExit: (_) => {
    },
};

const elevationSource = new itowns.WMTSSource({
    url: 'https://data.geopf.fr/wmts?',
    crs: 'EPSG:4326',
    name: 'ELEVATION.ELEVATIONGRIDCOVERAGE.SRTM3',
    tileMatrixSet: 'WGS84G',
    format: 'image/x-bil;bits=32',
    zoom: { min: 3, max: 10 },
});
const elevationLayer = new itowns.ElevationLayer('DEM', {
    source: elevationSource,
});
Scene2.layers.push(elevationLayer);
