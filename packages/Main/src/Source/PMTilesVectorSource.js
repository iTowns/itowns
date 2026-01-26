import PMTilesSource from 'Source/PMTilesSource';
import { FeatureCollection } from 'Core/Feature';

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
        // Note: isVectorSource is set by Source.js based on format
        // Note: parser is set by Source.js from supportedParsers for this format

        // Y coordinate inversion (standard for web tiles)
        this.isInverted = source.isInverted !== undefined ? source.isInverted : true;

        // Initialize layer and style storage
        this.layers = source.layers || {};
        this.styles = source.styles || {};

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
        });
    }

    /**
     * Get all layer names from the source.
     *
     * @returns {string[]} Array of layer names
     */
    getLayerNames() {
        return Object.keys(this.layers);
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
                    // No tile data - return empty FeatureCollection
                    return Promise.resolve(new FeatureCollection(out));
                }

                // Parse the MVT data
                return this.parser(data, {
                    extent,
                    in: this,
                    out,
                });
            })
            .catch(err => this.handlingError(err));

        // Cache the promise
        cache.set(key, features);
        return features;
    }
}

export default PMTilesVectorSource;
