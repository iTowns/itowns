import Tile from 'Core/Tile/Tile';
import Fetcher from 'Provider/Fetcher';
import URLBuilder from 'Provider/URLBuilder';
import type { CRS, Extent } from '@itowns/geographic';
import { RemoteSource, RemoteSourceOptions } from './RemoteSource';

type Fetcher<T> = (uri: string, header: RequestInit) => Promise<T>;

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

export class TmsSource<Data> extends RemoteSource<Tile, Data> {
    public readonly isTMSSource = true as const;

    public zoom: { min: number; max: number; };
    public isInverted: boolean;

    public tileMatrixSetLimits?: Record<number, TmsLimit>;

    public extentSetlimits: Record<string, Record<number, Extent>>;

    public tileMatrixCallback: (level: number) => string;

    private fetcher: Fetcher<unknown>;

    public constructor(
        options: TmsSourceOptions<Data>,
    ) {
        super(options);

        this.crs = options.crs;
    }

    public get url(): string {
        return this.url_;
    }

    public async load(tile: Tile): Promise<Data> {
        // Fetch and parse the data
        try {
            const file = await this.fetcher(URLBuilder.xyz(tile, this), this.networkOptions_);
            const data = this.loader.getData(file);
            return data;
        } catch (err) {
            return this.handlingError(err as Error);
        }
    }
}
