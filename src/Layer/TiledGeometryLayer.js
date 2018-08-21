import GeometryLayer from './GeometryLayer';
import Picking from '../Core/Picking';
import { processTiledGeometryNode } from '../Process/TiledNodeProcessing';

class TiledGeometryLayer extends GeometryLayer {
    /**
     * A layer extending the {@link GeometryLayer}, but with a tiling notion.
     *
     * @constructor
     * @extends GeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {THREE.Object3d} object3d - The object3d used to contain the
     * geometry of the TiledGeometryLayer. It is usually a
     * <code>THREE.Group</code>, but it can be anything inheriting from a
     * <code>THREE.Object3d</code>.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     */
    constructor(id, object3d, config) {
        super(id, object3d, config);

        this.protocol = 'tile';
        this.lighting = {
            enable: false,
            position: { x: -0.5, y: 0.0, z: 1.0 },
        };
    }

    /**
     * Picking method for this layer. It uses the {@link Picking#pickTilesAt}
     * method.
     *
     * @param {View} view - The view instance.
     * @param {Object} coordinates - The coordinates to pick in the view. It
     * should have at least <code>x</code> and <code>y</code> properties.
     * @param {number} radius - Radius of the picking circle.
     *
     * @return {Array} An array containing all targets picked under the
     * specified coordinates.
     */
    pickObjectsAt(view, coordinates, radius = this.options.defaultPickingRadius) {
        return Picking.pickTilesAt(view, coordinates, radius, this);
    }

    preUpdate(context, changeSources) {
        if (changeSources.has(undefined) || changeSources.size == 0) {
            return this.level0Nodes;
        }

        if (__DEBUG__) {
            this._latestUpdateStartingLevel = 0;
        }

        context.colorLayers = context.view.getLayers(
            (l, a) => a && a.id == this.id && l.type == 'color');
        context.elevationLayers = context.view.getLayers(
            (l, a) => a && a.id == this.id && l.type == 'elevation');

        context.maxElevationLevel = -1;
        for (const e of context.elevationLayers) {
            context.maxElevationLevel = Math.max(e.options.zoom.max, context.maxElevationLevel);
        }
        if (context.maxElevationLevel == -1) {
            context.maxElevationLevel = Infinity;
        }

        let commonAncestor;
        for (const source of changeSources.values()) {
            if (source.isCamera) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return this.level0Nodes;
            }
            if (source.this === this) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = source.findCommonAncestor(commonAncestor);
                    if (!commonAncestor) {
                        return this.level0Nodes;
                    }
                }
                if (commonAncestor.material == null) {
                    commonAncestor = undefined;
                }
            }
        }
        if (commonAncestor) {
            if (__DEBUG__) {
                this._latestUpdateStartingLevel = commonAncestor.level;
            }
            return [commonAncestor];
        } else {
            return this.level0Nodes;
        }
    }

    update(context, layer, node) {
        return processTiledGeometryNode(this.culling, this.subdivision)(context, this, node);
    }

    onTileCreated(node) {
        node.material.setLightingOn(this.lighting.enable);
        node.material.uniforms.lightPosition.value = this.lighting.position;

        if (this.noTextureColor) {
            node.material.uniforms.noTextureColor.value.copy(this.noTextureColor);
        }

        if (__DEBUG__) {
            node.material.uniforms.showOutline = { value: this.showOutline || false };
            node.material.wireframe = this.wireframe || false;
        }
    }

    // eslint-disable-next-line class-methods-use-this
    countColorLayersTextures(...layers) {
        return layers.length;
    }

    /**
     * Tell if a node has enough elevation or color textures to subdivide.
     * Subdivision is prevented if:
     * <ul>
     *  <li>the node is covered by at least one elevation layer and if the node
     *  doesn't have an elevation texture yet</li>
     *  <li>a color texture is missing</li>
     * </ul>
     *
     * @param {Object} context
     * @param {TileMesh} node - The node to subdivide.
     *
     * @returns {boolean} False if the node can not be subdivided, true
     * otherwise.
     */
    static hasEnoughTexturesToSubdivide(context, node) {
        for (const e of context.elevationLayers) {
            if (!e.frozen && e.ready && e.tileInsideLimit(node, e) && !node.material.isElevationLayerLoaded()) {
                // no stop subdivision in the case of a loading error
                if (node.layerUpdateState[e.id] && node.layerUpdateState[e.id].inError()) {
                    continue;
                }
                return false;
            }
        }

        for (const c of context.colorLayers) {
            if (c.frozen || !c.visible || !c.ready) {
                continue;
            }
            // no stop subdivision in the case of a loading error
            if (node.layerUpdateState[c.id] && node.layerUpdateState[c.id].inError()) {
                continue;
            }
            if (c.tileInsideLimit(node, c) && !node.material.isColorLayerLoaded(c)) {
                return false;
            }
        }
        return true;
    }
}

export default TiledGeometryLayer;
