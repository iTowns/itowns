import CancelledCommandException from 'Core/Scheduler/CancelledCommandException';

export default {
    executeCommand(command) {
        const promises = [];
        const layer = command.layer;
        const requester = command.requester;
        const extentsSource = command.extentsSource;

        if (requester &&
            !requester.material) {
            return Promise.reject(new CancelledCommandException(command));
        }

        for (const extent of extentsSource) {
            promises.push(layer.convert(requester, extent));
        }

        return Promise.all(promises);
    },
};
