import * as THREE from 'three';

const MODES = {
    FINAL: 0, // final color
    DEPTH: 1, // depth buffer
    ID: 2,    // id object
};

type RenderMode = typeof MODES[keyof typeof MODES];

/**
 * @privateRemarks
 * Look at the use of CommonMaterial in PointsMaterial to see why this interface
 * workaround is required: we're currently dynamically adding properties to
 * materials as aliases to the uniform values.
 */
export interface ModalObject extends THREE.Object3D {
    mode: RenderMode;
    material: THREE.Material & { mode: RenderMode }
}

/**
 * Sets the rendering mode of all the `objects` and their children to `mode`,
 * runs the `callback`, reverts the rendering mode and returns the result.
 */
function scope<T>(
    objects: Array<ModalObject>,
    mode: RenderMode,
    callback: (objects: Array<ModalObject>) => T,
): T {
    const oldModes = objects.map(obj => obj.mode ?? MODES.FINAL);
    for (const obj of objects) {
        obj.traverse((node) => {
            const material = (node as ModalObject).material;
            if (material) {
                material.mode = mode;
            }
        });
    }
    const res = callback(objects);
    for (const [index, obj] of objects.entries()) {
        obj.traverse((node) => {
            const material = (node as ModalObject).material;
            if (material) {
                material.mode = oldModes[index];
            }
        });
    }
    return res;
}

export default { MODES, scope };
