import { Source } from './Source';
import { DataGenerator } from './Loader/Loader';

export class ProceduralSource<Key, Data> implements Source<Key, Data> {
    public readonly isSource = true as const;
    public readonly isProceduralSource = true as const;

    public constructor(private generator: DataGenerator<Key, Data>) { /* empty */ }

    public load(key: Key): Data {
        return this.generator.generate(key);
    }
}
