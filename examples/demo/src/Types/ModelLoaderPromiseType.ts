import * as THREE from 'three';

// Base properties shared by all layer promise types
type ModelLoaderPromiseType = {
    modelPromise: Promise<THREE.Object3D> | undefined;
    cachedModel: THREE.Object3D | undefined;
    getModel: () => Promise<THREE.Object3D>;
};

export default ModelLoaderPromiseType;
