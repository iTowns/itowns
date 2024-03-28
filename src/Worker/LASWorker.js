import LASLoader from 'Parser/LASLoader';
import { expose } from 'threads/worker';

const loader = new LASLoader();

expose({
    set lazPerf(path) {
        loader.lazPerf = path;
    },

    parseFile(data, options) {
        return loader.parseFile(data, options);
    },
});
