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
    // tiles outline
    gui.add(state, 'showOutline').name('Show tiles outline').onChange((newValue) => {
        scene.map.layersConfiguration.getGeometryLayers()[0].showOutline = newValue;
        scene.map.tiles.children[0].traverse((object) => {
            if (object.materials) {
                object.materials[0].uniforms.showOutline = { value: newValue };
            }
        });
        scene.renderScene3D();
    });
}
window.Debug = Debug;
