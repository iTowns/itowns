// Create enums for different types of workers
export const workerType = {
    DECODER_WORKER_BROTLI: 'DECODER_WORKER_BROTLI',
    DECODER_WORKER: 'DECODER_WORKER',
};

export default class WorkerPool {
    constructor() {
        this.workers = {};
    }

    createWorker(type) {
        if (type === workerType.DECODER_WORKER_BROTLI) {
            return new Worker(
                new URL('../Worker/potree2.0/brotli-decoder.worker.js', import.meta.url),
                { type: 'module' },
            );
        } else if (type === workerType.DECODER_WORKER) {
            return new Worker(
                new URL('../Worker/potree2.0/decoder.worker.js', import.meta.url),
                { type: 'module' },
            );
        } else {
            throw new Error('Unknown worker type');
        }
    }

    getWorker(type) {
        if (!this.workers[type]) {
            this.workers[type] = [];
        }

        if (this.workers[type].length === 0) {
            const worker = this.createWorker(type);
            this.workers[type].push(worker);
        }

        const worker = this.workers[type].pop();

        return worker;
    }

    returnWorker(type, worker) {
        this.workers[type].push(worker);
    }
}
