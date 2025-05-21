import Tile from 'Core/Tile/Tile';
import URLBuilder from 'Provider/URLBuilder';
import { Extent } from '@itowns/geographic';
import Layer from 'Layer/Layer';
import { RemoteSource, RemoteSourceOptions } from './RemoteSource';
import { LayerEventHandler } from './Source';

export type TmsLimit = {
    minTileRow: number;
    maxTileRow: number;
    minTileCol: number;
    maxTileCol: number;
};

export interface TmsSourceOptions<Data> extends RemoteSourceOptions<Data> {
    tileMatrixSetLimits?: Record<number, TmsLimit>;
    tileMatrixCallback?: (level: number) => string;
    isInverted?: boolean;
    zoom?: { min: number; max: number; };
}

/**
 * An object defining the source of resources to get from a
 * [TMS](https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification) server.
 *
 * @example
 *
 * **Source from OpenStreetMap server:**
 * ```ts
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
 * ```
 *
 * @example
 *
 * **Source from Mapbox server:**
 * ```ts
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
 * ```
 */
export class TmsSource<Data> extends RemoteSource<Tile, Data> implements LayerEventHandler {
    /** Used to checkout whether this source is a TMSSource. */
    public readonly isTMSSource = true as const;
    public readonly isSourceEventHandler = true as const;

    /**
     * Minimum and maximum values of the zoom level.
     * Defaults are 0 and Infinity.
     */
    public zoom: { min: number; max: number; };
    /**
     * The isInverted property is to be set to the correct value, true or false
     * (default being false) if the computation of the coordinates needs to be
     * inverted to match the same scheme as OSM, Google Maps or other system.
     * See [this link](https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/)
     * for more information.
     */
    public isInverted: boolean;

    /** Describes the available tile for this layer. */
    public tileMatrixSetLimits?: Record<number, TmsLimit>;

    /** These are the extents of the set of identical zoom tiles. */
    public extentSetLimits: Record<string, Record<number, Extent>>;

    /**
     * Creates a TileMatrix identifier from the zoom level. For example, if set
     * to `(zoomLevel) => 'EPSG:4326:' + zoomLevel`, the TileMatrix that will be
     * fetched at zoom level 5 will be the one with identifier `EPSG:4326:5`.
     * By default, the method returns the input zoom level.
     */
    public tileMatrixCallback: (level: number) => string;

    public constructor(
        options: TmsSourceOptions<Data>,
    ) {
        super(options);

        this.extentSetLimits = {};

        this.isInverted = options.isInverted ?? false;
        this.tileMatrixSetLimits = options.tileMatrixSetLimits;
        this.tileMatrixCallback = options.tileMatrixCallback ?? (zoomLevel => zoomLevel.toString());

        if (options.zoom) {
            this.zoom = options.zoom;
        } else if (this.tileMatrixSetLimits) {
            const arrayLimits = Object.keys(this.tileMatrixSetLimits);
            const size = arrayLimits.length;
            const maxZoom = Number(arrayLimits[size - 1]);
            this.zoom = {
                min: maxZoom - size + 1,
                max: maxZoom,
            };
        } else {
            this.zoom = {
                min: 0,
                max: Infinity,
            };
        }
    }

    public async load(tile: Tile): Promise<Data> {
        return this.loader.loadAsync(URLBuilder.xyz(tile, this));
    }

    public onLayerAdded(layer: Layer & { parent?: Layer }): void {
        const parent = layer.parent;
        const crs = parent ? parent.crs : layer.crs;

        if (this.tileMatrixSetLimits && !this.extentSetLimits[crs]) {
            this.extentSetLimits[crs] = {};
            const tile = new Tile(this.crs, 0, 0, 0);
            for (let i = this.zoom.max; i >= this.zoom.min; i--) {
                const tmsl = this.tileMatrixSetLimits[i];
                const { west, north } = tile.set(i, tmsl.minTileRow, tmsl.minTileCol).toExtent(crs);
                const { east, south } = tile.set(i, tmsl.maxTileRow, tmsl.maxTileCol).toExtent(crs);
                this.extentSetLimits[crs][i] = new Extent(crs, west, east, south, north);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onLayerRemoved(_layer: Layer): void { }
}
