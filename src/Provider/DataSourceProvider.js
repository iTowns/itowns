function isValidData(data, extentDestination, validFn) {
    if (data && (!validFn || validFn(data, extentDestination))) {
        return data;
    }
}

const error = (err, source) => {
    source.handlingError(err);
    throw err;
};

export function parseSourceData(data, layer) {
    const source = layer.source;

    const options = {
        buildExtent: source.isFileSource || !layer.isGeometryLayer,
        crsIn: source.projection,
        crsOut: layer.projection,
        filteringExtent: !source.isFileSource && layer.isGeometryLayer,
        overrideAltitudeInToZero: layer.overrideAltitudeInToZero,
        filter: layer.filter || source.filter,
        isInverted: source.isInverted,
        mergeFeatures: layer.mergeFeatures === undefined ? true : layer.mergeFeatures,
        withNormal: layer.isGeometryLayer !== undefined,
        withAltitude: layer.isGeometryLayer !== undefined,
        layers: source.layers,
        styles: source.styles,
        style: layer.style,
    };

    return source.parser(data, options).then(parsedFile => source.onParsedFile(parsedFile));
}

function fetchSourceData(extSrc, layer) {
    const source = layer.source;
    // If source, we must fetch and convert data
    // URL of the resource you want to fetch
    const url = source.urlFromExtent(extSrc);

    // Fetch data
    return source.fetcher(url, source.networkOptions).then((f) => {
        f.extent = extSrc;
        return f;
    });
}

export default {
    executeCommand(command) {
        const promises = [];
        const layer = command.layer;
        const source = layer.source;
        const extentsSource = command.extentsSource;
        const extentsDestination = command.extentsDestination || extentsSource;
        const parsedData = command.parsedData || [];

        for (let i = 0, max = extentsSource.length; i < max; i++) {
            const extSource = extentsSource[i];
            const extDest = extentsDestination[i];

            // Tag to Cache data
            const tag = source.requestToKey(source.isVectorSource ? extDest : extSource);

            let convertedSourceData = layer.cache.getByArray(tag);

            // If data isn't in cache
            if (!convertedSourceData) {
                // Already fetched and parsed data that can be used
                const validedParsedData = isValidData(parsedData[i], extDest, layer.isValidData) || source.parsedData;
                if (validedParsedData) {
                    // Convert
                    convertedSourceData = layer.convert(validedParsedData, extDest, layer);
                } else {
                    // Fetch, parse and convert
                    convertedSourceData = fetchSourceData(extSource, layer)
                        .then(fetchedData => parseSourceData(fetchedData, layer), err => error(err, source))
                        .then(parsedData => layer.convert(parsedData, extDest, layer), err => error(err, source));
                }
                // Put converted data in cache
                layer.cache.setByArray(convertedSourceData, tag);
            }

            // Verify some command is resolved
            // See old WFSProvider : command.resolve(result)
            promises.push(convertedSourceData);
        }

        return Promise.all(promises);
    },
};
