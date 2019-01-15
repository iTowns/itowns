import GeoJsonParser from 'Parser/GeoJsonParser';
import VectorTileParser from 'Parser/VectorTileParser';
import Fetcher from 'Provider/Fetcher';
import Cache from 'Core/Scheduler/Cache';
import CancelledCommandException from 'Core/Scheduler/CancelledCommandException';

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

const error = (err, url, source) => {
    source.handlingError(err, url);
    throw err;
};
function FetchAndConvertSourceData(url, layer, extentSource, extentDestination) {
    const source = layer.source;
    const fetcher = source.fetcher || supportedFetchers.get(source.format) || Fetcher.texture;
    const parser = source.parser || supportedParsers.get(source.format) || (data => data);

    const parsingOptions = {
        buildExtent: !layer.isGeometryLayer,
        crsIn: source.projection,
        crsOut: layer.projection,
        // TODO FIXME: error in filtering vector tile
        // filteringExtent: extentDestination.as(layer.projection),
        filteringExtent: layer.isGeometryLayer ? extentDestination : undefined,
        filter: layer.filter,
        isInverted: source.isInverted,
        mergeFeatures: layer.mergeFeatures === undefined ? true : layer.mergeFeatures,
        withNormal: layer.isGeometryLayer,
        withAltitude: layer.isGeometryLayer,
    };

    // Fetch data
    return fetcher(url, source.networkOptions)
        .then((fetchedData) => {
            fetchedData.coords = extentSource;
            // Parse fetched data, it parses file to itowns's object
            return parser(fetchedData, parsingOptions);
        }, err => error(err, url, source))
        .then(parsedData =>
            // Convert parsed data, it converts itowns's object to THREE's object
            layer.convert(parsedData, extentDestination), err => error(err, url, source));
}

export default {
    executeCommand(command) {
        const promises = [];
        const layer = command.layer;
        const source = layer.source;
        const requester = command.requester;
        const extentsSource = command.extentsSource;
        const extentsDestination = command.extentsDestination || extentsSource;
        const parsedData = command.parsedData || [];

        // TODO: Find best place to cancel Command
        if (requester &&
            !requester.material) {
            // request has been deleted
            return Promise.reject(new CancelledCommandException(command));
        }

        for (let i = 0, max = extentsSource.length; i < max; i++) {
            const extSource = extentsSource[i];
            const extDest = extentsDestination[i];

            // If source, we must fetch and convert data
            // URL of the resource you want to fetch
            const url = source.urlFromExtent(extSource);

            // Already fetched and parsed data that can be used
            const validedParsedData = isValidData(parsedData[i], extDest, layer.isValidData) || source.parsedData;

            // Tag to Cache data
            const tag = validedParsedData ? `${url},${extDest.toString(',')}` : url;

            // Get converted source data, in cache
            let convertedSourceData = Cache.get(tag);

            // If data isn't in cache
            if (!convertedSourceData) {
                if (validedParsedData) {
                    // Use parsed data
                    convertedSourceData = layer.convert(validedParsedData, extDest, layer);
                } else {
                    // Fetch and convert
                    convertedSourceData = FetchAndConvertSourceData(url, layer, extSource, extDest);
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
