import type Layer from 'Layer/Layer';

export interface Source<Key, Data> {
    readonly isSource: true;

    load(key: Key): Data;
}

export interface AnySource<Key, Data> extends Source<Key, Data>, LayerEventHandler { }

export interface LayerEventHandler {
    onLayerAdded(layer: Layer): void;
    onLayerRemoved(layer: Layer): void;
}
