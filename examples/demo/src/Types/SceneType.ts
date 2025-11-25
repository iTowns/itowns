import * as itowns from 'itowns';
import * as THREE from 'three';
import type { LayerType } from './LayerType';
import type { ViewType } from './ViewType';

export type SceneType = {
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
    atmosphere: boolean,
    ready: boolean,
    event?: () => void,
    onCreate: () => Promise<void>,
    onEnter?: () => void,
    onExit?: () => void,
};
