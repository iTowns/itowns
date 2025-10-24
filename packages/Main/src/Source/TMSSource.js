import { LRUCache } from 'lru-cache';
import { Extent } from '@itowns/geographic';
import GeoJsonParser from 'Parser/GeoJsonParser';
import KMLParser from 'Parser/KMLParser';
import GpxParser from 'Parser/GpxParser';
import VectorTileParser from 'Parser/VectorTileParser';
import GTXParser from 'Parser/GTXParser';
import ISGParser from 'Parser/ISGParser';
import GDFParser from 'Parser/GDFParser';
import Fetcher from 'Provider/Fetcher';
import { globalExtentTMS } from 'Core/Tile/TileGrid';
import Tile from 'Core/Tile/Tile';
import { xyz, subDomains } from 'Provider/URLBuilder';
import URLSource from './URLSource';

const _tile = new Tile('EPSG:4326', 0, 0, 0);

export const supportedParsers = new Map([
    ['application/geo+json', GeoJsonParser.parse],
    ['application/json', GeoJsonParser.parse],
    ['application/kml', KMLParser.parse],
    ['application/gpx', GpxParser.parse],
    ['application/x-protobuf;type=mapbox-vector', VectorTileParser.parse],
    ['application/gtx', GTXParser.parse],
    ['application/isg', ISGParser.parse],
    ['application/gdf', GDFParser.parse],
]);

/**
 * An object defining the source of resources to get from a
 * [TMS](https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification) server.
 * It inherits from {@link Source}.
 *
 * @extends Source
 *
 * @property {boolean} isTMSSource - Used to checkout whether this source is a
 * TMSSource. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {boolean} isInverted - The isInverted property is to be set to the
 * correct value, true or false (default being false) if the computation of the
 * coordinates needs to be inverted to match the same scheme as OSM, Google Maps
 * or other system. See [this link](
 * https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/)
 * for more information.
 * @property {Object} tileMatrixSetLimits - it describes the available tile for this layer
 * @property {Object} extentSetlimits - these are the extents of the set of identical zoom tiles.
 * @property {Object} zoom - Object containing the minimum and maximum values of
 * the level, to zoom in the source.
 * @property {number} zoom.min - The minimum level of the source. Default value
 * is 0.
 * @property {number} zoom.max - The maximum level of the source. Default value
 * is 20.
 * @property {function} tileMatrixCallback - a method that create a TileMatrix
 * identifier from the zoom level. For example, if set to `(zoomLevel) => 'EPSG:4326:' + zoomLevel`,
 * the TileMatrix that will be fetched at zoom level 5 will be the one with identifier `EPSG:4326:5`.
 * By default, the method returns the input zoom level.
 *
 * @example <caption><b>Source from OpenStreetMap server :</b></caption>
 * // Create the source
 * const tmsSource = new itowns.TMSSource({
 *     format: 'image/png',
 *     url: 'http://osm.io/styles/${z}/${x}/${y}.png',
 *     attribution: {
 *         name: 'OpenStreetMap',
 *         url: 'http://www.openstreetmap.org/',
 *     },
 *     crs: 'EPSG:3857',
 * });
 *
 * // Create the layer
 * const colorLayer = new itowns.ColorLayer('OPENSM', {
 *     source: tmsSource,
 * });
 *
 * // Add the layer
 * view.addLayer(colorLayer);
 *
 * @example <caption><b>Source from Mapbox server :</b></caption>
 * // Create the source
 * const orthoSource = new itowns.TMSSource({
 *     url: 'https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.jpg?access_token=' + accessToken,
 *     crs: 'EPSG:3857',
 * };
 *
 * // Create the layer
 * const imageryLayer = new itowns.ColorLayer("Ortho", {
 *     source: orthoSource,
 * };
 *
 * // Add the layer to the view
 * view.addLayer(imageryLayer);
 */
class TMSSource extends URLSource {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * TMSSource and {@link Source}. Only `url` is mandatory.
     */
    constructor(source) {
        const {
            format = 'image/png',
            fetcher = Fetcher.get(format),
            parser = supportedParsers.get(format) ?? ((d, opt) => { d.extent = opt.extent; return d; }),
            crs,
            extent,
            zoom,
            isInverted = false,
            tileMatrixSetLimits,
            extentSetlimits = {},
            tileMatrixCallback = (zoomLevel => zoomLevel),
        } = source;

        if (!fetcher) {
            throw new Error(`[WMTSource/TMSSource]: unsupported fetcher type ${format}.`);
        }

        if (!parser) {
            throw new Error(`[WMTSource/TMSSource]: unsupported parser type ${format}.`);
        }

        super({ ...source, fetcher, parser });

        if (!crs) {
            throw new Error(`[${this.constructor.name}]: crs is required`);
        }

        this.isTMSSource = true;
        this.isVectorSource = (source.parser || supportedParsers.get(format)) !== undefined;
        this.format = format;

        if (!extent) {
            // default to the global extent
            this.extent = globalExtentTMS.get(crs);
        }

        this.zoom = zoom;
        this.isInverted = isInverted;
        this.crs = crs;
        this.tileMatrixSetLimits = tileMatrixSetLimits;
        this.extentSetlimits = extentSetlimits;
        this.tileMatrixCallback = tileMatrixCallback;

        if (!this.zoom) {
            if (this.tileMatrixSetLimits) {
                const arrayLimits = Object.keys(this.tileMatrixSetLimits);
                const size = arrayLimits.length;
                const maxZoom = Number(arrayLimits[size - 1]);
                const minZoom = maxZoom - size + 1;

                this.zoom = {
                    min: minZoom,
                    max: maxZoom,
                };
            } else {
                this.zoom = { min: 0, max: Infinity };
            }
        }

        this._featuresCaches = this.isVectorSource ? {} : null;
    }

    urlFromExtent(tile) {
        return subDomains(xyz(tile, this));
    }

    getDataKey(tile) {
        return `z${tile.zoom}r${tile.row}c${tile.col}`;
    }

    loadData(extent, out) {
        if (!this._featuresCaches) {
            return super.loadData(extent, out);
        }

        const cache = this._featuresCaches[out.crs];
        const key = this.getDataKey(extent);
        // console.log('Source.loadData', key);
        // try to get parsed data from cache
        let features = cache.get(key);
        if (!features) {
            features = super.loadData(extent, out);
            cache.set(key, features);
        }
        return features;
    }

    onLayerAdded(options) {
        // Added new cache by crs
        if (this._featuresCaches && !this._featuresCaches[options.out.crs]) {
            // Cache feature only if it's vector data, the feature are cached in source.
            // It's not necessary to cache raster in Source,
            // because it's already cached on layer.
            this._featuresCaches[options.out.crs] = new LRUCache({ max: 500 });
        }

        // Build extents of the set of identical zoom tiles.
        const parent = options.out.parent;
        // The extents crs is chosen to facilitate in raster tile process.
        const crs = parent ? parent.extent.crs : options.out.crs;
        if (this.tileMatrixSetLimits && !this.extentSetlimits[crs]) {
            this.extentSetlimits[crs] = {};
            _tile.crs = this.crs;
            for (let i = this.zoom.max; i >= this.zoom.min; i--) {
                const tmsl = this.tileMatrixSetLimits[i];
                const { west, north } = _tile.set(i, tmsl.minTileRow, tmsl.minTileCol).toExtent(crs);
                const { east, south } = _tile.set(i, tmsl.maxTileRow, tmsl.maxTileCol).toExtent(crs);
                this.extentSetlimits[crs][i] = new Extent(crs, west, east, south, north);
            }
        }
    }

    onLayerRemoved(options = {}) {
        if (!this._featuresCaches) {
            return;
        }

        // delete unused cache
        const unusedCache = this._featuresCaches[options.unusedCrs];
        if (unusedCache) {
            unusedCache.clear();
            delete this._featuresCaches[options.unusedCrs];
        }
    }

    extentInsideLimit(extent, zoom) {
        // This layer provides data starting at level = layer.source.zoom.min
        // (the zoom.max property is used when building the url to make
        //  sure we don't use invalid levels)
        return zoom >= this.zoom.min && zoom <= this.zoom.max &&
                (this.extentSetlimits[extent.crs] == undefined || this.extentSetlimits[extent.crs][zoom].intersectsExtent(extent));
    }
}

export default TMSSource;
