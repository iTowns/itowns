// TODO: move to GeometryLayer
function addMaterialLayerProperty(layer, key, value) {
    layer.defineLayerProperty(key, value, () => {
        const root = layer.parent ? layer.parent.object3d : layer.object3d;
        root.traverse((object) => {
            if (object.layer == layer && object.material) {
                object.material[key] = layer[key];
            } else if (object.content && object.content.layer == layer) {
                object.content.traverse((o) => {
                    if (o.material) {
                        o.material[key] = layer[key];
                    }
                });
            }
        });
    });
}

export default {

    addWireFrameCheckbox(gui, view, layer) {
        gui.add(layer, 'wireframe').name('Wireframe').onChange(() => view.notifyChange(layer));
    },

    addMaterialSize(gui, view, layer, begin, end) {
        addMaterialLayerProperty(layer, 'size', 1);
        gui.add(layer, 'size', begin, end).name('Size').onChange(() => view.notifyChange(layer));
    },

    addMaterialLineWidth(gui, view, layer, begin, end) {
        addMaterialLayerProperty(layer, 'linewidth', 1);
        gui.add(layer, 'linewidth', begin, end).name('Line Width').onChange(() => view.notifyChange(layer));
    },

    createGeometryDebugUI(datDebugTool, view, layer) {
        const gui = datDebugTool.addFolder(`Layer ${layer.id}`);
        gui.add(layer, 'visible').name('Visible').onChange(() => view.notifyChange(layer));
        gui.add(layer, 'opacity', 0, 1).name('Opacity').onChange(() => view.notifyChange(layer));
        return gui;
    },
};
