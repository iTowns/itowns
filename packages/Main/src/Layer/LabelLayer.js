import * as THREE from 'three';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import GeometryLayer from 'Layer/GeometryLayer';
import { Coordinates, Extent } from '@itowns/geographic';
import Label from 'Core/Label';
import Style, { readExpression, StyleContext } from 'Core/Style';
import { ScreenGrid } from 'Renderer/Label2DRenderer';
import {
    Label as InstancedLabel,
    TextAlign,
    TextTransform,
    RotationAlignment,
} from '@itowns/labels';
import { rgba2rgb } from 'Core/StyleOptions';

const context = new StyleContext();

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

const _extent = new Extent('EPSG:4326', 0, 0, 0, 0);

const nodeDimensions = new THREE.Vector2();
const westNorthNode = new THREE.Vector2();
const labelPosition = new THREE.Vector2();

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Reads the options of an instanced label from the style, which must be set to
 * the context of the label's geometry.
 *
 * @param {Style} style - The layer style.
 * @param {string} text - The label text.
 * @param {number[]} anchor - The anchor from `Style.getTextAnchorPosition()`.
 * @returns {object} Options for the `@itowns/labels` `Label` constructor.
 */
function instancedOptionsFromStyle(style, text, anchor) {
    const { size, offset } = style.text;
    // Colours may carry an alpha, which THREE.Color drops.
    const color = rgba2rgb(String(style.text.color));
    const halo = rgba2rgb(String(style.text.haloColor));
    return {
        text,
        // Only the first font of the stack is used.
        font: style.text.font?.[0] ?? 'sans-serif',
        fontSize: size,
        color: color.color,
        opacity: style.text.opacity * color.opacity,
        haloColor: halo.color,
        haloOpacity: halo.opacity,
        haloWidth: style.text.haloWidth,
        haloBlur: style.text.haloBlur,
        offset: [offset[0] / size, offset[1] / size], // px to em
        padding: style.text.padding,
        maxWidth: style.text.wrap,
        letterSpacing: style.text.spacing,
        textAlign: TextAlign[capitalize(style.text.justify)] ?? TextAlign.Auto,
        textTransform: TextTransform[capitalize(style.text.transform)] ?? TextTransform.None,
        // Anchors 0, -0.5 and -1 map to the enum values 0, 1 and 2.
        anchorX: Math.round(-2 * anchor[0]),
        anchorY: Math.round(-2 * anchor[1]),
        rotationAlignment: RotationAlignment.Viewport,
    };
}

// An instanced label has no element to measure: the `performance` filter gets
// a box estimated from the text, at this average glyph advance in em.
const GLYPH_ADVANCE = 0.55;

function ensureEstimatedOffset(label) {
    if (label.offset) { return; }

    const { text, fontSize } = label.instancedOptions;
    const longestLine = text.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
    const width = Math.max(fontSize, longestLine * fontSize * GLYPH_ADVANCE);
    const height = fontSize * 1.2;

    const left = width * label.anchor[0] + label.styleOffset[0];
    const top = height * label.anchor[1] + label.styleOffset[1];

    label.offset = { left, top, right: left + width, bottom: top + height };
}

/**
 * DomNode is a node in the tree data structure of labels divs.
 *
 * @class DomNode
 */
class DomNode {
    #domVisibility = false;

    constructor() {
        this.dom = document.createElement('div');

        this.dom.style.display = 'none';

        this.visible = true;
    }

    get visible() { return this.#domVisibility; }

    set visible(v) {
        if (v !== this.#domVisibility) {
            this.#domVisibility = v;
            this.dom.style.display = v ? 'block' : 'none';
        }
    }

    hide() { this.visible = false; }

    show() { this.visible = true; }

    add(node) {
        this.dom.append(node.dom);
    }
}

/**
 * LabelsNode is node of tree data structure for LabelLayer.
 * the node is made of dom elements and 3D labels.
 *
 * @class      LabelsNode
 */
class LabelsNode extends THREE.Group {
    /**
     * @param {TileMesh} node - The tile the labels belong to.
     * @param {View} view - The view the labels are displayed in.
     * @param {boolean} [instanced=false] - Draw the labels with the view's
     * instanced label manager.
     */
    constructor(node, view, instanced = false) {
        super();
        // attached node parent
        this.nodeParent = node;
        this.view = view;
        // Instanced label of each `Label` of this node; null for DOM labels.
        this.instancedLabels = instanced ? new Map() : null;
        this.manager = instanced ? view.instancedLabelManager : null;
        this.labelsVisible = true;
        // When this is set, it calculates the position in that frame and resets this property to false.
        this.needsUpdate = true;
    }

    get isInstanced() {
        return this.instancedLabels !== null;
    }

    // instantiate dom elements
    initializeDom() {
        if (this.isInstanced) { return; }

        // create root dom
        this.domElements = new DomNode();
        // create labels container dom
        this.domElements.labels = new DomNode();

        this.domElements.add(this.domElements.labels);

        this.domElements.labels.dom.style.opacity = '0';
    }

    // add node label
    // add label 3d and dom label
    addLabel(label) {
        if (this.isInstanced) {
            const instanced = new InstancedLabel({ ...label.instancedOptions, visible: this.labelsVisible });
            this.instancedLabels.set(label, instanced);
            // Placed here, and again when the elevation changes.
            this.needsUpdate = true;
            this.updatePosition(label);
            this.manager.addLabel(instanced);
            return;
        }

        // add 3d object
        this.add(label);

        // add dom label
        this.domElements.labels.dom.append(label.content);

        // Batch update the dimensions of labels all at once to avoid
        // redraw for at least this tile.
        label.initDimensions();

        // add horizon culling point if it's necessary
        // the horizon culling is applied to nodes that trace the horizon which
        // corresponds to the low zoom node, that's why the culling is done for a zoom lower than 4.
        if (this.nodeParent.layer.isGlobeLayer && this.nodeParent.level < 4) {
            label.horizonCullingPoint = new THREE.Vector3();
        }
    }

    // remove node label
    // remove label 3d and dom label
    removeLabel(label) {
        if (this.isInstanced) {
            const instanced = this.instancedLabels.get(label);
            if (instanced) {
                this.manager.removeLabel(instanced);
                this.instancedLabels.delete(label);
            }
            return;
        }

        // remove 3d object
        this.remove(label);

        // remove dom label
        this.domElements.labels.dom.removeChild(label.content);
    }

    // Fades out every instanced label of this node, then releases them.
    clearLabels() {
        const labels = [...this.instancedLabels.values()];
        this.instancedLabels.clear();
        this.view.notifyLabelChange();
        labels.forEach((l) => { l.visible = false; });
        setTimeout(() => this.manager.removeLabels(labels), this.manager.config.fadeDurationMs);
    }

    /**
     * Shows or hides every instanced label of this node. Labels fade in and out.
     *
     * @param {boolean} visible - Whether the labels are shown.
     */
    setLabelsVisible(visible) {
        if (this.labelsVisible === visible) { return; }
        this.labelsVisible = visible;
        this.view.notifyLabelChange();
        this.instancedLabels.forEach((l) => { l.visible = visible; });
    }

    // update position if it's necessary
    updatePosition(label) {
        if (this.needsUpdate) {
            // update elevation from elevation layer.
            if (this.needsAltitude) {
                label.updateElevationFromLayer(this.nodeParent.layer, [this.nodeParent]);
            }

            // update elevation label
            label.update3dPosition(this.nodeParent.layer.crs);

            if (this.isInstanced) {
                const instanced = this.instancedLabels.get(label);
                if (instanced) { instanced.position = label.position; }
            }

            // update horizon culling
            label.updateHorizonCullingPoint();
        }
    }

    // return labels count
    count() {
        return this.isInstanced ? this.instancedLabels.size : this.children.length;
    }

    get labels() {
        return this.isInstanced ? [...this.instancedLabels.keys()] : this.children;
    }
}

/**
 * A layer to handle a bunch of `Label`. This layer can be created on its own,
 * but it is better to use the option `addLabelLayer` on another `Layer` to let
 * it work with it (see the `vector_tile_raster_2d` example). Supported for Points features, not yet
 * for Lines and Polygons features.
 *
 * @property {boolean} isLabelLayer - Used to checkout whether this layer is a
 * LabelLayer.  Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class LabelLayer extends GeometryLayer {
    #filterGrid = new ScreenGrid();
    /**
     * @extends Layer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {boolean} [config.performance=true] - remove labels that have no chance of being visible.
     * if the `config.performance` is set to true then the performance is improved
     * proportional to the amount of unnecessary labels that are removed.
     * Indeed, even in the best case, labels will never be displayed. By example, if there's many labels.
     * We advise you to not use this option if your data is optimized.
     * @param {boolean} [config.instanced=false] - Draw the labels as GPU
     * instanced text with the view's `instancedLabelManager`. Icons are not
     * drawn in this mode.
     * @param {HTMLElement|Function} config.domElement - An HTML domElement.
     * If set, all `Label` displayed within the current instance `LabelLayer`
     * will be this domElement.
     *
     * It can be set to a method. The single parameter of this method gives the
     * properties of each feature on which a `Label` is created.
     *
     * If set, all the parameters set in the `LabelLayer` `Style.text` will be overridden,
     * except for the `Style.text.anchor` parameter which can help place the label.
     */
    constructor(id, config = {}) {
        const {
            domElement,
            performance = true,
            instanced = false,
            forceClampToTerrain = false,
            margin,
            style = {},
            ...geometryConfig
        } = config;
        super(id, config.object3d || new THREE.Group(), geometryConfig);

        this.isLabelLayer = true;

        this.style = style instanceof Style ? style : new Style(style);

        this.domElement = new DomNode();
        this.domElement.show();
        this.domElement.dom.id = `itowns-label-${this.id}`;
        this.buildExtent = true;
        this.crs = config.source.crs;
        this.performance = performance;
        this.instanced = instanced;
        this.forceClampToTerrain = forceClampToTerrain;
        this.margin = margin;

        this.toHide = new THREE.Group();

        this.labelDomelement = domElement;

        // The margin property defines a space around each label that cannot be occupied by another label.
        // For example, if some labelLayer has a margin value of 5, there will be at least 10 pixels
        // between each labels of the layer
        // TODO : this property should be moved to Style after refactoring style properties structure
        this.margin = config.margin;
    }

    get visible() {
        return super.visible;
    }

    set visible(value) {
        super.visible = value;
        if (value) {
            this.domElement?.show();
        } else {
            this.domElement?.hide();
        }
    }

    get submittedLabelNodes() {
        return this.object3d.children;
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
     * @param {Extent|Tile} extentOrTile
     *
     * @returns {Label[]} An array containing all the created labels.
     */
    convert(data, extentOrTile) {
        const labels = [];

        // Converting the extent now is faster for further operation
        if (extentOrTile.isExtent) {
            extentOrTile.as(data.crs, _extent);
        } else {
            extentOrTile.toExtent(data.crs, _extent);
        }
        coord.crs = data.crs;

        context.setZoom(extentOrTile.zoom);

        data.features.forEach((f) => {
            if (f.style.text) {
                if (Object.keys(f.style.text).length === 0) {
                    return;
                }
            }

            context.setFeature(f);

            const featureField = f.style?.text?.field;

            // determine if altitude style is specified by the user
            const altitudeStyle = f.style?.point?.base_altitude;
            const isDefaultElevationStyle = altitudeStyle instanceof Function && altitudeStyle.name == 'baseAltitudeDefault';

            // determine if the altitude needs update with ElevationLayer
            labels.needsAltitude = labels.needsAltitude || this.forceClampToTerrain === true || (isDefaultElevationStyle && !f.hasRawElevationData);

            f.geometries.forEach((g) => {
                context.setGeometry(g);
                this.style.setContext(context);
                const layerField = this.style.text && this.style.text.field;
                const geometryField = g.properties.style && g.properties.style.text && g.properties.style.text.field;
                let content;
                if (this.labelDomelement) {
                    content = readExpression(this.labelDomelement, context);
                } else if (!geometryField && !featureField && !layerField) {
                    // Check if there is an icon, with no text
                    if (!(g.properties.style && (g.properties.style.icon.source || g.properties.style.icon.key))
                        && !(f.style && f.style.icon && (f.style.icon.source || f.style.icon.key))
                        && !(this.style.icon && (this.style.icon.source || this.style.icon.key))) {
                        return;
                    }
                }

                if (this.style.zoom.min > this.style.context.zoom || this.style.zoom.max <= this.style.context.zoom) {
                    return;
                }

                // NOTE: this only works fine for POINT.
                // It needs more work for LINE and POLYGON as we currently only use the first point of the entity

                g.indices.forEach((i) => {
                    coord.setFromArray(f.vertices, g.size * i.offset);
                    // Transform coordinate to data.crs projection
                    coord.applyMatrix4(data.matrixWorld);

                    if (!_extent.isPointInside(coord)) { return; }

                    const label = new Label(content, coord.clone(), this.style,
                        { instanced: this.instanced });

                    if (this.instanced) {
                        const text = typeof content === 'string'
                            ? content
                            : content?.textContent ?? this.style.text.field ?? '';
                        label.instancedOptions = instancedOptionsFromStyle(this.style, text, label.anchor);
                    }

                    label.layerId = this.id;
                    label.order = f.order;
                    label.padding = this.margin || label.padding;

                    labels.push(label);
                });
            });
        });

        return labels;
    }

    // placeholder
    preUpdate(context, sources) {
        if (sources.has(this.parent)) {
            this.object3d.clear();
            this.#filterGrid.width = this.parent.maxScreenSizeNode * 0.5;
            this.#filterGrid.height = this.parent.maxScreenSizeNode * 0.5;
            this.#filterGrid.resize();
        }
    }

    #submitToRendering(labelsNode) {
        this.object3d.add(labelsNode);
    }

    #disallowToRendering(labelsNode) {
        if (labelsNode.isInstanced) {
            labelsNode.setLabelsVisible(false);
            return;
        }
        this.toHide.add(labelsNode);
    }

    #findClosestDomElement(node) {
        if (node.parent?.isTileMesh) {
            return node.parent.link[this.id]?.domElements || this.#findClosestDomElement(node.parent);
        } else {
            return this.domElement;
        }
    }

    #hasLabelChildren(object) {
        return object.children.every(c => c.layerUpdateState && c.layerUpdateState[this.id]?.hasFinished());
    }

    // Remove all labels invisible with pre-culling with screen grid
    // We use the screen grid with maximum size of node on screen
    #removeCulledLabels(node) {
        // copy labels array
        const labels = node.labels.slice();

        // reset filter
        this.#filterGrid.reset();

        // sort labels by order
        labels.sort((a, b) => b.order - a.order);

        labels.forEach((label) => {
            if (node.isInstanced) {
                ensureEstimatedOffset(label);
            }

            // get node dimensions
            node.nodeParent.extent.planarDimensions(nodeDimensions);
            coord.crs = node.nodeParent.extent.crs;

            // get west/north node coordinates
            coord.setFromValues(node.nodeParent.extent.west, node.nodeParent.extent.north, 0).toVector3(westNorthNode);

            // get label position
            coord.copy(label.coordinates).as(node.nodeParent.extent.crs, coord).toVector3(labelPosition);

            // transform label position to local node system
            labelPosition.sub(westNorthNode);
            labelPosition.y += nodeDimensions.y;
            labelPosition.divide(nodeDimensions).multiplyScalar(this.#filterGrid.width);

            // update the projected position to transform to local filter grid sytem
            label.updateProjectedPosition(labelPosition.x, labelPosition.y);

            // use screen grid to remove all culled labels
            if (!this.#filterGrid.insert(label)) {
                node.removeLabel(label);
            }
        });
    }

    update(context, layer, node, parent) {
        if (!parent && node.link[layer.id]) {
            // if node has been removed dispose three.js resource
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, node);
            return;
        }

        const labelsNode = node.link[layer.id]
            || new LabelsNode(node, context.view, this.instanced);
        node.link[layer.id] = labelsNode;

        if (labelsNode.isInstanced) {
            // Must match the checks below, or a node is shown and hidden again
            // on every update.
            labelsNode.setLabelsVisible(this.visible && node.visible && node.material.visible);
        }

        if (this.frozen || !node.visible || !this.visible) {
            return;
        }

        if (!node.material.visible && this.#hasLabelChildren(node)) {
            return this.#disallowToRendering(labelsNode);
        }

        const extentsDestination = node.getExtentsByProjection(this.source.crs) || [node.extent];
        const zoomDest = extentsDestination[0].zoom;

        if (zoomDest < layer.zoom.min || zoomDest > layer.zoom.max) {
            return this.#disallowToRendering(labelsNode);
        }

        if (node.layerUpdateState[this.id] === undefined) {
            node.layerUpdateState[this.id] = new LayerUpdateState();
        }

        if (!extentsDestination.some(e => this.source.hasData(e))) {
            node.layerUpdateState[this.id].noMoreUpdatePossible();
            return;
        } else if (this.#hasLabelChildren(node.parent)) {
            if (!node.material.visible) {
                labelsNode.needsUpdate = true;
            }
            this.#submitToRendering(labelsNode);
            return;
        } else if (!node.layerUpdateState[this.id].canTryUpdate()) {
            return;
        }

        node.layerUpdateState[this.id].newTry();

        const command = {
            layer: this,
            extentsSource: extentsDestination,
            view: context.view,
            requester: node,
        };

        return context.scheduler.execute(command).then((result) => {
            if (!result) { return; }

            const renderer = context.view.mainLoop.gfxEngine.label2dRenderer;

            labelsNode.initializeDom();

            if (!labelsNode.isInstanced) {
                this.#findClosestDomElement(node).add(labelsNode.domElements);
            }

            result.forEach((labels) => {
                // Clean if there isnt' parent
                if (!node.parent) {
                    labels.forEach((l) => {
                        ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, l);
                        if (!labelsNode.isInstanced) {
                            renderer.removeLabelDOM(l);
                        }
                    });
                    return;
                }

                labelsNode.needsAltitude = labelsNode.needsAltitude || labels.needsAltitude;

                // Add all labels for this tile at once to batch it
                labels.forEach((label) => {
                    if (node.extent.isPointInside(label.coordinates)) {
                        labelsNode.addLabel(label);
                    }
                });
            });

            if (labelsNode.count()) {
                if (!labelsNode.isInstanced) {
                    labelsNode.domElements.labels.hide();
                    labelsNode.domElements.labels.dom.style.opacity = '1.0';

                    node.addEventListener('show', () => labelsNode.domElements.labels.show());
                }

                node.addEventListener('hidden', () => this.#disallowToRendering(labelsNode));

                // Necessary event listener, to remove any Label attached to
                node.addEventListener('removed', () => this.removeNodeDomElement(node));

                if (labelsNode.needsAltitude && node.material.getElevationTile()) {
                    node.material.getElevationTile().addEventListener('rasterElevationLevelChanged', () => {
                        labelsNode.needsUpdate = true;
                        // The 2D renderer, which repositions DOM labels, skips
                        // instanced ones.
                        if (labelsNode.isInstanced) {
                            labelsNode.labels.forEach(l => labelsNode.updatePosition(l));
                            labelsNode.needsUpdate = false;
                            context.view.notifyLabelChange();
                        }
                    });
                }

                if (this.performance) {
                    this.#removeCulledLabels(labelsNode);
                }

                if (labelsNode.isInstanced) {
                    context.view.notifyLabelChange();
                }
            }

            node.layerUpdateState[this.id].noMoreUpdatePossible();
        });
    }

    removeLabelsFromNodeRecursive(node) {
        node.children.forEach((c) => {
            if (c.link[this.id]) {
                delete c.link[this.id];
            }
            this.removeLabelsFromNodeRecursive(c);
        });

        this.removeNodeDomElement(node);
    }

    removeNodeDomElement(node) {
        if (node.link[this.id]?.isInstanced) {
            node.link[this.id].clearLabels();
        }

        if (node.link[this.id]?.domElements) {
            const child = node.link[this.id].domElements.dom;
            child.parentElement.removeChild(child);
            delete node.link[this.id].domElements;
        }
    }

    /**
     * All layer's objects and domElements are removed.
     * @param {boolean} [clearCache=false] Whether to clear the layer cache or not
     */
    delete(clearCache) {
        if (clearCache) {
            this.cache.clear();
        }
        this.domElement.dom.parentElement.removeChild(this.domElement.dom);

        this.parent.level0Nodes.forEach(obj => this.removeLabelsFromNodeRecursive(obj));
    }
}

export default LabelLayer;
