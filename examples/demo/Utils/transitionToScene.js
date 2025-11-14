// import { moveCameraTo } from "./moveCameraTo";
import * as itowns from "itowns";

const moveCameraTo = (view, placement) => {
    const duration = 2000 ;
    
    const targetCoord = new itowns.Coordinates('EPSG:4326', placement.coord.lon, placement.coord.lat);

    return itowns.CameraUtils
        .sequenceAnimationsToLookAtTarget(view, view.camera3D, [{
            coord: targetCoord,
            range: placement.range,
            time: duration
        }]);
};

export const transitionToScene = async (view, scene1, scene2) => {
    const cameraPromise = moveCameraTo(view, scene2.placement).catch(console.error);

    const layersPromise = (async () => {
        for (let layer of scene1.layers) {
            view.removeLayer(layer.id);
        }
        for (let layer of scene2.layers) {
            view.addLayer(layer);
        }
        scene1.onExit(view);
        scene2.onEnter(view);
    })();

    await Promise.all([cameraPromise, layersPromise]);
};