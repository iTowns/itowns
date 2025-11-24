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

    const sceneEventPromise = Promise.all([currentScene.onExit?.(), nextScene.onEnter?.()]);

    const layerPromise = new Promise<void>((resolve) => {
        const currentGuiTools = currentScene.view.getGuiTools();
        const nextGuiTools = nextScene.view.getGuiTools();

        if (currentGuiTools !== nextGuiTools || nextScene.gui) {
            currentGuiTools.gui.hide();
        }

        if (!nextScene.gui) {
            nextGuiTools.gui.show();
        }

        for (const layer of currentScene.layers) {
            if (nextScene.layers.find(l => l.id === layer.id) == null) {
                currentGuiTools.gui.removeFolder(layer.id);
                currentGuiTools.gui.removeFolder(`Layer ${layer.id}`);
                currentGuiTools.gui.hasFolder('Color Layers').removeFolder(layer.id);
                currentGuiTools.gui.hasFolder('Color Layers').removeFolder(`Layer ${layer.id}`);
                currentGuiTools.gui.hasFolder('Elevation Layers').removeFolder(layer.id);
                currentGuiTools.gui.hasFolder('Elevation Layers').removeFolder(`Layer ${layer.id}`);
                currentGuiTools.gui.hasFolder('Geoid Layers').removeFolder(layer.id);
                currentGuiTools.gui.hasFolder('Geoid Layers').removeFolder(`Layer ${layer.id}`);
                // @ts-expect-error visible property undefined
                layer.visible = false;
            } else {
                nextGuiTools.addLayerGUI(layer);
            }
        }

        for (const layer of nextScene.layers) {
            // @ts-expect-error visible property undefined
            layer.visible = true;
            nextGuiTools.addLayerGUI(layer);
        }
        resolve();
    });

    // handle atmosphere transition
    const atmospherePromise = new Promise<void>((resolve) => {
        const startRange = currentScene.placement.range;
        const endRange = nextScene.placement.range;
        const rangeDiff = endRange - startRange;

        const zoomingOut = (rangeDiff < 0) ? -1 : 1;

        const intensity = Math.min(Math.max(Math.abs(rangeDiff) / config.MAX_RANGE, 0.1), 1.0);

        const divisor = Math.max(1.5 + zoomingOut * intensity, 1.5);

        setTimeout(() => {
            if (nextView instanceof itowns.GlobeView) {
                nextView.skyManager.enabled = nextScene.atmosphere;
            }
            resolve();
        }, config.DURATION / divisor);
    });

    // load layers and move camera in parallel
    await Promise.all([cameraPromise, layerPromise, sceneEventPromise, atmospherePromise]);

    // @ts-expect-error controls and states property possibly undefined
    if (nextView.controls && nextView.controls.states) {
        // @ts-expect-error controls and states property possibly undefined
        nextView.controls!.states.enabled = true;
    }
};
