import Label from 'Core/Label';
import DEMUtils from 'Utils/DEMUtils';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import {
    Label as InstancedLabel,
    TextAlign,
    TextAnchorX,
    TextAnchorY,
    TextTransform,
    RotationAlignment,
} from '@itowns/labels';
import { rgba2rgb } from 'Core/StyleOptions';
import LabelLayerBase, { LabelsNode } from 'Layer/LabelLayerBase';

import type { InstancedLabelManager, LabelOptions } from '@itowns/labels';
import type { Coordinates } from '@itowns/geographic';
import type TileMesh from 'Core/TileMesh';
import type View from 'Core/View';
import type Camera from 'Renderer/Camera';
import type {
    LayerLabel,
    LabelLayerBaseParameters,
    LabelParentLayer,
    LabelStyle,
    LabelUpdateContext,
} from 'Layer/LabelLayerBase';

/** A label of an {@link InstancedLabelLayer}. */
type InstancedLayerLabel = LayerLabel & { instancedOptions: LabelOptions };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @param a - A style anchor along one axis: 0, -0.5 or -1 for left or top,
 * center or middle, right or bottom.
 * @returns The index of the nearest of those three.
 */
function anchorIndex(a: number) {
    return Math.min(2, Math.max(0, Math.round(-2 * a)));
}

/**
 * Splits a CSS colour into the colour without alpha, which THREE.Color reads,
 * and its alpha.
 *
 * @param css - A CSS colour, with or without alpha.
 * @returns The colour without alpha, and the alpha (1 when it has none).
 */
function splitAlpha(css: unknown): { color: string; opacity: number } {
    const split: { color?: unknown; opacity?: number } = rgba2rgb(String(css)) ?? {};
    return { color: String(split.color), opacity: split.opacity ?? 1 };
}

/**
 * Reads the options of an instanced label from the style, which must be set to
 * the context of the label's geometry.
 *
 * @param style - The layer style.
 * @param text - The label text.
 * @param anchor - The anchor from `Style.getTextAnchorPosition()`.
 * @returns Options for the `@itowns/labels` `Label` constructor.
 */
function instancedOptionsFromStyle(style: LabelStyle, text: string, anchor: number[]): LabelOptions {
    const { size, offset } = style.text;
    const color = splitAlpha(style.text.color);
    const halo = splitAlpha(style.text.haloColor);
    return {
        text,
        // A text-font stack: the package reads weight and style from its names.
        font: style.text.font,
        fontSize: size,
        color: color.color,
        opacity: style.text.opacity * color.opacity,
        haloColor: halo.color,
        haloOpacity: halo.opacity,
        haloWidth: style.text.haloWidth,
        haloBlur: style.text.haloBlur,
        offset: [offset[0] / size, offset[1] / size], // px to em
        maxWidth: style.text.wrap,
        letterSpacing: style.text.spacing,
        textAlign: TextAlign[capitalize(style.text.justify) as keyof typeof TextAlign] ?? TextAlign.Auto,
        textTransform: TextTransform[capitalize(style.text.transform) as keyof typeof TextTransform]
            ?? TextTransform.None,
        anchorX: [TextAnchorX.Left, TextAnchorX.Center, TextAnchorX.Right][anchorIndex(anchor[0])],
        anchorY: [TextAnchorY.Top, TextAnchorY.Middle, TextAnchorY.Bottom][anchorIndex(anchor[1])],
        rotationAlignment: RotationAlignment.Viewport,
    };
}

// The `performance` filter's box for an instanced label is estimated from its
// text, at this average glyph advance in em.
const GLYPH_ADVANCE = 0.55;

function ensureEstimatedOffset(label: InstancedLayerLabel, instanced: InstancedLabel) {
    if (label.offset) { return; }

    const { text, fontSize, lineHeight } = instanced;
    const longestLine = text.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
    label.setDimensions(Math.max(fontSize, longestLine * fontSize * GLYPH_ADVANCE), fontSize * lineHeight);
}

/**
 * The labels of one tile drawn by the view's instanced label manager: each
 * `Label` has one instanced label in the manager.
 */
class InstancedLabelsNode extends LabelsNode {
    readonly view: View;
    /** Instanced label of each `Label` of this node. */
    readonly instancedLabels = new Map<InstancedLayerLabel, InstancedLabel>();
    readonly manager: InstancedLabelManager;
    /** Instanced labels are hidden until the node is submitted to rendering. */
    labelsVisible = false;

    constructor(node: TileMesh, view: View) {
        super(node);
        this.view = view;
        this.manager = view.mainLoop.gfxEngine.instancedLabelRenderer.manager;
        // Instanced labels are drawn in 3D, on the interpolated terrain.
        this.readZ = DEMUtils.PRECISE_READ_Z;
    }

    get labels(): InstancedLayerLabel[] {
        return [...this.instancedLabels.keys()];
    }

    labelCount() {
        return this.instancedLabels.size;
    }

    addLabel(label: InstancedLayerLabel) {
        super.addLabel(label);

        // The space kept free around the label: the layer's `margin`, as for DOM labels.
        const instanced = new InstancedLabel({
            ...label.instancedOptions,
            padding: label.padding,
            visible: this.labelsVisible,
        });
        ensureEstimatedOffset(label, instanced);
        this.instancedLabels.set(label, instanced);
        this.manager.addLabel(instanced);
    }

    removeLabel(label: InstancedLayerLabel) {
        const instanced = this.instancedLabels.get(label);
        if (instanced) {
            this.manager.removeLabel(instanced);
            this.instancedLabels.delete(label);
        }
    }

    /** Releases every instanced label of this node. */
    clearLabels() {
        this.manager.removeLabels([...this.instancedLabels.values()]);
        this.instancedLabels.clear();
        this.view.notifyChange();
    }

    /**
     * Shows or hides every instanced label of this node. Shown labels fade in;
     * hidden ones fade out.
     *
     * @param visible - Whether the labels are shown.
     */
    setLabelsVisible(visible: boolean) {
        if (this.labelsVisible === visible) { return; }
        this.labelsVisible = visible;
        this.view.notifyChange();
        this.instancedLabels.forEach((l) => { l.visible = visible; });
    }

    /**
     * Hides the labels of this node that the globe's horizon hides. Only
     * labels with a `horizonCullingPoint` are tested.
     *
     * @param tileLayer - The layer the node belongs to.
     * @param camera - The view's camera.
     */
    cullHorizon(tileLayer: LabelParentLayer, camera: Camera) {
        for (const [label, instanced] of this.instancedLabels) {
            if (!label.horizonCullingPoint) { return; }
            instanced.visible = !tileLayer.pointCulling(label.horizonCullingPoint, camera);
        }
    }

    updatePosition(label: InstancedLayerLabel) {
        super.updatePosition(label);

        const instanced = this.instancedLabels.get(label);
        if (instanced && !instanced.position.equals(label.position)) {
            instanced.position = label.position;
        }
    }
}

/**
 * Labels of point features as GPU instanced text, drawn by the view's
 * `InstancedLabelRenderer`. Usually made with the option
 * `addLabelLayer: { instanced: true }` of a layer (see the
 * `vector_tile_instanced_labels` example). Icons are not drawn; labels of
 * features without altitude are clamped to the terrain.
 */
class InstancedLabelLayer extends LabelLayerBase {
    /** Always true; identifies instanced label layers. */
    readonly isInstancedLabelLayer: boolean;

    /**
     * @param id - The layer id, unique in the view.
     * @param config - Options; other elements are merged into the layer.
     * @param config.performance - Removes, in each tile, the labels that
     * overlap one already kept, highest order first, with sizes estimated from
     * the text. Default is true.
     * @param config.forceClampToTerrain - Clamp the labels of every feature to
     * the terrain, including features with an altitude. Default is false.
     * @param config.domElement - An HTML domElement, or a method returning one
     * from the properties of each feature: its text content is the label text.
     */
    constructor(id: string, config: LabelLayerBaseParameters) {
        super(id, config);

        this.isInstancedLabelLayer = true;
    }

    update(context: LabelUpdateContext, layer: this, node: TileMesh, parent?: TileMesh) {
        // The shared update stops at a hidden layer: its labels are hidden here.
        if (!this.visible) {
            (node.link[this.id] as InstancedLabelsNode | undefined)?.setLabelsVisible(false);
        }

        return super.update(context, layer, node, parent);
    }

    protected _needsAltitude(feature: { hasRawElevationData?: boolean }) {
        // Instanced labels of features without altitude are always clamped.
        return this.forceClampToTerrain === true || !feature.hasRawElevationData;
    }

    protected _createLabel(content: HTMLElement | string | undefined, coordinates: Coordinates): InstancedLayerLabel {
        const label = new Label(content, coordinates, this.style, { instanced: true }) as InstancedLayerLabel;

        const text = typeof content === 'string'
            ? content
            : content?.textContent ?? this.style.text.field ?? '';
        label.instancedOptions = instancedOptionsFromStyle(this.style, text, label.anchor);

        return label;
    }

    protected _createLabelsNode(node: TileMesh, view: View) {
        return new InstancedLabelsNode(node, view);
    }

    protected _isChildReady(child: TileMesh) {
        // A child outside the frustum is never updated, so instanced labels
        // do not wait for it.
        return !child.visible || super._isChildReady(child);
    }

    protected _submitToRendering(labelsNode: InstancedLabelsNode, camera: Camera) {
        labelsNode.setLabelsVisible(true);
        // Placed again after a tile or elevation change, then horizon culled.
        if (labelsNode.needsUpdate) {
            labelsNode.labels.forEach(l => labelsNode.updatePosition(l));
            labelsNode.needsUpdate = false;
            labelsNode.view.notifyChange();
        }
        labelsNode.cullHorizon(this.parent, camera);
    }

    protected _disallowToRendering(labelsNode: InstancedLabelsNode) {
        labelsNode.setLabelsVisible(false);
    }

    // Instanced labels have no DOM element to attach.
    protected _attachLabelsNode() {}

    protected _onLabelsLoaded(labelsNode: InstancedLabelsNode) {
        labelsNode.view.notifyChange();
    }

    protected _discardLabel(label: InstancedLayerLabel) {
        ObjectRemovalHelper.removeChildrenAndCleanupRecursively(this, label);
    }

    protected _releaseNode(node: TileMesh) {
        (node.link[this.id] as InstancedLabelsNode | undefined)?.clearLabels();
    }
}

export default InstancedLabelLayer;
