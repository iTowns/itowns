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

    anyVisibleData(node) {
        const maxZoom = Math.min(this.source.zoom.max, this.zoom.max);

        const extents  = node.getExtentsByProjection(this.crs)
            .map(e => e.tiledExtentParent(maxZoom));

        return extents.find(e => this.source.anyVisibleData(e) && e.zoom >= this.zoom.min);
    }

    update(context, layer, node) {
        if (layer.visible && !layer.freeze && this.anyVisibleData(node)) {
            const rasterTile = node.material.getTile(this.id) || this.setupRasterNode(node);

            rasterTile.load(node, context.view);
        }
    }
}

export default RasterLayer;
