export interface Source<Key, Data> {
    readonly isSource: true;

    load(key: Key): Data;
}

export interface AsyncSource<Key, Data> extends Source<Key, Promise<Data>> {
    readonly isAsyncSource: true;
}

export interface Loader<Data> {
    readonly isLoader: true;

    getData(uri: string): Data;
}

export interface DataGenerator<Key, Data> {
    readonly isDataGenerator: true;

    generate(key: Key): Data;
}
