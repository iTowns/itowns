import PMTilesSource from 'Source/PMTilesSource';
import VectorTileParser from 'Parser/VectorTileParser';
import { LRUCache } from 'lru-cache';

/**
 * An object defining the source of vector tile resources from a PMTiles archive.
 * It inherits from {@link PMTilesSource}.
 *
 * This source is designed to work with PMTiles archives containing MVT
 * (Mapbox Vector Tiles) data.
 *
 * @extends PMTilesSource
 *
 * @property {boolean} isPMTilesVectorSource - Used to checkout whether this
 * source is a PMTilesVectorSource. Default is true. You should not change this,
 * as it is used internally for optimisation.
 * @property {Object} layers - Object containing layer definitions for styling.
 * @property {Object} styles - Object containing style definitions.
 * @property {boolean} isInverted - Whether the Y coordinate is inverted (TMS vs XYZ).
 *
 * @example
 * // Create a PMTilesVectorSource
 * const pmtilesSource = new itowns.PMTilesVectorSource({
 *     url: 'https://example.com/data.pmtiles',
 *     layers: {
 *         'buildings': [{ id: 'buildings', filterExpression: { filter: () => true } }],
 *         'roads': [{ id: 'roads', filterExpression: { filter: () => true } }],
 *     },
 * });
 *
 * // Create a ColorLayer with the source
 * const layer = new itowns.ColorLayer('pmtiles-layer', {
 *     source: pmtilesSource,
 *     style: new itowns.Style({
 *         fill: { color: 'blue', opacity: 0.5 },
 *         stroke: { color: 'white', width: 1 },
 *     }),
 * });
 *
 * view.addLayer(layer);
 *
 * @example
 * // Simpler usage with automatic layer detection
 * const pmtilesSource = new itowns.PMTilesVectorSource({
 *     url: 'https://example.com/data.pmtiles',
 * });
 *
 * const layer = new itowns.ColorLayer('pmtiles-layer', {
 *     source: pmtilesSource,
 *     style: new itowns.Style({
 *         fill: { color: 'steelblue' },
 *     }),
 * });
 */
class PMTilesVectorSource extends PMTilesSource {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * PMTilesVectorSource and {@link PMTilesSource}.
     * @param {string} source.url - The URL of the PMTiles archive.
     * @param {Object} [source.layers] - Layer definitions for filtering features.
     * If not provided, all layers will be included.
     * @param {Object} [source.styles] - Style definitions per layer.
     * @param {boolean} [source.isInverted=true] - Whether Y coordinates are inverted.
     * Default is true for standard web tile schemes (XYZ/TMS).
     */
    constructor(source) {
        // Set format for vector tiles
        source.format = 'application/x-protobuf;type=mapbox-vector';

        // PMTiles vector tiles are typically EPSG:3857
        source.crs = source.crs || 'EPSG:3857';

        super(source);

        this.isPMTilesVectorSource = true;
        this.isVectorSource = true;

        // Y coordinate inversion (standard for web tiles)
        this.isInverted = source.isInverted !== undefined ? source.isInverted : true;

        // Initialize layer and style storage
        this.layers = source.layers || {};
        this.styles = source.styles || {};

        // Parser for MVT tiles
        this.parser = VectorTileParser.parse;

        // Chain onto whenReady to also parse metadata for layer info
        this.whenReady = this.whenReady.then(async (header) => {
            // Try to get metadata which may contain layer information
            try {
                const metadata = await this.pmtiles.getMetadata();
                if (metadata) {
                    this._metadata = metadata;

                    // If no layers were provided, try to auto-detect from metadata
                    if (Object.keys(this.layers).length === 0 && metadata.vector_layers) {
                        this._setupLayersFromMetadata(metadata.vector_layers);
                    }
                }
            } catch (e) {
                // Metadata is optional, continue without it
                console.warn('PMTilesVectorSource: Could not load metadata', e);
            }

            return header;
        });
    }

    /**
     * Setup layers from PMTiles metadata.
     *
     * @param {Array} vectorLayers - Array of vector layer definitions from metadata
     * @private
     */
    _setupLayersFromMetadata(vectorLayers) {
        vectorLayers.forEach((layerDef, index) => {
            const layerId = layerDef.id;
            if (!this.layers[layerId]) {
                this.layers[layerId] = [{
                    id: layerId,
                    order: index,
                    filterExpression: { filter: () => true },
                }];
            }
            // Store original layer config for visibility toggling
            if (!this._originalLayers) {
                this._originalLayers = {};
            }
            this._originalLayers[layerId] = [...this.layers[layerId]];
        });

        // Initialize visibility state
        this._layerVisibility = {};
        Object.keys(this.layers).forEach((name) => {
            this._layerVisibility[name] = true;
        });
    }

    /**
     * Set visibility of a specific source layer.
     *
     * @param {string} layerName - The name of the source layer
     * @param {boolean} visible - Whether the layer should be visible
     */
    setLayerVisibility(layerName, visible) {
        if (!this._layerVisibility) {
            this._layerVisibility = {};
        }
        this._layerVisibility[layerName] = visible;

        // Update layers object based on visibility
        if (this._originalLayers && this._originalLayers[layerName]) {
            if (visible) {
                this.layers[layerName] = [...this._originalLayers[layerName]];
            } else {
                // Set to empty array so parser skips this layer
                this.layers[layerName] = [];
            }
        }
    }

    /**
     * Set visibility of all source layers.
     *
     * @param {boolean} visible - Whether all layers should be visible
     */
    setAllLayersVisibility(visible) {
        if (this._originalLayers) {
            Object.keys(this._originalLayers).forEach((layerName) => {
                this.setLayerVisibility(layerName, visible);
            });
        }
    }

    /**
     * Get visibility state of a layer.
     *
     * @param {string} layerName - The name of the source layer
     * @returns {boolean} Whether the layer is visible
     */
    getLayerVisibility(layerName) {
        return this._layerVisibility ? this._layerVisibility[layerName] !== false : true;
    }

    /**
     * Get all layer names from the source.
     *
     * @returns {string[]} Array of layer names
     */
    getLayerNames() {
        return this._originalLayers ? Object.keys(this._originalLayers) : Object.keys(this.layers);
    }

    /**
     * Clear the feature cache. Call this after changing layer visibility
     * to force tiles to be re-fetched and re-parsed.
     */
    clearCache() {
        if (this._featuresCaches) {
            Object.values(this._featuresCaches).forEach((cache) => {
                if (cache.clear) {
                    cache.clear();
                }
            });
        }
    }

    /**
     * Called when layer is added. Sets up caching.
     *
     * @param {Object} options - Options
     */
    onLayerAdded(options) {
        super.onLayerAdded(options);

        // Setup cache for features
        if (!this._featuresCaches[options.out.crs]) {
            this._featuresCaches[options.out.crs] = new LRUCache({ max: 500 });
        }
    }

    /**
     * Generate a cache key for a tile.
     *
     * @param {Extent|Object} extent - The extent or tile coordinates
     * @returns {string} Cache key
     */
    getDataKey(extent) {
        if (extent.isTile) {
            return `z${extent.zoom}r${extent.row}c${extent.col}`;
        }
        return `z${extent.zoom}r${extent.row}c${extent.col}`;
    }

    /**
     * Load data for a given extent.
     *
     * @param {Extent|Object} extent - The extent to load data for
     * @param {Object} out - Output options (layer configuration)
     * @returns {Promise<FeatureCollection>} Promise resolving to parsed features
     */
    loadData(extent, out) {
        const cache = this._featuresCaches[out.crs];
        const key = this.getDataKey(extent);

        // Try to get from cache
        let features = cache.get(key);
        if (features) {
            return features;
        }

        // Get tile coordinates
        const z = extent.zoom;
        const x = extent.col;
        const y = extent.row;

        // Fetch and parse the tile
        features = this.getTile(z, x, y)
            .then((data) => {
                if (!data) {
                    // No tile data - return empty collection
                    return Promise.resolve(null);
                }

                // Parse the MVT data
                return this.parser(data, {
                    extent,
                    in: this,
                    out,
                });
            })
            .catch((err) => {
                console.error('PMTilesVectorSource: Error loading tile', z, x, y, err);
                return null;
            });

        // Cache the promise
        cache.set(key, features);
        return features;
    }
}

export default PMTilesVectorSource;
