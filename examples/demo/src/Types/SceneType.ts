import * as itowns from 'itowns';
import * as THREE from 'three';
import type LayerType from './LayerType';
import type ViewType from './ViewType';

type SceneType = {
    title: string,
    description: string,
    placement: {
        coord: itowns.Coordinates,
        range: number,
        tilt?: number,
        heading?: number,
    },
    layers: LayerType[],
    view: ViewType,
    meshes?: THREE.Object3D<THREE.Object3DEventMap>[],
    cameraPlacement?: THREE.Vector3 | null,
    ready: boolean,
    event?: () => void,
    onCreate: () => Promise<void>,
    onEnter?: () => Promise<void>,
    onExit?: () => Promise<void>,
};

export default SceneType;
