import Layer from 'Layer/Layer';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Layer/LayerUpdateStrategy';
import textureConverter from 'Converter/textureConverter';
import { CACHE_POLICIES } from 'Core/Scheduler/Cache';

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
            root.traverse(this.removeRasterTile.bind(this));
        }
    }

    hasData(node) {
        const minZoom = Math.max(this.source.zoom.min, this.zoom.min);

        const tiles  = node.getExtentsByProjection(this.crs)
            .map(e => e.tiledExtentParent(minZoom));

        return tiles.some(e => e.zoom >= minZoom && this.source.hasData(e));
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
        const raster = node.material.getTile(this.id) || this.addRasterTile(node);

        if (layer.visible && !layer.frozen && node.visible && node.material.visible &&
            !raster.state.hasFinished()) {
            return raster.load(node, context.view)
                .then(() => (node.material.layersNeedUpdate = true));
        }
    }

    addRasterTile(node) {
        const tiles = node.getExtentsByProjection(this.crs);

        const rasterTile = new this.rasterTile(this, tiles);

        rasterTile.initFromParent(this.getRasterTileParent(node));

        node.material.addRasterTile(rasterTile);

        if (!this.hasData(node)) {
            rasterTile.state.noMoreUpdatePossible();
        };

        // set up ColorLayer ordering.
        node.material.setColorTileIds(this.parent.colorLayersOrder);

        return rasterTile;
    }

    removeRasterTile(node) {
        node.material.removeTile(this.id);
    }

    onNodeCreated() {}
}

export default RasterLayer;
