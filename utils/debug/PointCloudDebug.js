/* global itowns */
function isInHierarchy(elt, hierarchyNode) {
    if (elt.name.length > hierarchyNode.length) {
        return elt.name.startsWith(hierarchyNode);
    } else if (elt.name.length < hierarchyNode.length) {
        return hierarchyNode.startsWith(elt.name);
    } else {
        return hierarchyNode === elt.name;
    }
}

function visibilityDump(element) {
    if (element.obj && element.obj.material.visible) {
        const result = {
            count: element.obj.geometry.attributes.position.count,
            displayed: `${Math.round(100 * element.obj.geometry.drawRange.count / element.obj.geometry.attributes.position.count)} %`,
            density: element.density,
            surface: element.surfaceOnScreen,
            shouldBeLoaded: element.shouldBeLoaded,
        };
        for (const c of element.children) {
            const sub = visibilityDump(c);
            if (sub) {
                result[c.name] = sub;
            }
        }
        return result;
    }
}

export default {
    initTools(view, layer, datUi) {
        const oldUpdate = layer.update.bind(layer);
        const oldPreUpdate = layer.preUpdate.bind(layer);

        layer.debugUI = datUi.addFolder(`${layer.id}`);

        layer.debugUI.add(layer, 'octreeDepthLimit', -1, 20).name('Depth limit')
            .onChange(() => view.notifyChange(true));
        layer.debugUI.add(layer, 'pointBudget', 1, 15000000).name('Max point count')
            .onChange(() => view.notifyChange(true));
        layer.debugUI.add(layer.object3d.position, 'z', -50, 50).name('Z translation').onChange(() => {
            layer.object3d.updateMatrixWorld();
            view.notifyChange(true);
        });
        const surf = layer.debugUI.addFolder('Surface Method params');
        surf.add(layer, 'pointSize', 0, 15).name('Point Size')
            .onChange(() => view.notifyChange(true));
        surf.add(layer, 'overdraw', 1, 5).name('Overdraw')
            .onChange(() => view.notifyChange(true));
        surf.add(layer, 'opacity', 0, 1).name('Opacity')
            .onChange(() => view.notifyChange(true));

        // state
        if (__DEBUG__) {
            layer.dbgEnableStickyNode = false;
            layer.dbgStickyNode = '';
            layer.dbgStickyNodeColor = '#ff000f';
            layer.dbgDisplayChildren = true;
            layer.dbgDisplayParents = true;

            layer.dbgDisplaybbox = false;

            layer.dbgEnablePointCount = false;
            layer.dbgPointCountThreshold1 = 10000;
            layer.dbgPointCountThreshold2 = 100000;
            layer.dbgDisplayType = 'all';

            // UI
            const update = () => view.notifyChange(true);
            const sticky = layer.debugUI.addFolder('Sticky');
            sticky.add(layer, 'dbgEnableStickyNode').name('Enable sticky node').onChange(update);
            sticky.addColor(layer, 'dbgStickyNodeColor').name('Sticky node color').onChange(update);
            sticky.add(layer, 'dbgStickyNode').name('Sticky node name').onChange(update);
            sticky.add(layer, 'dbgDisplayChildren').name('Display children of sticky node').onChange(update);
            sticky.add(layer, 'dbgDisplayParents').name('Display parents of sticky node').onChange(update);

            // bbox
            layer.debugUI.add(layer, 'dbgDisplaybbox').name('Display bounding boxes').onChange(update);

            // point count
            const pcount = layer.debugUI.addFolder('Point count');
            pcount.add(layer, 'dbgEnablePointCount').name('Enable point count').onChange(update);
            pcount.add(layer, 'dbgPointCountThreshold1').name('Threshold 1').min(1).max(1000000)
                .onChange(update);
            pcount.add(layer, 'dbgPointCountThreshold2').name('Threshold 2').min(1).max(1000000)
                .onChange(update);
            pcount.add(layer, 'dbgDisplayType', ['all', 'red', 'green', 'blue']).onChange(update);

            const dump = {
                fn: () => {
                    const d = visibilityDump(layer.root);
                    // eslint-disable-next-line no-console
                    console.log(d);
                    // eslint-disable-next-line no-console
                    console.log(JSON.stringify(d));
                },
            };
            layer.debugUI.add(dump, 'fn').name('Dump visible nodes to console');

            // hook preUpdate to reset the previously sticky node
            layer.preUpdate = (...args) => {
                if (layer._currentDbgNode) {
                    for (const n of layer._currentDbgNode) {
                        if (n.obj) {
                            n.obj.material.uniforms.useCustomColor.value = false;
                        }
                    }
                }
                layer._currentDbgNode = [];
                if (layer.bboxes) {
                    layer.bboxes.visible = layer.dbgDisplaybbox;
                }
                return oldPreUpdate(...args);
            };

            // hook update
            layer.update = (context, layer, elt) => {
                if (elt.obj) {
                    elt.obj.material.uniforms.useCustomColor.value = false;
                    if (elt.obj.boxHelper) {
                        elt.obj.boxHelper.material.visible = false;
                    }
                }

                const stickies = layer.dbgStickyNode.split(',');
                if (layer.dbgEnableStickyNode) {
                    let keepMe = false;
                    for (const name of stickies) {
                        if (isInHierarchy(elt, name) && // is it either a parent or a child of stickyNode?
                            (layer.dbgDisplayChildren || elt.name.length <= name.length)) { // is it a child and we don't display them?
                            keepMe = true;
                            break;
                        }
                    }
                    if (!keepMe) {
                        return;
                    }
                }
                const elms = oldUpdate(context, layer, elt);

                if (layer.dbgEnableStickyNode) {
                    if (stickies.indexOf(elt.name) >= 0) { // is this node the sticky node?
                        layer._currentDbgNode.push(elt);
                        if (elt.obj) {
                            elt.obj.material.uniforms.useCustomColor.value = true;
                            elt.obj.material.uniforms.customColor.value = new itowns.THREE.Color(layer.dbgStickyNodeColor);
                        }
                    } else {
                        for (const name of stickies) {
                            if (elt.name.length < name.length && name.startsWith(elt.name) && elt.obj) { // is it a parent of sticky node ?
                                const v = elt.obj.material.visible;
                                elt.obj.material.visible = layer.dbgDisplayParents;

                                if (v && !elt.obj.material.visible) {
                                    layer.counters.displayedCount -= elt.obj.geometry.drawRange.count;
                                }
                            }
                        }
                    }
                } else if (layer.dbgEnablePointCount) {
                    if (elt.obj && elt.obj.material.visible) {
                        elt.obj.material.uniforms.useCustomColor.value = true;

                        const pc = elt.obj.geometry.drawRange.count;
                        if (pc < layer.dbgPointCountThreshold1) {
                            elt.obj.material.uniforms.customColor.value.setRGB(1, 0, 0);
                            if (layer.dbgDisplayType != 'all' && layer.dbgDisplayType != 'red') {
                                elt.obj.material.visible = false;
                            }
                        } else if (pc < layer.dbgPointCountThreshold2) {
                            elt.obj.material.uniforms.customColor.value.setRGB(0, 1, 0);
                            if (layer.dbgDisplayType != 'all' && layer.dbgDisplayType != 'green') {
                                elt.obj.material.visible = false;
                            }
                        } else {
                            elt.obj.material.uniforms.customColor.value.setRGB(0, 0, 1);
                            if (layer.dbgDisplayType != 'all' && layer.dbgDisplayType != 'blue') {
                                elt.obj.material.visible = false;
                            }
                        }
                        if (elt.obj.boxHelper) {
                            elt.obj.boxHelper.material.color.copy(elt.obj.material.uniforms.customColor.value);
                        }
                    }
                }
                if (elt.obj && elt.obj.boxHelper) {
                    elt.obj.boxHelper.material.visible = elt.obj.material.visible;
                }

                return elms;
            };
        }
    },
};
