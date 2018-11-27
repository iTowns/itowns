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

        for (let i = 0, size = extentsSource.length; i < size; i++) {
            promises.push(layer.convert(requester, extentsSource[i]));
        }

        return Promise.all(promises);
    },
};
