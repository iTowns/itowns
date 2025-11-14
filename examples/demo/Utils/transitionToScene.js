import * as itowns from 'itowns';
import * as config from '../Config/config.js';

const moveCameraTo = (view, placement) => {
    if (!placement) { return Promise.resolve(); }

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

export const transitionToScene = async (scene1, scene2) => {
    // disable camera controls during transition
    // scene2.view.getView().controls.states.enabled = false;

    // stop any ongoing camera animation
    // scene1.view.getView().controls.player.stop();

    const cameraPromises = [];

    if (scene1.view.id === scene2.view.id) {
        // potentially only do this with View3D
        cameraPromises.push(moveCameraTo(scene1.view.getView(), scene2.placement).catch(console.error));
    } else {
        if (scene1.view.id === 'View3D') {
            cameraPromises.push(moveCameraTo(scene1.view.getView(), scene2.placement).catch(console.error));
            cameraPromises[0].then(() => {
                scene1.view.setVisible(false);
                scene2.view.setVisible(true);
            });
        } else if (scene2.view.id === 'View3D') {
            scene1.view.setVisible(false);
            scene2.view.setVisible(true);
            cameraPromises.push(moveCameraTo(scene2.view.getView(), scene2.placement).catch(console.error));
        } else {
            scene1.view.setVisible(false);
            scene2.view.setVisible(true);
        }
        cameraPromises.push(moveCameraTo(scene2.view.getView(), scene2.placement).catch(console.error));
    }

    const layersPromise = (async () => {
        scene1.onExit();

        for (const layer of scene1.layers) {
            if (scene2.layers.find(l => l.id === layer.id) == null) {
                layer.visible = false;
            }
        }

        for (const layer of scene2.layers) {
            if (!scene2.view.getView().getLayerById(layer.id)) {
                scene2.view.getView().addLayer(layer);
            } else {
                layer.visible = true;
            }
        }
    })();

    // load layers and move camera in parallel
    await Promise.all([...cameraPromises, layersPromise]);

    scene2.onEnter();

    // scene2.view.getView().controls.states.enabled = true;
};

