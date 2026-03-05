import * as itowns from 'itowns';
import { PlanarView } from '../Views';
import type { SceneType } from '../Types';
import * as Layers from '../Layers';

// Define the view geographic extent
itowns.CRS.defs(
    'EPSG:2154',
    '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3'
    + ' +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0'
    + ' +units=m +no_defs',
);

const extent = new itowns.Extent(
    'EPSG:2154',
    834594.0, 854594,
    6509549.0, 6529549.99,
);

export const PlanarViewScene: SceneType = {
    title: 'Go Local',
    description: 'Seamlessly transition between global and local coordinate systems. '
    + 'Support for national projections like Lambert-93 (EPSG:2154).',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.860377, 45.760213),
        range: 30000,
        tilt: 89.5,
        heading: 0,
    },
    layers: [],
    view: undefined,
    cameraPlacement: null,
    ready: false,
    getView: () => {
        if (!PlanarViewScene.view) {
            throw new Error('Planar View Scene view is not initialized');
        }
        return PlanarViewScene.view;
    },
    getItownsView: () => PlanarViewScene.getView().getItownsView(),
    onCreate: async () => {
        if (PlanarViewScene.ready) {
            return;
        }
        PlanarViewScene.view = new PlanarView(extent);

        PlanarViewScene.layers.push(await Layers.OrthoImageWMSLayer.getLayer(extent));
        PlanarViewScene.layers.push(await Layers.ElevationWMSLayer.getLayer(extent));
        PlanarViewScene.layers.push(await Layers.CartoLabelLayer.getLayer());

        await PlanarViewScene.view.addLayers(PlanarViewScene.layers);

        PlanarViewScene.cameraPlacement = PlanarViewScene.getItownsView().camera3D.position.clone();

        PlanarViewScene.ready = true;
    },
    onEnter: async () => {
        const view = PlanarViewScene.getItownsView();

        view.camera3D.position.copy(PlanarViewScene.cameraPlacement!);
        view.camera3D.updateMatrixWorld(true);
        view.notifyChange(view.camera3D);
    },
};
