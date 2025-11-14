import * as itowns from 'itowns';
import config from '../Config/config';
import type { Scene } from '../Scenes/Scene';

const moveCameraTo = (view: itowns.View, placement: Scene['placement']) => itowns.CameraUtils
    .animateCameraToLookAtTarget(view, view.camera3D, {
        coord: placement.coord,
        range: placement.range,
        time: config.DURATION,
        tilt: placement.tilt,
        heading: placement.heading,
    });

export const transitionToScene = async (scene1: Scene, scene2: Scene) => {
    // disable camera controls during transition
    // scene2.view.getView().controls.states.enabled = false;

    // stop any ongoing camera animation
    // scene1.view.getView().controls.player.stop();


    if (!scene2.ready) {
        await scene2.onCreate();
    }
    scene1.onExit?.();
    scene2.onEnter?.();

    const cameraPromises: Promise<void>[] = [];

    if (scene1.view.id === 'View3D') {
        cameraPromises.push(moveCameraTo(scene1.view.getView(),
            scene2.placement).catch(console.error));
        cameraPromises[0].then(() => {
            scene1.view.setVisible(false);
            scene2.view.setVisible(true);
        });
    } else {
        scene1.view.setVisible(false);
        scene2.view.setVisible(true);
    }
    cameraPromises.push(moveCameraTo(scene2.view.getView(),
        scene2.placement).catch(console.error));

    const layerPromise = (async () => {
        for (const layer of scene1.layers) {
            if (scene2.layers.find(l => l.id === layer.id) == null) {
                // @ts-expect-error visible property undefined
                layer.visible = false;
            }
        }

        for (const layer of scene2.layers) {
            // @ts-expect-error visible property undefined
            layer.visible = true;
        }
    })();

    // load layers and move camera in parallel
    await Promise.all([...cameraPromises, layerPromise]);

    // scene2.view.getView().controls.states.enabled = true;
};

