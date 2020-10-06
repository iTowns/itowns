import * as THREE from 'three';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import Layer from 'Layer/Layer';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import Label from 'Core/Label';
import { FEATURE_TYPES } from 'Core/Feature';

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

const _extent = new Extent('EPSG:4326', 0, 0, 0, 0);

/**
 * A layer to handle a bunch of `Label`. This layer can be created on its own,
 * but it is better to use the option `labelEnabled` on another `Layer` to let
 * it work with it (see the `vector_tile_raster_2d` example).
 *
 * @property {boolean} isLabelLayer - Used to checkout whether this layer is a
 * LabelLayer.  Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class LabelLayer extends Layer {
    /**
     * @constructor
     * @extends Layer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     */
    constructor(id, config = {}) {
        super(id, config);

        this.isLabelLayer = true;
        this.domElement = document.createElement('div');
        this.domElement.id = `itowns-label-${this.id}`;
        this.defineLayerProperty('visible', true, () => {
            this.domElement.style.display = this.visible ? 'block' : 'none';
        });

        this.buildExtent = true;
    }

    /**
     * Reads each {@link FeatureGeometry} that contains label configuration, and
     * creates the corresponding {@link Label}. To create a `Label`, a geometry
     * needs to have a `label` object with at least a few properties:
     * - `content`, which refers to `Label#content`
     * - `position`, which refers to `Label#position`
     * - (optional) `config`, containing miscellaneous configuration for the
     *   label
     *
     * The geometry (or its parent Feature) needs to have a Style set.
     *
     * @param {FeatureCollection} data - The FeatureCollection to read the
     * labels from.
     * @param {Extent} extent
     *
     * @return {Label[]} An array containing all the created labels.
     */
    convert(data, extent) {
        const labels = [];

        const layerField = this.style && this.style.text && this.style.text.field;

        // Converting the extent now is faster for further operation
        extent.as(data.crs, _extent);
        coord.crs = data.crs;

        data.features.forEach((f) => {
            // TODO: add support for LINE and POLYGON
            if (f.type !== FEATURE_TYPES.POINT) {
                return;
            }

            const featureField = f.style && f.style.text.field;

            f.geometries.forEach((g) => {
                const minzoom = (g.properties.style && g.properties.style.zoom.min)
                    || (f.style && f.style.zoom.min)
                    || (this.style && this.style.zoom && this.style.zoom.min);

                // Don't create a label if it is in-between two steps of zoom
                if (minzoom !== undefined) {
                    if (!this.source.isFileSource) {
                        if (data.extent.zoom != minzoom) { return; }
                    } else if (extent.zoom != minzoom) { return; }
                }

                // NOTE: this only works because only POINT is supported, it
                // needs more work for LINE and POLYGON
                coord.setFromArray(f.vertices, g.size * g.indices[0].offset);
                data.transformCoordinates(coord);
                if (f.size == 2) { coord.z = 0; }
                if (!_extent.isPointInside(coord)) { return; }

                const geometryField = g.properties.style && g.properties.style.text.field;
                let content;
                if (!geometryField && !featureField && !layerField) {
                    // Check if there is an icon, with no text
                    if (!(g.properties.style && g.properties.style.icon)
                        && !(f.style && f.style.icon)
                        && !(this.style && this.style.icon)) {
                        return;
                    }
                } else if (geometryField) {
                    content = g.properties.style.getTextFromProperties(g.properties);
                } else if (featureField) {
                    content = f.style.getTextFromProperties(g.properties);
                } else if (layerField) {
                    content = this.style.getTextFromProperties(g.properties);
                }

                const label = new Label(content,
                    coord.clone(),
                    g.properties.style || f.style || this.style);
                label.layerId = this.id;

                if (f.size == 2) {
                    label.needsAltitude = true;
                }

                labels.push(label);
            });
        });

        return labels;
    }

    // placeholder
    preUpdate() {}

    update(context, layer, node, parent) {
        if (!parent && node.children.length) {
            // if node has been removed dispose three.js resource
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, node);
            return;
        }

        if (this.frozen || !node.visible || !this.visible) {
            return;
        }

        const extentsDestination = node.getExtentsByProjection(this.source.crs) || [node.extent];
        const zoomDest = extentsDestination[0].zoom;

        if (zoomDest < layer.zoom.min || zoomDest > layer.zoom.max) {
            return;
        }

        if (node.layerUpdateState[this.id] === undefined) {
            node.layerUpdateState[this.id] = new LayerUpdateState();
        }

        const elevationLayer = node.material.getElevationLayer();
        if (elevationLayer && node.layerUpdateState[elevationLayer.id].canTryUpdate()) {
            node.children.forEach((c) => {
                if (c.isLabel && c.needsAltitude && c.updateElevationFromLayer(this.parent)) {
                    c.update3dPosition(context.view.referenceCrs);
                }
            });
        }

        if (!node.layerUpdateState[this.id].canTryUpdate()) {
            return;
        }


        const extentsSource = [];
        for (const extentDest of extentsDestination) {
            const ext = this.source.crs == extentDest.crs ? extentDest : extentDest.as(this.source.crs);
            if (!this.source.extentInsideLimit(ext)) {
                node.layerUpdateState[this.id].noMoreUpdatePossible();
                return;
            }
            extentsSource.push(extentDest);
        }
        node.layerUpdateState[this.id].newTry();

        const command = {
            layer: this,
            extentsSource,
            view: context.view,
            threejsLayer: this.threejsLayer,
            requester: node,
        };

        return context.scheduler.execute(command).then((result) => {
            if (!result) { return; }

            const renderer = context.view.mainLoop.gfxEngine.label2dRenderer;
            const labelsDiv = [];

            result.forEach((labels) => {
                if (!node.parent) {
                    labels.forEach((l) => {
                        ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, l);
                        renderer.removeLabelDOM(l);
                    });
                    return;
                }

                labels.forEach((label) => {
                    if (label.needsAltitude) {
                        label.updateElevationFromLayer(this.parent);
                    }

                    node.add(label);
                    label.update3dPosition(context.view.referenceCrs);

                    if (node.level < 4) {
                        label.horizonCullingPoint = new THREE.Vector3();
                        label.updateHorizonCullingPoint();
                    }

                    labelsDiv.push(label.content);
                });
            });

            if (labelsDiv.length > 0) {
                // Add all labels for this tile at once to batch it
                let nodeDomElement = node.domElements[this.id];
                if (!nodeDomElement) {
                    nodeDomElement = { dom: document.createElement('div'), visible: true };
                    node.domElements[this.id] = nodeDomElement;
                }

                nodeDomElement.dom.append(...labelsDiv);
                const closestDomElement = node.findClosestDomElement(this.id);
                ((closestDomElement && closestDomElement.dom) || this.domElement).appendChild(nodeDomElement.dom);
                nodeDomElement.visible = true;

                // Batch update the dimensions of labels all at once to avoid
                // redraw for at least this tile.
                result.forEach(labels => labels.forEach(label => label.initDimensions()));
                result.forEach(labels => labels.forEach((label) => { label.visible = false; }));

                // Sort labels so they can be the first in the renderer. That
                // way, we cull labels on parent tile first, and then on
                // children tile. This allows a z-order priority, and reduce
                // flickering.
                node.children.sort(c => (c.isLabel ? -1 : 1));

                // Necessary event listener, to remove any Label attached to
                // this tile
                node.addEventListener('removed', () => {
                    result.forEach(labels => labels.forEach(l => node.remove(l)));
                    this.removeNodeDomElement(node);
                });
            }

            node.layerUpdateState[this.id].noMoreUpdatePossible();
        });
    }

    removeLabelsFromNodeRecursive(node) {
        node.children.forEach((c) => {
            if (c.isLabel && c.layerId === this.id) {
                node.remove(c);
            } else if (c.isTileMesh) {
                this.removeLabelsFromNodeRecursive(c);
            }
        });

        this.removeNodeDomElement(node);
    }

    removeNodeDomElement(node) {
        if (node.domElements[this.id]) {
            const child = node.domElements[this.id].dom;
            child.parentElement.removeChild(child);
            delete node.domElements[this.id];
        }
    }

    delete() {
        this.domElement.parentElement.removeChild(this.domElement);

        this.parent.level0Nodes.forEach(obj => this.removeLabelsFromNodeRecursive(obj));
    }
}

export default LabelLayer;
