import load from 'Loader/Potree2Loader';
import loadBrotli from 'Loader/Potree2BrotliLoader';
import { expose, Transfer } from 'threads/worker';

function transfer(buffer, data) {
    const transferables = [];
    Object.keys(data.attributeBuffers).forEach((property) => {
        transferables.push(data.attributeBuffers[property].buffer);
    });
    transferables.push(buffer);
    return transferables;
}

expose({
    async parse(buffer, options) {
        const data = await load(buffer, options);
        return Transfer(data, transfer(buffer, data));
    },

    async parseBrotli(buffer, options) {
        const data = await loadBrotli(buffer, options);
        return Transfer(data, transfer(buffer, data));
    },
});
