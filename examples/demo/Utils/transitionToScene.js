import * as itowns from 'itowns';
import * as config from '../Config/config.js';

const moveCameraTo = (view, placement) => {
    const targetCoord = new itowns.Coordinates('EPSG:4326', placement.coord.long, placement.coord.lat);

    return itowns.CameraUtils
        .animateCameraToLookAtTarget(view, view.camera3D, {
            coord: targetCoord,
            range: placement.range,
            time: config.DURATION,
            tilt: placement.tilt,
            heading: placement.heading,
        });
};

export const transitionToScene = async (view, scene1, scene2) => {
    // disable camera controls during transition
    view.controls.states.enabled = false;

    // stop any ongoing camera animation
    view.controls.player.stop();

    const cameraPromise = moveCameraTo(view, scene2.placement).catch(console.error);

    const layersPromise = (async () => {
        if (scene1) {
            scene1.onExit(view);

            for (const layer of scene1.layers) {
                if (scene2.layers.find(l => l.id === layer.id) == null) {
                    layer.visible = false;
                }
            }
        }

        for (const layer of scene2.layers) {
            if (!view.getLayerById(layer.id)) {
                view.addLayer(layer);
            } else {
                layer.visible = true;
            }
        }
        scene2.onEnter(view);
        view.notifyChange();
    })();

    // load layers and move camera in parallel
    await Promise.all([cameraPromise, layersPromise]);

    view.controls.states.enabled = true;
};

