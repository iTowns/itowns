export interface DataGenerator<Key, Data> {
    readonly isDataGenerator: true;

    generate(key: Key): Data;
}

