// Create enums for different types of workers
export const WORKER_TYPE = {
    DECODER_WORKER_BROTLI: 'DECODER_WORKER_BROTLI',
    DECODER_WORKER: 'DECODER_WORKER',
};

const workers = {};

function createWorker(type) {
    if (type === WORKER_TYPE.DECODER_WORKER_BROTLI) {
        return new Worker(
            /* webpackChunkName: "potree2-brotli-decoder.worker" */ new URL('./potree2-brotli-decoder.worker.js', import.meta.url),
            { type: 'module' },
        );
    } else if (type === WORKER_TYPE.DECODER_WORKER) {
        return new Worker(
            /* webpackChunkName: "potree2-decoder.worker" */ new URL('./potree2-decoder.worker.js', import.meta.url),
            { type: 'module' },
        );
    } else {
        throw new Error('Unknown worker type');
    }
}

export function getWorker(type) {
    if (!workers[type]) {
        workers[type] = [];
    }

    if (workers[type].length === 0) {
        const worker = createWorker(type);
        workers[type].push(worker);
    }

    const worker = workers[type].pop();
    return worker;
}

export function returnWorker(type, worker) {
    workers[type].push(worker);
}
