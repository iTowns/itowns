import Tile from 'Core/Tile/Tile';
import URLBuilder from 'Provider/URLBuilder';
import { Extent } from '@itowns/geographic';
import * as THREE from 'three';
import Layer from 'Layer/Layer';
import { RemoteSource, RemoteSourceOptions } from './RemoteSource';

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

export class TmsSource<Data extends THREE.Texture>
    extends RemoteSource<Tile, Data> {
    public readonly isTMSSource = true as const;
    public readonly isSourceEventHandler = true as const;

    public zoom: { min: number; max: number; };
    public isInverted: boolean;

    public tileMatrixSetLimits?: Record<number, TmsLimit>;

    public extentSetLimits: Record<string, Record<number, Extent>>;

    public tileMatrixCallback: (level: number) => string;

    protected constructor(
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

        this.capabilities = {
            layerEventHandler: {
                onLayerAdded: this.onLayerAdded,
                onLayerRemoved: this.onLayerRemoved,
            },
        };
    }

    public async load(tile: Tile): Promise<Data> {
        return this.loader.loadAsync(URLBuilder.xyz(tile, this));
    }

    protected onLayerAdded(layer: Layer & { parent?: Layer }): void {
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
    protected onLayerRemoved(_layer: Layer): void {}
}
