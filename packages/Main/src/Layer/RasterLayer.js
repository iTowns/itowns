import Layer from 'Layer/Layer';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Layer/LayerUpdateStrategy';
import textureConverter from 'Converter/textureConverter';
import { CACHE_POLICIES } from 'Core/Scheduler/Cache';

export function removeLayeredMaterialNodeTile(tileId) {
    /**
     * @param {TileMesh} node - The node to udpate.
     */
    return function removeLayeredMaterialNodeTile(node) {
        if (node.material?.removeTile) {
            if (node.material.elevationTile !== undefined) {
                node.setBBoxZ({ min: 0, max: 0 });
            }
            node.material.removeTile(tileId);
        }
        if (node.layerUpdateState && node.layerUpdateState[tileId]) {
            delete node.layerUpdateState[tileId];
        }
    };
}

class RasterLayer extends Layer {
    constructor(id, config) {
        const {
            cacheLifeTime = CACHE_POLICIES.TEXTURE,
            minFilter,
            magFilter,
            updateStrategy,
            ...layerConfig
        } = config;

        super(id, {
            ...layerConfig,
            cacheLifeTime,
        });

        this.visible = true;
        this.minFilter = minFilter;
        this.magFilter = magFilter;

        this.updateStrategy = updateStrategy ?? {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
            options: {},
        };
    }

    convert(data, extentDestination) {
        return textureConverter.convert(data, extentDestination, this);
    }

    /**
     * All layer's textures are removed from scene and disposed from video device.
     * @param {boolean} [clearCache=false] Whether to clear the layer cache or not
     */
    delete(clearCache) {
        if (clearCache) {
            this.cache.clear();
        }
        for (const root of this.parent.level0Nodes) {
            root.traverse(removeLayeredMaterialNodeTile(this.id));
        }
    }

    hasData(node) {
        const minZoom = Math.max(this.source.zoom.min, this.zoom.min);

        const tiles  = node.getExtentsByProjection(this.crs)
            .map(e => e.tiledExtentParent(minZoom));

        return tiles.some(e => e.zoom >= minZoom && this.source.hasData(e));
    }

    /**
     * Indicates whether an existing raster tile must be recreated.
     * Subclasses can override this to force rebuilding tiles based on tile state.
     *
     * @param {RasterTile} rasterTile - Current raster tile attached to the node.
     * @returns {boolean} `true` to recreate the raster tile, `false` to keep it.
     */
    // eslint-disable-next-line no-unused-vars
    overloadRasterTile(rasterTile) {
        return false;
    }

    /**
     * Returns the raster tile associated with this layer for a given node.
     *
     * @param {TileMesh} node - The tile mesh carrying layered material tiles.
     * @returns {?RasterTile} The matching raster tile, or `undefined` when none exists.
     */
    getRasterTile(node) {
        return node.material.getTile(this.id);
    }

    /**
     * Updates raster data for a node if the layer is active and data is available.
     * Creates or recreates the raster tile when needed, then triggers loading.
     *
     * @param {object} context - Update context.
     * @param {View} context.view - Active view used to schedule loading.
     * @param {RasterLayer} layer - Current raster layer.
     * @param {TileMesh} node - Tile node to update.
     * @returns {Promise<void>|undefined} A loading promise when an update is scheduled.
     */
    update(context, layer, node) {
        if (layer.visible && !layer.freeze && this.hasData(node)) {
            let rasterTile = this.getRasterTile(node);

            if (!rasterTile || this.overloadRasterTile(rasterTile)) {
                rasterTile = this.setupRasterNode(node);
            }

            if (rasterTile && (!rasterTile.hasData() || (node.visible && node.material.visible))) {
                return rasterTile.load(node, context.view);
            }
        }
    }
}

export default RasterLayer;
