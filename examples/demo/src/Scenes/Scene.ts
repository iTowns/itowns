import * as itowns from 'itowns';
import * as THREE from 'three';
import View from '../Views/View';
import type { Layer } from '../Types/Layer';

export type Scene = {
    title: string,
    description: string,
    placement: {
        coord: itowns.Coordinates,
        range: number,
        tilt?: number,
        heading?: number,
    },
    layers: Layer[],
    view: View,
    meshes?: THREE.Object3D<THREE.Object3DEventMap>[],
    ready: boolean,
    event?: () => void,
    onCreate: () => Promise<void>,
    onEnter?: () => void,
    onExit?: () => void,
};
