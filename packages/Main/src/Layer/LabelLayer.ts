import * as THREE from 'three';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import LabelLayerBase, { LabelsNode } from 'Layer/LabelLayerBase';

import type TileMesh from 'Core/TileMesh';
import type View from 'Core/View';
import type { LayerLabel, LabelLayerBaseParameters } from 'Layer/LabelLayerBase';

/** A node in the tree data structure of label divs. */
class DomNode {
    readonly dom: HTMLDivElement;
    #domVisibility = false;

    constructor() {
        this.dom = document.createElement('div');

        this.dom.style.display = 'none';

        this.visible = true;
    }

    get visible() { return this.#domVisibility; }

    set visible(v: boolean) {
        if (v !== this.#domVisibility) {
            this.#domVisibility = v;
            this.dom.style.display = v ? 'block' : 'none';
        }
    }

    hide() { this.visible = false; }

    show() { this.visible = true; }

    add(node: DomNode) {
        this.dom.append(node.dom);
    }
}

/** A tile's element, holding the container of its labels. */
type TileDomElements = DomNode & { labels: DomNode };

/** A label of a {@link LabelLayer}, which always has an element. */
type DomLayerLabel = LayerLabel & { content: Node };

/**
 * The DOM labels of one tile: each label is a 3D child of the node, and its
 * element is in the node's labels container.
 */
class DomLabelsNode extends LabelsNode {
    /** Set by `initializeDom`, once the tile's labels are loaded; removed with the tile. */
    domElements?: TileDomElements;

    /**
     * Creates the tile's element and its labels container, hidden.
     *
     * @returns The tile's element.
     */
    initializeDom(): TileDomElements {
        const root = new DomNode();
        const labels = new DomNode();
        root.add(labels);
        labels.dom.style.opacity = '0';
        this.domElements = Object.assign(root, { labels });
        return this.domElements;
    }

    /**
     * @returns The container of the tile's labels.
     * @throws {Error} Before `initializeDom`.
     */
    labelsContainer(): DomNode {
        if (!this.domElements) {
            throw new Error('A tile\'s DOM is initialized before its labels are added');
        }
        return this.domElements.labels;
    }

    // The children of the node are its labels.
    get labels() {
        return this.children as DomLayerLabel[];
    }

    labelCount() {
        return this.children.length;
    }

    // Adds the label as a child and its element to the container, then measures it.
    addLabel(label: DomLayerLabel) {
        super.addLabel(label);
        this.add(label);
        this.labelsContainer().dom.append(label.content);
        label.initDimensions();
    }

    removeLabel(label: DomLayerLabel) {
        this.remove(label);
        this.labelsContainer().dom.removeChild(label.content);
    }
}

/**
 * Labels of point features as DOM elements, placed by the view's
 * `Label2DRenderer`. Usually made with the `addLabelLayer` option of a layer
 * (see the `vector_tile_raster_2d` example). {@link InstancedLabelLayer} draws
 * them as GPU instanced text.
 */
class LabelLayer extends LabelLayerBase {
    /** The layer's root element, holding the elements of its tiles. */
    readonly domElement: DomNode;
    /** Labels nodes the 2D renderer hides on its next render. */
    readonly toHide: THREE.Group;

    /**
     * @param id - The layer id, unique in the view.
     * @param config - Options; other elements are merged into the layer.
     * @param config.performance - Removes, in each tile, the labels that
     * overlap one already kept, highest order first. Default is true.
     * @param config.domElement - The element of every label, or a function of
     * a feature's properties returning it. It replaces the style's text, except
     * `text.anchor`.
     */
    constructor(id: string, config: LabelLayerBaseParameters) {
        super(id, config);

        this.domElement = new DomNode();
        this.domElement.show();
        this.domElement.dom.id = `itowns-label-${this.id}`;

        this.toHide = new THREE.Group();
    }

    get visible(): boolean {
        return super.visible;
    }

    set visible(value: boolean) {
        super.visible = value;
        // The base constructor sets visibility before the root element exists.
        if (value) {
            this.domElement?.show();
        } else {
            this.domElement?.hide();
        }
    }

    /**
     * @returns The labels nodes submitted to rendering, which the 2D renderer
     * places.
     */
    get submittedLabelNodes() {
        return this.object3d.children as DomLabelsNode[];
    }

    protected _createLabelsNode(node: TileMesh) {
        return new DomLabelsNode(node);
    }

    protected _submitToRendering(labelsNode: DomLabelsNode) {
        this.object3d.add(labelsNode);
    }

    protected _disallowToRendering(labelsNode: DomLabelsNode) {
        this.toHide.add(labelsNode);
    }

    protected _attachLabelsNode(labelsNode: DomLabelsNode) {
        this.#findClosestDomElement(labelsNode.nodeParent).add(labelsNode.initializeDom());
    }

    protected _discardLabel(label: LayerLabel, view: View) {
        ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, label);
        view.mainLoop.gfxEngine.label2dRenderer.removeLabelDOM(label);
    }

    protected _onLabelsLoaded(labelsNode: DomLabelsNode) {
        // Shown by the 2D renderer once the node is submitted to rendering.
        const labels = labelsNode.labelsContainer();
        labels.hide();
        labels.dom.style.opacity = '1.0';
    }

    protected _releaseNode(node: TileMesh) {
        this.removeNodeDomElement(node);
    }

    // The element of the nearest ancestor tile that has one, or the layer's root.
    #findClosestDomElement(node: THREE.Object3D): DomNode {
        const parent = node.parent as TileMesh | null;
        if (parent?.isTileMesh) {
            return (parent.link[this.id] as DomLabelsNode | undefined)?.domElements
                || this.#findClosestDomElement(parent);
        } else {
            return this.domElement;
        }
    }

    /**
     * Removes the element of a tile's labels from the page.
     *
     * @param node - The tile.
     */
    removeNodeDomElement(node: TileMesh) {
        const labelsNode = node.link[this.id] as DomLabelsNode | undefined;
        if (labelsNode?.domElements) {
            labelsNode.domElements.dom.remove();
            delete labelsNode.domElements;
        }
    }

    /**
     * Removes the layer's elements and releases the labels of every tile.
     * @param clearCache - Whether to clear the layer cache too.
     */
    delete(clearCache?: boolean) {
        this.domElement.dom.remove();

        super.delete(clearCache);
    }
}

export default LabelLayer;
