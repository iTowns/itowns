const MODES = {
    FINAL: 0, // final color
    DEPTH: 1, // depth buffer
    ID: 2,    // id object
};

function push(object3d, mode) {
    const _mode = object3d.mode !== undefined ? object3d.mode : MODES.FINAL;
    if (_mode == mode) {
        return () => { };
    }

    const setMode = m => ((node) => {
        const material = node.material;
        if (material) {
            material.mode = m;
        }
    });

    object3d.traverse(setMode(mode));
    return () => { object3d.traverse(setMode(_mode)); };
}

// Rendering mode
// According to the rendering mode, the material's object switches
// the mode property of the materials
export default { MODES, push };

