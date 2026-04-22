import * as itowns from 'itowns';
import { Config } from '../Config';
import type { SceneType } from '../Types';
import { View3D } from '../Views';
import { SceneRepository } from '../Repositories';
import * as Layers from '../Layers';
import * as Models from '../ModelLoaders';
import { Globe3dScene } from '../Scenes';
import { FeaturePickerService } from '../Services';

/**
 * Updates the UI elements with the title and description of the given scene.
 * @param scene - scene whose title and description will be displayed
 */
export const updateUIForScene = (scene: SceneType) => {
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
 * @param placement - @see SceneType.placement - tilt and heading are optional
 * @param duration - duration of the animation in ms
 * @returns Promise<any>
 */
export const moveCameraTo = (view: itowns.View, placement: SceneType['placement'],
    duration = Config.DURATION) =>
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
export const transitionToScene = async (currentScene: SceneType, nextScene: SceneType) => {
    const globeView = Globe3dScene.getView();
    const currentView = currentScene.getView();
    const transitionView = globeView.getItownsView();

    updateUIForScene(nextScene);

    const controls = transitionView.controls as itowns.GlobeControls
    & { states: { enabled: boolean }; };

    // disable camera controls during transition
    controls.states.enabled = false;

    // stop any ongoing camera animation
    controls.player.stop();

    let cameraPromise: Promise<void>;

    currentView.setVisible(false);
    const nextView = nextScene.getView();
    globeView.setVisible(true);

    await nextScene.onCreate(); // only called once per scene

    // set transition view camera to current scene location if not already there
    if (!(currentScene.view instanceof View3D)) {
        await moveCameraTo(transitionView,
            currentScene.placement, 0.1).catch(console.error);
    }

    // Compute current coordinate from camera position
    const camCoords = cameraWorldToCoordinates(
        transitionView, nextScene.placement.coord.crs);

    // compute minimum range based on distance
    // between camera coordinates and next scene coordinates
    const distance = camCoords.planarDistanceTo(nextScene.placement.coord);
    const minRange = Math.min(Math.round(distance * Config.DISTANCE_SCALER), Config.MAX_RANGE);

    // if current range is less than minimum range, unzoom first then move
    // to make transition smoother
    if (currentScene.placement.range < minRange &&
        nextScene.placement.range < minRange && distance > Config.MIN_DISTANCE) {
        cameraPromise = moveCameraTo(
            transitionView, {
                coord: camCoords,
                range: minRange,
                tilt: 89.5,
            },
            Config.DURATION / 2) // half duration since there are two steps in this case
            .catch(console.error).then(() =>
                moveCameraTo(transitionView,
                    nextScene.placement, Config.DURATION / 2).catch(console.error));
    } else {
        cameraPromise = moveCameraTo(transitionView, nextScene.placement).catch(console.error);
    }

    cameraPromise.then(() => {
        globeView.setVisible(false);
        nextView.setVisible(true);
    });

    const sceneEventPromise = Promise.all([currentScene.onExit?.(), nextScene.onEnter?.()]);

    const layerPromise = new Promise<void>((resolve) => {
        for (const layer of currentScene.layers) {
            if (nextScene.layers.find(l => l.id === layer.id) == null) {
                layer.visible = false;
            }
        }

        let featurePickingInScene = false;
        for (const layer of nextScene.layers) {
            layer.visible = true;
            if (FeaturePickerService.layers.find(l => l.id === layer.id) &&
            nextView instanceof View3D) {
                FeaturePickerService.enable(nextView);
                featurePickingInScene = true;
            }
        }

        if (FeaturePickerService.container) {
            FeaturePickerService.container.style.display =
                (featurePickingInScene) ? 'block' : 'none';
        }

        resolve();
    });

    for (const layer of Globe3dScene.layers) {
        layer.visible = true;
    }

    // load layers and move camera in parallel
    await Promise.all([cameraPromise, layerPromise, sceneEventPromise]);

    for (const layer of Globe3dScene.layers) {
        if (!nextScene.layers.find(l => l.id === layer.id)) {
            layer.visible = false;
        }
    }

    controls.states.enabled = true;
};

/**
 * Resets the given scene by disposing and recreating its view and layers.
 * As well as updating other scenes that share the same view.
 * @param scene - current scene to reset
 * @returns Promise<void>
 */
export const hardResetScene = async (scene: SceneType) => {
    await scene.onExit?.();

    let view = scene.getView();

    const layers = Object.values(Layers);
    for (const layer of layers) {
        layer.layerPromise = undefined;
        layer.cachedLayer = undefined;
    }

    const models = Object.values(Models);
    for (const model of models) {
        model.modelPromise = undefined;
        model.cachedModel = undefined;
    }

    for (const s of SceneRepository) {
        s.view?.clearInstance();
        s.view = undefined;
        s.ready = false;
        s.layers = [];
    }

    // reset Globe3dScene as well since it's used for transitions
    Globe3dScene.ready = false;
    Globe3dScene.layers = [];

    view.clearInstance();
    if (Globe3dScene.view) {
        Globe3dScene.view.clearInstance();
    }
    await scene.onCreate();
    await Globe3dScene.onCreate();

    view = scene.getView();
    view.setVisible(true);
    await scene.onEnter?.();

    // show layers and enable feature picking if applicable
    for (const layer of scene.layers) {
        layer.visible = true;

        if (FeaturePickerService.layers.find(l => l.id === layer.id) &&
        view instanceof View3D) {
            FeaturePickerService.enable(view);
        }
    }

    if (view instanceof View3D) {
        await moveCameraTo(view.getItownsView(), scene.placement, 0.1);
    }
};

/**
 * Resets the given scene by hiding and showing appropriate layers
 * @param scene - scene to reset
 * @returns Promise<void>
 */
export const resetScene = async (scene: SceneType) => {
    const view = scene.getView();
    const iTownsView = view.getItownsView();

    try {
        for (const layer of scene.layers) {
            layer.visible = false;
        }
        await scene.onExit?.();
        view.setVisible(false);

        view.setVisible(true);
        for (const layer of scene.layers) {
            layer.visible = true;
        }
        await scene.onEnter?.();

        // non-View3D scenes handle their own camera placement
        if (!(scene.view instanceof View3D)) {
            return;
        }

        const controls = iTownsView.controls as itowns.GlobeControls
        & { states: { enabled: boolean }; };

        // disable camera controls during transition
        controls.states.enabled = false;
        controls.player.stop();

        await moveCameraTo(iTownsView, scene.placement);

        controls.states.enabled = true;
    } catch (error) {
        console.error('Error during scene reset, performing hard reset instead:', error);
        await hardResetScene(scene).catch(console.error);
    }
};
