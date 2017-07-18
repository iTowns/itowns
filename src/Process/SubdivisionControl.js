export default {
    preUpdate: (context, layer) => {
        context.colorLayers = context.view.getLayers(
            (l, a) => a && a.id == layer.id && l.type == 'color');
        context.elevationLayers = context.view.getLayers(
            (l, a) => a && a.id == layer.id && l.type == 'elevation');
    },

    hasEnoughTexturesToSubdivide: (context, layer, node) => {
        // Prevent subdivision if node is covered by at least one elevation layer
        // and if node doesn't have a elevation texture yet.
        for (const e of context.elevationLayers) {
            if (e.tileInsideLimit(node, e) && !node.isElevationLayerLoaded()) {
                return false;
            }
        }

        // Prevent subdivision if missing color texture
        for (const c of context.colorLayers) {
            if (c.tileInsideLimit(node, c) && !node.isColorLayerLoaded(c.id)) {
                return false;
            }
        }

        return true;
    },
};
