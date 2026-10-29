import * as THREE from 'three';
import { Coordinates, Extent } from '@itowns/geographic';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import GeometryLayer from 'Layer/GeometryLayer';
import Label from 'Core/Label';
import Style, { readExpression, StyleContext } from 'Core/Style';
import { ScreenGrid } from 'Renderer/Label2DRenderer';
import DEMUtils from 'Utils/DEMUtils';

import type TileMesh from 'Core/TileMesh';
import type Tile from 'Core/Tile/Tile';
import type View from 'Core/View';
import type Camera from 'Renderer/Camera';

const context = new StyleContext();

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

const _extent = new Extent('EPSG:4326', 0, 0, 0, 0);

const nodeDimensions = new THREE.Vector2();
const westNorthNode = new THREE.Vector3();
const labelPosition = new THREE.Vector3();

/** A {@link Label} made by a label layer. */
export type LayerLabel = Label & {
    /** Id of the layer that made the label. */
    layerId?: string;
    /** Tested against the globe's horizon; set on low-level globe tiles only. */
    horizonCullingPoint?: THREE.Vector3;
};

/** The style categories label layers read, which `Style` defines at runtime. */
export type LabelStyle = Style & {
    text: {
        /** The label text, once the style is set to a geometry's context. */
        field?: string;
        size: number;
        offset: [number, number];
        color: unknown;
        haloColor: unknown;
        opacity: number;
        haloWidth: number;
        haloBlur: number;
        wrap: number;
        spacing: number;
        justify: string;
        transform: string;
        /** A text-font stack, such as `['Open Sans Regular', 'Arial Unicode MS Regular']`. */
        font: string[];
    };
    icon?: { source?: unknown; key?: unknown };
    zoom: { min: number; max: number };
    point?: { base_altitude?: unknown };
    context: { zoom: number };
};

/**
 * `TileMesh` dispatches `hidden` when it is hidden, `removed` when it is pruned.
 *
 * @param node - The tile.
 * @returns The tile, typed with those events.
 */
function tileEvents(node: TileMesh) {
    return node as unknown as THREE.EventDispatcher<{ hidden: object; removed: object }>;
}

/** A feature, as `convert` decides whether its labels are clamped. */
interface LabelFeature {
    style?: LabelStyle;
    hasRawElevationData?: boolean;
}

/** The labels of one source read, with whether they need clamping to the terrain. */
export type LayerLabels = LayerLabel[] & { needsAltitude?: boolean };

/** What the update loop gives a label layer. */
export interface LabelUpdateContext {
    camera: Camera;
    view: View;
    scheduler: { execute(command: object): Promise<LayerLabels[] | undefined> };
}

/** The tiled layer a label layer is attached to. */
export interface LabelParentLayer {
    maxScreenSizeNode: number;
    level0Nodes: TileMesh[];
    /** Whether the globe's horizon hides a world point. */
    pointCulling(point: THREE.Vector3, camera: Camera): boolean;
}

/** The configuration shared by the label layers, documented by {@link LabelLayer}. */
export interface LabelLayerBaseParameters {
    source: { crs: string } | false;
    style?: Style | object;
    domElement?: HTMLElement | ((properties: object) => HTMLElement | string);
    performance?: boolean;
    forceClampToTerrain?: boolean;
    margin?: number;
    object3d?: THREE.Object3D;
    [option: string]: unknown;
}

/**
 * The labels of one tile, the node of the label layers' tree data structure.
 * Subclasses store the labels for one rendering backend.
 */
export abstract class LabelsNode extends THREE.Group {
    /** The tile the labels belong to. */
    readonly nodeParent: TileMesh;
    /** When set, the labels are placed again on the next frame, which clears it. */
    needsUpdate = true;
    /** Whether the labels are clamped to the terrain of the elevation layer. */
    needsAltitude = false;
    /** The `DEMUtils` read method used to clamp the labels to the terrain. */
    protected readZ: number = DEMUtils.FAST_READ_Z;

    constructor(node: TileMesh) {
        super();
        this.nodeParent = node;
    }

    /** The labels of the tile. */
    abstract get labels(): LayerLabel[];

    /**
     * @returns The number of labels of the tile. Not `count`, which three.js
     * declares on `Object3D`.
     */
    abstract labelCount(): number;

    abstract removeLabel(label: LayerLabel): void;

    addLabel(label: LayerLabel) {
        // The horizon culling is applied to nodes that trace the horizon, which
        // corresponds to the low zoom nodes: levels below 4.
        if (this.nodeParent.layer.isGlobeLayer && this.nodeParent.level < 4) {
            label.horizonCullingPoint = new THREE.Vector3();
        }
    }

    /**
     * Places the label on the terrain and in the scene, if the node needs it.
     *
     * @param label - A label of the node.
     */
    updatePosition(label: LayerLabel) {
        if (!this.needsUpdate) { return; }

        if (this.needsAltitude) {
            label.updateElevationFromLayer(this.nodeParent.layer, [this.nodeParent], this.readZ);
        }
        label.update3dPosition((this.nodeParent.layer as unknown as { crs: string }).crs);
        label.updateHorizonCullingPoint();
    }
}

/**
 * The tile logic shared by the label layers: it reads the labels of each tile,
 * loads them in a {@link LabelsNode} per tile and decides when a tile's labels
 * are submitted to rendering. How the labels are drawn is left to the
 * subclasses.
 */
abstract class LabelLayerBase extends GeometryLayer {
    #filterGrid = new ScreenGrid();

    /** Always true; identifies label layers. */
    readonly isLabelLayer: boolean;
    parent!: LabelParentLayer;
    frozen!: boolean;
    style: LabelStyle;
    buildExtent: boolean;
    crs: string;
    performance: boolean;
    forceClampToTerrain: boolean;
    /** Space around each label, in px, that no other label of the layer takes. */
    margin?: number;
    /** The `domElement` option. */
    labelDomelement?: LabelLayerBaseParameters['domElement'];

    /**
     * @param id - The id of the layer.
     * @param config - The configuration shared by the label layers, documented
     * by {@link LabelLayer}. Other elements are merged as is in the layer.
     */
    constructor(id: string, config: LabelLayerBaseParameters) {
        const {
            domElement,
            performance = true,
            forceClampToTerrain = false,
            margin,
            style = {},
            ...geometryConfig
        } = config;
        super(id, config.object3d || new THREE.Group(), geometryConfig);

        this.isLabelLayer = true;

        this.style = (style instanceof Style ? style : new Style(style)) as LabelStyle;

        this.buildExtent = true;
        this.crs = (config.source as { crs: string }).crs;
        this.performance = performance;
        this.forceClampToTerrain = forceClampToTerrain;

        this.labelDomelement = domElement;

        // TODO : this property should be moved to Style after refactoring style properties structure
        this.margin = margin;
    }

    /** Makes the labels node of a tile. */
    protected abstract _createLabelsNode(node: TileMesh, view: View): LabelsNode;

    /** Shows a tile's labels, whose parent shows none. */
    protected abstract _submitToRendering(labelsNode: LabelsNode, camera: Camera): void;

    /** Hides a tile's labels. */
    protected abstract _disallowToRendering(labelsNode: LabelsNode): void;

    /** Frees the labels of a removed tile. */
    protected abstract _releaseNode(node: TileMesh): void;

    /** Called once a tile's labels are loaded, before they are added to its labels node. */
    protected abstract _attachLabelsNode(labelsNode: LabelsNode): void;

    /** Called once a tile's labels are added and pre-filtered, when the tile has at least one. */
    protected abstract _onLabelsLoaded(labelsNode: LabelsNode): void;

    /** Frees a loaded label whose tile was removed before the label was added. */
    protected abstract _discardLabel(label: LayerLabel, view: View): void;

    /**
     * Makes the labels of a feature collection inside an extent or tile, one
     * per geometry part, at its first point. The text comes from the style's
     * `text.field` or from the `domElement` option. A geometry with neither
     * text nor icon, or outside the style's zoom range, makes none.
     *
     * @param data - The FeatureCollection to read the labels from.
     * @param extentOrTile - The extent or tile the labels are read for. Required.
     * @returns The labels, with `needsAltitude` set if any is clamped to the terrain.
     * @throws {Error} Without `extentOrTile`.
     */
    // FeatureCollection is a JavaScript type without declarations.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convert(data: any, extentOrTile?: Tile | (Extent & { zoom?: number })): LayerLabels {
        if (!extentOrTile) {
            throw new Error('A label layer converts features for an extent or a tile');
        }
        const labels: LayerLabels = [];

        // The extent in the data's CRS, for the point tests below.
        if ('isExtent' in extentOrTile) {
            extentOrTile.as(data.crs, _extent);
        } else {
            extentOrTile.toExtent(data.crs, _extent);
        }
        coord.crs = data.crs;

        context.setZoom(extentOrTile.zoom);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.features.forEach((f: any) => {
            if (f.style.text) {
                if (Object.keys(f.style.text).length === 0) {
                    return;
                }
            }

            context.setFeature(f);

            const featureField = f.style?.text?.field;

            labels.needsAltitude = labels.needsAltitude || this._needsAltitude(f);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            f.geometries.forEach((g: any) => {
                context.setGeometry(g);
                this.style.setContext(context);
                const layerField = this.style.text && this.style.text.field;
                const geometryField = g.properties.style && g.properties.style.text && g.properties.style.text.field;
                let content: HTMLElement | string | undefined;
                if (this.labelDomelement) {
                    content = readExpression(this.labelDomelement, context);
                } else if (!geometryField && !featureField && !layerField) {
                    // No text: only an icon makes a label.
                    if (!(g.properties.style && (g.properties.style.icon.source || g.properties.style.icon.key))
                        && !(f.style && f.style.icon && (f.style.icon.source || f.style.icon.key))
                        && !(this.style.icon && (this.style.icon.source || this.style.icon.key))) {
                        return;
                    }
                }

                if (this.style.zoom.min > this.style.context.zoom || this.style.zoom.max <= this.style.context.zoom) {
                    return;
                }

                g.indices.forEach((i: { offset: number }) => {
                    coord.setFromArray(f.vertices, g.size * i.offset);
                    // Transform coordinate to data.crs projection
                    coord.applyMatrix4(data.matrixWorld);

                    if (!_extent.isPointInside(coord)) { return; }

                    const label = this._createLabel(content, coord.clone());

                    label.layerId = this.id;
                    label.order = f.order;
                    label.padding = this.margin || label.padding;

                    labels.push(label);
                });
            });
        });

        return labels;
    }

    /**
     * Whether the labels of a feature are clamped to the terrain with the
     * elevation layer. Called by `convert` while the style context is set to
     * the feature.
     *
     * @param feature - The feature the labels are read from.
     * @returns True when the labels need their altitude.
     */
    protected _needsAltitude(feature: LabelFeature): boolean {
        const altitudeStyle = feature.style?.point?.base_altitude;
        const isDefaultElevationStyle = altitudeStyle instanceof Function && altitudeStyle.name == 'baseAltitudeDefault';

        return this.forceClampToTerrain === true || (isDefaultElevationStyle && !feature.hasRawElevationData);
    }

    /**
     * Creates one label in `convert`, while the style is set to the context of
     * the label's geometry.
     *
     * @param content - The content read from the layer's `domElement` option, if any.
     * @param coordinates - The label coordinates; owned by the label.
     * @returns The label.
     */
    protected _createLabel(content: HTMLElement | string | undefined, coordinates: Coordinates): LayerLabel {
        return new Label(content, coordinates, this.style);
    }

    // On each update of the parent layer: empties the submitted nodes and sizes
    // the filter grid to half the largest tile on screen.
    preUpdate(_context: unknown, sources: Set<unknown>) {
        if (sources.has(this.parent)) {
            this.object3d.clear();
            this.#filterGrid.width = this.parent.maxScreenSizeNode * 0.5;
            this.#filterGrid.height = this.parent.maxScreenSizeNode * 0.5;
            this.#filterGrid.resize();
        }
    }

    /**
     * Whether a child tile has finished loading its labels: a tile shows its
     * labels only once all its children have theirs.
     *
     * @param child - A child of the tile.
     * @returns True if the tile does not wait for this child.
     */
    protected _isChildReady(child: THREE.Object3D): boolean {
        return (child as Partial<TileMesh>).layerUpdateState?.[this.id]?.hasFinished() ?? false;
    }

    #hasLabelChildren(object: THREE.Object3D | null): boolean {
        return !!object && object.children.every(c => this._isChildReady(c));
    }

    // Removes the labels of a tile that overlap one already kept, highest order
    // first, on the filter grid sized to half the largest tile on screen.
    #removeCulledLabels(node: LabelsNode) {
        const labels = node.labels.slice();

        this.#filterGrid.reset();

        labels.sort((a, b) => b.order - a.order);

        labels.forEach((label) => {
            node.nodeParent.extent.planarDimensions(nodeDimensions);
            coord.crs = node.nodeParent.extent.crs;
            coord.setFromValues(node.nodeParent.extent.west, node.nodeParent.extent.north, 0).toVector3(westNorthNode);
            coord.copy(label.coordinates).as(node.nodeParent.extent.crs, coord).toVector3(labelPosition);

            // Position in the tile, from its south-west corner, scaled to the grid.
            labelPosition.sub(westNorthNode);
            labelPosition.y += nodeDimensions.y;
            labelPosition.x /= nodeDimensions.x;
            labelPosition.y /= nodeDimensions.y;
            labelPosition.multiplyScalar(this.#filterGrid.width);

            label.updateProjectedPosition(labelPosition.x, labelPosition.y);

            if (!this.#filterGrid.insert(label)) {
                node.removeLabel(label);
            }
        });
    }

    update(context: LabelUpdateContext, layer: this, node: TileMesh, parent?: TileMesh) {
        if (!parent && node.link[layer.id]) {
            // A removed tile.
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, node);
            return;
        }

        const labelsNode = (node.link[layer.id] as LabelsNode | undefined) || this._createLabelsNode(node, context.view);
        node.link[layer.id] = labelsNode;

        if (this.frozen || !node.visible || !this.visible) {
            return;
        }

        if (!node.material.visible && this.#hasLabelChildren(node)) {
            return this._disallowToRendering(labelsNode);
        }

        const extentsDestination: (Tile | Extent)[] = node.getExtentsByProjection(this.source.crs) || [node.extent];
        // A tile extent has a zoom, a plain extent none.
        const zoomDest = (extentsDestination[0] as { zoom?: number }).zoom;

        if (zoomDest !== undefined && (zoomDest < layer.zoom.min || zoomDest > layer.zoom.max)) {
            return this._disallowToRendering(labelsNode);
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
            this._submitToRendering(labelsNode, context.camera);
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

            this._attachLabelsNode(labelsNode);

            result.forEach((labels) => {
                // The tile was removed while its labels loaded.
                if (!node.parent) {
                    labels.forEach(l => this._discardLabel(l, context.view));
                    return;
                }

                labelsNode.needsAltitude = labelsNode.needsAltitude || !!labels.needsAltitude;

                labels.forEach((label) => {
                    if (node.extent.isPointInside(label.coordinates)) {
                        labelsNode.addLabel(label);
                    }
                });
            });

            if (labelsNode.labelCount()) {
                tileEvents(node).addEventListener('hidden', () => this._disallowToRendering(labelsNode));
                tileEvents(node).addEventListener('removed', () => this._releaseNode(node));

                const elevationTile = node.material.getElevationTile();
                if (labelsNode.needsAltitude && elevationTile) {
                    elevationTile.addEventListener('rasterElevationLevelChanged', () => { labelsNode.needsUpdate = true; });
                }

                if (this.performance) {
                    this.#removeCulledLabels(labelsNode);
                }

                this._onLabelsLoaded(labelsNode);
            }

            node.layerUpdateState[this.id].noMoreUpdatePossible();
        });
    }

    /**
     * Releases the labels of a tile and of every tile below it.
     *
     * @param node - The tile.
     */
    removeLabelsFromNodeRecursive(node: TileMesh) {
        node.children.forEach((c) => {
            const child = c as TileMesh;
            // `_releaseNode` reads the link: release first, then drop it.
            this.removeLabelsFromNodeRecursive(child);
            if (child.link[this.id]) {
                delete child.link[this.id];
            }
        });

        this._releaseNode(node);
    }

    /**
     * Releases the labels of every tile.
     * @param clearCache - Whether to clear the layer cache too.
     */
    delete(clearCache?: boolean) {
        if (clearCache) {
            // `Layer` documents its LRU cache as the DOM `Cache`, which has no `clear`.
            (this.cache as unknown as { clear(): void }).clear();
        }

        this.parent.level0Nodes.forEach(obj => this.removeLabelsFromNodeRecursive(obj));
    }
}

export default LabelLayerBase;
