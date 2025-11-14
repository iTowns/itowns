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
    const view1 = scene1.view.getView();
    const view2 = scene2.view.getView();

    // disable camera controls during transition
    // @ts-expect-error controls and states property possibly undefined
    if (view2.controls && view2.controls.states) {
        // @ts-expect-error controls and states property possibly undefined
        view2.controls.states.enabled = false;
    }

    // stop any ongoing camera animation
    // @ts-expect-error controls and player property possibly undefined
    if (view1.controls && view1.controls.player) {
        // @ts-expect-error controls and states property possibly undefined
        view1.controls.player.stop();
    }

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

    // @ts-expect-error controls and states property possibly undefined
    if (view2.controls && view2.controls.states) {
        // @ts-expect-error controls and states property possibly undefined
        view2.controls!.states.enabled = true;
    }
};
