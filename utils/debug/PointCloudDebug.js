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
        layer.debugUI = datUi.addFolder(`${layer.id}`);

        layer.debugUI.add(layer, 'octreeDepthLimit', -1, 20).name('Depth limit')
            .onChange(() => view.notifyChange(true));
        layer.debugUI.add(layer, 'pointBudget', 1, 15000000).name('Max point count')
            .onChange(() => view.notifyChange(true));
        layer.debugUI.add(layer.object3d.position, 'z', -50, 50).name('Z translation').onChange(() => {
            layer.object3d.updateMatrixWorld();
            view.notifyChange(true);
        });
        layer.debugUI.add(layer, 'pointSize', 0, 15).name('Point Size')
            .onChange(() => view.notifyChange(true));
        layer.debugUI.add(layer, 'overdraw', 1, 5).name('Overdraw')
            .onChange(() => view.notifyChange(true));
        layer.debugUI.add(layer, 'opacity', 0, 1).name('Opacity')
            .onChange(() => view.notifyChange(true));

        layer.dbgEnableStickyNode = false;
        layer.dbgStickyNode = '';
        layer.dbgDisplayChildren = true;
        layer.dbgDisplayParents = true;
        layer.dbgDisplaybbox = false;

        // UI
        const update = () => view.notifyChange(true);
        const sticky = layer.debugUI.addFolder('Sticky');
        sticky.add(layer, 'dbgEnableStickyNode').name('Enable sticky node').onChange(update);
        sticky.add(layer, 'dbgStickyNode').name('Sticky node name').onChange(update);
        sticky.add(layer, 'dbgDisplayChildren').name('Display children of sticky node').onChange(update);
        sticky.add(layer, 'dbgDisplayParents').name('Display parents of sticky node').onChange(update);

        // bbox
        layer.debugUI.add(layer, 'dbgDisplaybbox').name('Display bounding boxes').onChange(update);

        view.addFrameRequester('after_layer_update', () => {
            if (layer.bboxes) {
                layer.bboxes.visible = layer.dbgDisplaybbox;
            }
            if (layer.dbgEnableStickyNode) {
                layer.displayedCount = 0;
                const stickies = layer.dbgStickyNode.split(',');
                for (const pts of layer.group.children) {
                    pts.material.visible = false;
                    for (const name of stickies) {
                        if (pts.owner.name == name) {
                            pts.material.visible = true;
                        } else if (!isInHierarchy(pts.owner, name)) {
                            continue;
                        } else if (pts.owner.name.length < name.length) {
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
