import { PMTiles } from 'pmtiles';
import Source from 'Source/Source';
import { Extent } from '@itowns/geographic';

/**
 * An object defining the source of resources to get from a
 * [PMTiles](https://github.com/protomaps/PMTiles) archive. It inherits from
 * {@link Source}.
 *
 * PMTiles is a single-file archive format for tiled data that enables
 * efficient access via HTTP range requests, eliminating the need for
 * a dedicated tile server.
 *
 * @extends Source
 *
 * @property {boolean} isPMTilesSource - Used to checkout whether this source is
 * a PMTilesSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {PMTiles} pmtiles - The PMTiles instance for accessing the archive.
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum zoom level of the source.
 * @property {number} zoom.max - The maximum zoom level of the source.
 */
class PMTilesSource extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * PMTilesSource and {@link Source}. Only `url` is mandatory.
     * @param {string} source.url - The URL of the PMTiles archive.
     * @param {string} [source.crs='EPSG:3857'] - The CRS of the tile data.
     * Most PMTiles use Web Mercator (EPSG:3857).
     */
    constructor(source) {
        // Set default CRS for PMTiles (Web Mercator is standard)
        source.crs = source.crs || 'EPSG:3857';

        super(source);

        this.isPMTilesSource = true;

        // Initialize PMTiles instance
        this.pmtiles = new PMTiles(source.url);

        // Initialize zoom range (will be updated from header)
        this.zoom = source.zoom || { min: 0, max: 22 };

        // Promise that resolves when the PMTiles header is loaded
        this.whenReady = this.pmtiles.getHeader().then((header) => {
            this._header = header;

            // Update zoom range from header
            this.zoom = {
                min: header.minZoom ?? 0,
                max: header.maxZoom ?? 22,
            };

            // Set extent from header bounds if not already specified
            if (!this.extent && header.minLon != null) {
                // PMTiles header bounds are in WGS84 (EPSG:4326)
                // Convert to source CRS extent
                this.extent = new Extent(
                    'EPSG:4326',
                    header.minLon,
                    header.maxLon,
                    header.minLat,
                    header.maxLat,
                );

                // If source CRS is different, we'll need to handle this
                // For now, store the WGS84 extent for limit checking
                this._wgs84Extent = this.extent.clone();
            }

            return header;
        });
    }

    /**
     * Get tile data from the PMTiles archive.
     *
     * @param {number} z - Zoom level
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @returns {Promise<ArrayBuffer|undefined>} The tile data or undefined if not found
     */
    async getTile(z, x, y) {
        const result = await this.pmtiles.getZxy(z, x, y);
        return result ? result.data : undefined;
    }

    /**
     * Tests if an extent is inside the source limits.
     *
     * @param {Extent} extent - Extent to test.
     * @param {number} zoom - The zoom level to test.
     * @returns {boolean} True if the extent is inside the limit, false otherwise.
     */
    extentInsideLimit(extent, zoom) {
        // Check zoom limits
        if (zoom < this.zoom.min || zoom > this.zoom.max) {
            return false;
        }

        // Check spatial extent if we have bounds
        if (this._wgs84Extent) {
            // Convert extent to WGS84 for comparison if needed
            const extentWGS84 = extent.crs === 'EPSG:4326'
                ? extent
                : extent.as('EPSG:4326');

            return this._wgs84Extent.intersectsExtent(extentWGS84);
        }

        return true;
    }

    /**
     * Called when layer is removed. Cleans up resources.
     *
     * @param {Object} options - Options
     */
    onLayerRemoved(options = {}) {
        super.onLayerRemoved(options);
        // PMTiles doesn't need explicit cleanup, but we could add it here if needed
    }
}

export default PMTilesSource;
