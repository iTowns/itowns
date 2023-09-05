import { PNTS_MODE, PNTS_SHAPE, PNTS_SIZE_MODE } from 'Renderer/PointsMaterial';

export default {
    initTools(view, layer, datUi) {
        const update = () => view.notifyChange(layer, true);
        layer.debugUI = datUi.addFolder(`${layer.id}`);

        layer.debugUI.add(layer, 'visible').name('Visible').onChange(update);
        layer.debugUI.add(layer, 'sseThreshold').name('SSE threshold').onChange(update);
        layer.debugUI.add(layer, 'octreeDepthLimit', -1, 20).name('Depth limit').onChange(update);
        layer.debugUI.add(layer, 'pointBudget', 1, 15000000).name('Max point count').onChange(update);
        layer.debugUI.add(layer.object3d.position, 'z', -50, 50).name('Z translation').onChange(() => {
            layer.object3d.updateMatrixWorld();
            view.notifyChange(layer);
        });

        layer.dbgStickyNode = '';
        layer.dbgDisplaySticky = false;
        layer.dbgDisplayChildren = true;
        layer.dbgDisplayParents = true;

        const styleUI = layer.debugUI.addFolder('Styling');
        if (layer.material.mode != undefined) {
            styleUI.add(layer.material, 'mode', PNTS_MODE).name('Display mode').onChange(update);
            styleUI.add(layer, 'maxIntensityRange', 0, 1).name('Intensity max').onChange(update);
        }
        if (layer.material.shape != undefined) {
            styleUI.add(layer.material, 'shape', PNTS_SHAPE).name('Shape mode').onChange(update);
        }
        styleUI.add(layer, 'opacity', 0, 1).name('Layer Opacity').onChange(update);
        styleUI.add(layer, 'pointSize', 0, 15).name('Point Size').onChange(update);
        if (layer.material.sizeMode != undefined) {
            styleUI.add(layer.material, 'sizeMode', PNTS_SIZE_MODE).name('Point size mode').onChange(() => {
                update();
            });
        }
        styleUI.add(layer.material, 'minAttenuatedSize', 0, 15).name('Min attenuated size').onChange(update);
        styleUI.add(layer.material, 'maxAttenuatedSize', 0, 15).name('Max attenuated size').onChange(update);
        if (layer.material.picking != undefined) {
            styleUI.add(layer.material, 'picking').name('Display picking id').onChange(update);
        }

        // UI
        const debugUI = layer.debugUI.addFolder('Debug');
        debugUI.add(layer.bboxes, 'visible').name('Display Bounding Boxes').onChange(update);
        debugUI.add(layer, 'dbgStickyNode').name('Sticky node name').onChange(update);
        debugUI.add(layer, 'dbgDisplaySticky').name('Display sticky node').onChange(update);
        debugUI.add(layer, 'dbgDisplayChildren').name('Display children of sticky node').onChange(update);
        debugUI.add(layer, 'dbgDisplayParents').name('Display parents of sticky node').onChange(update);

        const isInHierarchy = function isInHierarchy(name1, name2) {
            return (layer.dbgDisplaySticky && name1 === name2)
                || (layer.dbgDisplayParents && name1.startsWith(name2))
                || (layer.dbgDisplayChildren && name2.startsWith(name1));
        };

        view.addFrameRequester('before_layer_update', () => {
            if (layer.dbgStickyNode.length) {
                layer.displayedCount = 0;
                const stickies = layer.dbgStickyNode.split(',');
                for (const pts of layer.group.children) {
                    pts.visible = stickies.some(name => isInHierarchy(name, pts.owner.name));
                    if (pts.boxHelper) {
                        pts.boxHelper.visible = pts.visible;
                    }
                    if (pts.visible) {
                        layer.displayedCount += pts.geometry.attributes.position.count;
                    }
                }
            }
        });
    },
};
