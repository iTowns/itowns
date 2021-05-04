export default {
    executeCommand(command) {
        const layer = command.layer;
        const src = command.extentsSource;
        const dst = command.extentsDestination || src;

        return Promise.all(src.map((from, i) => (layer.getData(from, dst[i]))));
    },
};
