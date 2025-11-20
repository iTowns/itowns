import * as itowns from 'itowns';
import PlanarView from '../Views/PlanarView';
import type { Scene as SceneType } from './Scene';

// Define the view geographic extent
itowns.CRS.defs(
    'EPSG:2154',
    '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3'
    + ' +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0'
    + ' +units=m +no_defs',
);

// 844594
// 6519549

const extent = new itowns.Extent(
    'EPSG:2154',
    834594.0, 854594,
    6509549.0, 6529549.99,
);

export const Scene: SceneType = {
    title: 'Planar View',
    description: 'Scene demonstrating Planar View.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.860377, 45.760213),
        range: 30000,
        tilt: 89.5,
        heading: 0,
    },
    layers: [],
    view: new PlanarView(extent),
    ready: false,
    onCreate: async () => {
        const wmsImagerySource = new itowns.WMSSource({
            extent,
            name: 'OI.OrthoimageCoverage.HR',
            version: '1.3.0',
            url: 'https://data.geopf.fr/wms-r/wms?',
            crs: 'EPSG:2154',
            format: 'image/png',
        });
        const imageryLayer = new itowns.ColorLayer('WMS Imagery', {
            // @ts-expect-error updateStrategy undefined
            updateStrategy: {
                type: itowns.STRATEGY_DICHOTOMY,
                options: {},
            },
            source: wmsImagerySource,
        });

        const wmsElevationSource = new itowns.WMSSource({
            extent,
            name: 'ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES',
            version: '1.3.0',
            url: 'https://data.geopf.fr/wms-r/wms?',
            format: 'image/x-bil;bits=32',
            crs: 'EPSG:2154',
        });
        const elevationLayer = new itowns.ElevationLayer('WMS Elevation', {
            // @ts-expect-error source undefined
            source: wmsElevationSource,
        });

        const wfsCartoSource = new itowns.WFSSource({
            url: 'https://data.geopf.fr/wfs/ows?',
            version: '2.0.0',
            typeName: 'BDCARTO_V5:zone_d_habitation',
            crs: 'EPSG:2154',
            ipr: 'IGN',
            format: 'application/json',
        });

        const wfsCartoStyle = {
            zoom: { min: 0, max: 20 },
            text: {
                field: '{toponyme}',
                color: 'white',
                transform: 'uppercase',
                size: 15,
                haloColor: 'rgba(20,20,20, 0.8)',
                haloWidth: 3,
            },
        };

        const cartoLayer = new itowns.LabelLayer('WFS Carto', {
            // @ts-expect-error source undefined
            source: wfsCartoSource,
            style: wfsCartoStyle,
        });

        Scene.layers.push(imageryLayer);
        Scene.layers.push(elevationLayer);
        Scene.layers.push(cartoLayer);

        await Scene.view.addLayers(Scene.layers);

        Scene.ready = true;
    },
};
