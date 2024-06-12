import { spawn, Pool, Transfer } from 'threads';

function workerInstance() {
    return new Worker(
        /* webpackChunkName: "itowns_lasparser" */
        new URL('../Worker/LASWorker.js', import.meta.url),
        { type: 'module' },
    );
}

class LASWorkerLoader {
    constructor() {
        this._lazPerf = undefined;
        this._pool = undefined;
    }

    get pool() {
        if (this._pool) { return this._pool; }

        const spawnThread = async () => {
            const worker = workerInstance();
            const thread = await spawn(worker);
            if (this._lazPerf) {
                thread.lazPerf(this._lazPerf);
            }
            return thread;
        };

        const pool = Pool(spawnThread, { size: 1 });
        pool.events().subscribe((event) => {
            if (event.type === 'taskQueueDrained') {
                pool.terminate();
                this._pool = undefined;
            }
        });

        this._pool = pool;
        return pool;
    }

    set lazPerf(path) {
        this._lazPerf = path;
    }

    async parseChunk(data, options) {
        return this.pool.queue(w => w.parseChunk(Transfer(data), options));
    }

    async parseFile(data, options) {
        return this.pool.queue(w => w.parseFile(Transfer(data), options));
    }
}

export default LASWorkerLoader;
