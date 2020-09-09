import { MODE } from 'Renderer/PointsMaterial';

function isInHierarchy(elt, hierarchyNode) {
    if (elt.name.length > hierarchyNode.length) {
        return elt.name.startsWith(hierarchyNode);
    } else if (elt.name.length < hierarchyNode.length) {
        return hierarchyNode.startsWith(elt.name);
    } else {
        return hierarchyNode === elt.name;
    }
}

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

        layer.dbgEnableStickyNode = false;
        layer.dbgStickyNode = '';
        layer.dbgDisplayChildren = true;
        layer.dbgDisplayParents = true;
        layer.dbgDisplaybbox = false;

        var styleUI = layer.debugUI.addFolder('Styling');
        if (layer.material.mode != undefined) {
            styleUI.add(layer.material, 'mode', MODE).name('Display mode').onChange(update);
            styleUI.add(layer, 'maxIntensityRange', 0, 1).name('Intensity max').onChange(update);
        }
        styleUI.add(layer, 'opacity', 0, 1).name('Layer Opacity').onChange(update);
        styleUI.add(layer, 'pointSize', 0, 15).name('Point Size').onChange(update);
        styleUI.add(layer, 'dbgDisplaybbox').name('Display Bounding Boxes').onChange(update);
        if (layer.material.picking != undefined) {
            styleUI.add(layer.material, 'picking').name('Display picking id').onChange(update);
        }

        // UI
        const sticky = layer.debugUI.addFolder('Sticky');
        sticky.add(layer, 'dbgEnableStickyNode').name('Enable sticky node').onChange(update);
        sticky.add(layer, 'dbgStickyNode').name('Sticky node name').onChange(update);
        sticky.add(layer, 'dbgDisplayChildren').name('Display children of sticky node').onChange(update);
        sticky.add(layer, 'dbgDisplayParents').name('Display parents of sticky node').onChange(update);

        view.addFrameRequester('before_layer_update', () => {
            if (layer.bboxes) {
                layer.bboxes.visible = layer.dbgDisplaybbox;
            }
            if (layer.dbgEnableStickyNode) {
                layer.displayedCount = 0;
                const stickies = layer.dbgStickyNode.split(',');
                for (const pts of layer.group.children) {
                    pts.material.visible = false;
                    for (const name of stickies) {
                        if (pts.userData.potreeNode.name == name) {
                            pts.material.visible = true;
                        } else if (!isInHierarchy(pts.userData.potreeNode, name)) {
                            continue;
                        } else if (pts.userData.potreeNode.name.length < name.length) {
                            pts.material.visible = layer.dbgDisplayParents;
                            break;
                        } else {
                            pts.material.visible = layer.dbgDisplayChildren;
                        }
                        if (pts.material.visible) {
                            break;
                        }
                    }
                    if (pts.material.visible) {
                        layer.displayedCount += pts.geometry.attributes.position.count;
                    }
                }
            }
            for (const pts of layer.group.children) {
                if (pts.boxHelper) {
                    pts.boxHelper.material.visible = layer.dbgDisplaybbox
                        && pts.visible && pts.material.visible;
                }
            }
        });
    },
};
