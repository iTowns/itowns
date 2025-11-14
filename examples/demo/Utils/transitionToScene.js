import * as itowns from 'itowns';
import * as config from '../Config/config.js';

const moveCameraTo = (view, placement) => {
    const targetCoord = new itowns.Coordinates('EPSG:4326', placement.coord.long, placement.coord.lat);

    return itowns.CameraUtils
        .animateCameraToLookAtTarget(view, view.camera3D, {
            coord: targetCoord,
            range: placement.range,
            time: config.DURATION,
            tilt: placement.tilt 
        });
};

export const transitionToScene = async (view, scene1, scene2) => {
    const cameraPromise = moveCameraTo(view, scene2.placement).catch(console.error);

    const layersPromise = (async () => {
        if (scene1) {
            for (let layer of scene1.layers) {
                if (scene2.layers.find(l => l.id === layer.id) == null) {
                    view.removeLayer(layer.id, true);
                }
            }
            scene1.onExit(view);
        }

        for (let layer of scene2.layers) {
            if (!view.getLayerById(layer.id)) {
                view.addLayer(layer);
            }
        }
        scene2.onEnter(view);
        view.notifyChange();

        console.log('Current layers:', view.getLayers());
    })();

    await Promise.all([cameraPromise, layersPromise]);
};

