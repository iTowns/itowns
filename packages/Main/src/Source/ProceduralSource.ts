import { Source, DataGenerator } from './Source';

export class ProceduralSource<Key, Data> implements Source<Key, Data> {
    public constructor(private generator: DataGenerator<Key, Data>) { /* empty */ }

    public load(key: Key): Data {
        return this.generator.generate(key);
    }
}
