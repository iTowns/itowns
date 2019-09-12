import GeoJsonParser from 'Parser/GeoJsonParser';
import VectorTileParser from 'Parser/VectorTileParser';
import Fetcher from 'Provider/Fetcher';
import Cache from 'Core/Scheduler/Cache';

export const supportedFetchers = new Map([
    ['image/x-bil;bits=32', Fetcher.textureFloat],
    ['geojson', Fetcher.json],
    ['application/json', Fetcher.json],
    ['application/x-protobuf;type=mapbox-vector', Fetcher.arrayBuffer],
]);

const supportedParsers = new Map([
    ['geojson', GeoJsonParser.parse],
    ['application/json', GeoJsonParser.parse],
    ['application/x-protobuf;type=mapbox-vector', VectorTileParser.parse],
]);

function isValidData(data, extentDestination, validFn) {
    if (data && (!validFn || validFn(data, extentDestination))) {
        return data;
    }
}

const error = (err, source) => {
    source.handlingError(err);
    throw err;
};

function parseSourceData(data, extDest, layer) {
    const source = layer.source;
    const parser = source.parser || supportedParsers.get(source.format) || (d => Promise.resolve(d));

    const options = {
        buildExtent: source.isFileSource || !layer.isGeometryLayer,
        crsIn: source.projection,
        crsOut: layer.projection,
        // TODO FIXME: error in filtering vector tile
        // filteringExtent: extentDestination.as(layer.projection),
        filteringExtent: !source.isFileSource && layer.isGeometryLayer ? extDest.as(source.projection) : undefined,
        overrideAltitudeInToZero: layer.overrideAltitudeInToZero,
        filter: layer.filter,
        isInverted: source.isInverted,
        mergeFeatures: layer.mergeFeatures === undefined ? true : layer.mergeFeatures,
        withNormal: layer.isGeometryLayer,
        withAltitude: layer.isGeometryLayer,
    };

    return parser(data, options).then(parsedFile => source.onParsedFile(parsedFile));
}

function fetchSourceData(extSrc, layer) {
    const source = layer.source;
    const fetcher = source.fetcher || supportedFetchers.get(source.format) || Fetcher.texture;
    // If source, we must fetch and convert data
    // URL of the resource you want to fetch
    const url = source.urlFromExtent(extSrc);

    // Fetch data
    return fetcher(url, source.networkOptions).then((f) => {
        f.coords = extSrc;
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

            // Tag to Cache data
            const tag = `${source.uid}-${extSource.toString('-')}`;

            // Get converted source data, in cache
            let convertedSourceData = Cache.get(tag);

            // If data isn't in cache
            if (!convertedSourceData) {
                const extDest = extentsDestination[i];

                // Already fetched and parsed data that can be used
                const validedParsedData = isValidData(parsedData[i], extDest, layer.isValidData) || source.parsedData;
                if (validedParsedData) {
                    // Convert
                    convertedSourceData = layer.convert(validedParsedData, extDest, layer);
                } else if (source.fetchedData) {
                    // Parse and convert
                    convertedSourceData = parseSourceData(source.fetchedData, extDest, layer)
                        .then(parsedData => layer.convert(parsedData, extDest, layer), err => error(err, source));
                } else {
                    // Fetch, parse and convert
                    convertedSourceData = fetchSourceData(extSource, layer)
                        .then(fetchedData => parseSourceData(fetchedData, extDest, layer), err => error(err, source))
                        .then(parsedData => layer.convert(parsedData, extDest, layer), err => error(err, source));
                }
                // Put converted data in cache
                Cache.set(tag, convertedSourceData, Cache.POLICIES.TEXTURE);
            }

            // Verify some command is resolved
            // See old WFSProvider : command.resolve(result)
            promises.push(convertedSourceData);
        }

        return Promise.all(promises);
    },
};
