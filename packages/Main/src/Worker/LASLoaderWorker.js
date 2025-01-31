import { expose, Transfer } from 'threads/worker';
import LASLoader from 'Loader/LASLoader';

const loader = new LASLoader();

function transferable(attributes) {
    return Object.values(attributes)
        .filter(ArrayBuffer.isView)
        .map(a => a.buffer);
}

expose({
    lazPerf(path) {
        loader.lazPerf = path;
    },

    async parseChunk(data, options) {
        const result = await loader.parseChunk(data, options);
        return Transfer(result, transferable(result.attributes));
    },

    async parseFile(data, options) {
        const result = await loader.parseFile(data, options);
        return Transfer(result, transferable(result.attributes));
    },
});
