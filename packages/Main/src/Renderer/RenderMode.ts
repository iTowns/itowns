import * as THREE from 'three';

const MODES = {
    FINAL: 0, // final color
    DEPTH: 1, // depth buffer
    ID: 2,    // id object
};

type RenderMode = typeof MODES[keyof typeof MODES];

type Object = THREE.Object3D & { mode: RenderMode };

function scope<T>(
    objects: Array<Object>,
    mode: RenderMode,
    callback: (objects: Array<Object>) => T,
): T {
    const oldModes = objects.map(obj => obj.mode ?? MODES.FINAL);
    for (const obj of objects) {
        obj.traverse((node) => {
            // @ts-expect-error Don't know quite what type this is yet
            const material = node.material;
            if (material) {
                material.mode = mode;
            }
        });
    }
    const res = callback(objects);
    for (const [index, obj] of objects.entries()) {
        obj.traverse((node) => {
            // @ts-expect-error Don't know quite what type this is yet
            const material = node.material;
            if (material) {
                material.mode = oldModes[index];
            }
        });
    }
    return res;
}

// Rendering mode
// According to the rendering mode, the material's object switches
// the mode property of the materials
export default { MODES, scope };

