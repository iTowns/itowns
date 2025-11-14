import * as itowns from 'itowns';
import config from '../Config/config';
import type { Scene } from '../Scenes/Scene';
import View3D from '../Views/View3D';

/**
 *
 * @param view - current view whose camera will be moved
 * @param placement - @see Scene.placement - tilt and heading are optional
 * @param duration - duration of the animation in ms
 * @returns Promise<any>
 */
const moveCameraTo = (view: itowns.View, placement: Scene['placement'],
    duration = config.DURATION) =>
    itowns.CameraUtils.animateCameraToLookAtTarget(view, view.camera3D, {
        coord: placement.coord,
        range: placement.range,
        time: duration,
        tilt: placement.tilt,
        heading: placement.heading,
    });

/**
 *
 * @param currentScene - current scene that is being transitioned from
 * @param nextScene - next scene that is being transitioned to
 * @returns Promise<void>
 */
export const transitionToScene = async (currentScene: Scene, nextScene: Scene) => {
    const view1 = currentScene.view.getView();
    const view2 = nextScene.view.getView();
    const transitionView = new View3D();

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

    if (!nextScene.ready) {
        await nextScene.onCreate(); // only called once per scene
    }

    // if scenes require any action on exit/enter, call them
    currentScene.onExit?.();
    nextScene.onEnter?.();

    let cameraPromise: Promise<void>;

    currentScene.view.setVisible(false);
    transitionView.setVisible(true);

    // set transition view camera to currentScene placement first
    await moveCameraTo(transitionView.getView(), currentScene.placement, 1).catch(console.error);

    // compute minimum range based on distance between scenes
    const distance = currentScene.placement.coord.planarDistanceTo(nextScene.placement.coord);
    const minRange = Math.min(Math.round(distance * config.DISTANCE_SCALER), config.MAX_RANGE);

    // if current range is less than minimum range, unzoom first then move
    // to make transition smoother
    if (currentScene.placement.range < minRange) {
        cameraPromise = moveCameraTo(
            transitionView.getView(), {
                coord: currentScene.placement.coord,
                range: minRange,
                tilt: 89.5,
            },
            config.DURATION / 2) // half duration since there are two steps in this case
            .catch(console.error).then(() =>
                moveCameraTo(transitionView.getView(),
                    nextScene.placement, config.DURATION / 2).catch(console.error));
    } else {
        cameraPromise = moveCameraTo(transitionView.getView(),
            nextScene.placement).catch(console.error);
    }

    cameraPromise.then(() => {
        transitionView.setVisible(false);
        nextScene.view.setVisible(true);
    });

    const layerPromise = (async () => {
        for (const layer of currentScene.layers) {
            if (nextScene.layers.find(l => l.id === layer.id) == null) {
                // @ts-expect-error visible property undefined
                layer.visible = false;
            }
        }

        for (const layer of nextScene.layers) {
            // @ts-expect-error visible property undefined
            layer.visible = true;
        }
    })();

    // load layers and move camera in parallel
    await Promise.all([cameraPromise, layerPromise]);

    // @ts-expect-error controls and states property possibly undefined
    if (view2.controls && view2.controls.states) {
        // @ts-expect-error controls and states property possibly undefined
        view2.controls!.states.enabled = true;
    }

    const title = document.getElementById('sceneTitle');
    if (title) {
        title.textContent = nextScene.title;
    }

    const description = document.getElementById('sceneDescription');
    if (description) {
        description.textContent = nextScene.description;
    }
};
