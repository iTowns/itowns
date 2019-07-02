import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';

class C3DTilesSource extends Source {
    constructor(source) {
        super(source);
        this.baseUrl = this.url.slice(0, this.url.lastIndexOf('/') + 1);
        this.whenReady = Fetcher.json(this.url, this.networkOptions);
    }
}

export default C3DTilesSource;
