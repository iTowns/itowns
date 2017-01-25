/* global menuGlobe */

/**
 * Create a debug instance attached to an itowns instance
 *
 * @Constructor
 * @param {Scene} scene the itowns Scene
 * @return {Debug} a debug instance
 */
// disabling eslint errors as it is the exported constructor
function Debug(scene) {
    const gui = menuGlobe.gui.addFolder('Debug Tools');

    const state = {
        showOutline: false,
        wireframe: false,
    };

    function applyToNodeFirstMaterial(cb) {
        scene.getMap().tiles.children[0].traverse((object) => {
            if (object.materials) {
                cb(object.materials[0]);
            }
        });
        scene.renderScene3D();
    }

    // tiles outline
    gui.add(state, 'showOutline').name('Show tiles outline').onChange((newValue) => {
        scene.map.layersConfiguration.getGeometryLayers()[0].showOutline = newValue;
        applyToNodeFirstMaterial((material) => {
            material.uniforms.showOutline = { value: newValue };
        });
    });

    // tiles wireframe
    gui.add(state, 'wireframe').name('Wireframe').onChange((newValue) => {
        scene.map.layersConfiguration.getGeometryLayers()[0].wireframe = newValue;
        applyToNodeFirstMaterial((material) => {
            material.wireframe = newValue;
        });
    });
}
window.Debug = Debug;
