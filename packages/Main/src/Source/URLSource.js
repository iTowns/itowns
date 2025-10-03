import Source from './Source';

class URLSource extends Source {
    constructor(source) {
        super(source);

        if (!source.url) {
            throw new Error('[URLSource]: url is required');
        }

        if (!source.fetcher) {
            throw new Error('[URLSource]: fetcher is required');
        }

        if (!source.parser) {
            throw new Error('[URLSource]: parser is required');
        }

        this.url = source.url;
        this.fetcher = source.fetcher;
        this.parser = source.parser;
        this.networkOptions = source.networkOptions || { crossOrigin: 'anonymous' };
    }

    loadData(extent, out) {
        return this.fetcher(this.urlFromExtent(extent), this.networkOptions)
            .then(file => this.parser(file, { out, in: this, extent }))
            .catch(err => this.handlingError(err));
    }
}

export default URLSource;
