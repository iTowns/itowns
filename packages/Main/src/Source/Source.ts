import { SourceCapabilities } from './SourceCapabilities';

export interface Source<Key, Data> {
    readonly isSource: true;
    capabilities: SourceCapabilities,

    load(key: Key): Data;
}
