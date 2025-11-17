import * as itowns from 'itowns';
import config from '../Config/config';
import type { Scene } from '../Scenes/Scene';
import View3D from '../Views/View3D';

/**
 * Updates the UI elements with the title and description of the given scene.
 * @param scene - scene whose title and description will be displayed
 */
export const updateUIForScene = (scene: Scene) => {
    const title = document.getElementById('sceneTitle');
    if (!title) {
        throw new Error('No element with id "sceneTitle" found in the document.');
    }
    title.textContent = scene.title;
    const description = document.getElementById('sceneDescription');
    if (!description) {
        throw new Error('No element with id "sceneDescription" found in the document.');
    }
    description.textContent = scene.description;
};

/**
 * Convert the current camera world position to Coordinates
 * by using view.referenceCrs and setFromVector3, then reproject to targetCrs.
 * @param view - current itowns view
 * @param targetCrs - target CRS of the returned Coordinates
 * @returns Coordinates in targetCrs
 */
const cameraWorldToCoordinates = (view: itowns.View, targetCrs: string) => {
    const camCoord = new itowns.Coordinates(view.referenceCrs);
    camCoord.setFromVector3(view.camera3D.position);
    return camCoord.as(targetCrs);
};

/**
 * Moves the camera of a view to a given placement over a specified duration.
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
 * Transitions the camera and layers from the current scene to the next scene.
 * @param currentScene - current scene that is being transitioned from
 * @param nextScene - next scene that is being transitioned to
 * @returns Promise<void>
 */
export const transitionToScene = async (currentScene: Scene, nextScene: Scene) => {
    const currentView = currentScene.view.getView();
    const nextView = nextScene.view.getView();
    const transitionView = new View3D();

    updateUIForScene(nextScene);

    // disable camera controls during transition
    // @ts-expect-error controls and states property possibly undefined
    if (nextView.controls && nextView.controls.states) {
        // @ts-expect-error controls and states property possibly undefined
        nextView.controls.states.enabled = false;
    }

    // stop any ongoing camera animation
    // @ts-expect-error controls and player property possibly undefined
    if (currentView.controls && currentView.controls.player) {
        // @ts-expect-error controls and states property possibly undefined
        currentView.controls.player.stop();
    }

    if (!nextScene.ready) {
        await nextScene.onCreate(); // only called once per scene
    }

    let cameraPromise: Promise<void>;

    currentScene.view.setVisible(false);
    transitionView.setVisible(true);

    // set transition view camera to current scene location if possible
    if (currentScene.view.id === 'View3D') {
        transitionView.getView().camera3D.position.copy(currentView.camera3D.position);
    } else {
        await moveCameraTo(transitionView.getView(),
            currentScene.placement, 1).catch(console.error);
    }

    // Compute current coordinate from camera position
    const camCoords = cameraWorldToCoordinates(
        transitionView.getView(), nextScene.placement.coord.crs);

    // compute minimum range based on distance
    // between camera coordinates and next scene coordinates
    const distance = camCoords.planarDistanceTo(nextScene.placement.coord);
    const minRange = Math.min(Math.round(distance * config.DISTANCE_SCALER), config.MAX_RANGE);

    // if current range is less than minimum range, unzoom first then move
    // to make transition smoother
    if (currentScene.placement.range < minRange && nextScene.placement.range < minRange) {
        cameraPromise = moveCameraTo(
            transitionView.getView(), {
                coord: camCoords,
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

    for (const layer of nextScene.layers) {
        // @ts-expect-error visible property undefined
        layer.visible = true;
    }

    // load layers and move camera in parallel
    await Promise.all([cameraPromise, currentScene.onExit?.(), nextScene.onEnter?.()]);

    for (const layer of currentScene.layers) {
        if (nextScene.layers.find(l => l.id === layer.id) == null) {
            // @ts-expect-error visible property undefined
            layer.visible = false;
        }
    }

    // @ts-expect-error controls and states property possibly undefined
    if (nextView.controls && nextView.controls.states) {
        // @ts-expect-error controls and states property possibly undefined
        nextView.controls!.states.enabled = true;
    }
};
