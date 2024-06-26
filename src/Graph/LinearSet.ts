export default class LinearSet<T> {
    private content: T[];
    private comparison: (a: T, b: T) => boolean;

    public constructor(init?: Iterable<T>, comparison?: (a: T, b: T) => boolean) {
        this.content = init != undefined ? Array.from(init) : [];
        this.comparison = comparison ?? ((a, b) => a == b);
    }

    public get size(): number {
        return this.content.length;
    }

    public add(value: T): void {
        if (this.content.find(v => this.comparison(v, value)) == undefined) {
            this.content.push(value);
        }
    }

    public has(value: T): boolean {
        return this.get(value) != undefined;
    }

    public get(value: T): T | undefined {
        return this.content.find(v => this.comparison(v, value));
    }

    public delete(value: T): void {
        this.content = this.content.filter(v => !this.comparison(v, value));
    }

    public clear(): void {
        this.content = [];
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    public values(): IterableIterator<T> {
        return this.content[Symbol.iterator]();
    }
}
