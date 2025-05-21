import { CRS } from '@itowns/geographic';
import { Loader } from 'three';
import { Source } from './Source';
import { SourceCapabilities } from './SourceCapabilities';

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

    declare public capabilities: SourceCapabilities;

    protected loader: Loader<Data>;

    public readonly crs: CRS.ProjectionLike;
    public readonly url: string;
    public readonly format: string;
    public networkOptions: RequestInit;

    public constructor(options: RemoteSourceOptions<Data>) {
        this.loader = options.loader;
        this.crs = options.crs;
        this.url = options.url;
        this.format = options.format;
        this.networkOptions = options.networkOptions;
    }

    public abstract load(key: Key): Promise<Data>;
}

