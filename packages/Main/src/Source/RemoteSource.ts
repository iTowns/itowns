import { CRS } from '@itowns/geographic';
import { Loader } from 'three';
import { Source } from './Source';

export interface RemoteSourceOptions<Data> {
    loader: Loader<Data>,

    crs: CRS.ProjectionLike;
    url: string;
    format: string;
    networkOptions: RequestInit;
}

export abstract class RemoteSource<Key, Data> implements Source<Key, Promise<Data>> {
    public readonly isSource = true as const;
    public readonly isRemoteSource = true as const;

    protected loader: Loader<Data>;

    public url: string;
    public readonly crs: CRS.ProjectionLike;
    public readonly format: string;
    public networkOptions: RequestInit;

    public constructor(options: RemoteSourceOptions<Data>) {
        this.loader = options.loader;
        this.url = options.url;
        this.crs = options.crs;
        this.format = options.format;
        this.networkOptions = options.networkOptions;
    }

    public abstract load(key: Key): Promise<Data>;
}

