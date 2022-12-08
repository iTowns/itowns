import workerpool from 'workerpool';
import itownsConstructors from 'workers/constructors';
// import GeoJsonParser from 'Parser/GeoJsonParser';
import { sia, DeSia } from 'sializer';
import { FeatureCollection } from '../Core/Feature';
// import Style from '../Core/Style';

const supportedParsers = new Map([
    ['geojson', 'geojson'],
    ['application/json', 'geojson'],
    ['application/geo+json', 'geojson'],
    ['application/kml', 'kml'],
    ['application/vnd.google-earth.kml+xml', 'kml'],
    // ['text/plain', KMLParser.parse],
    // ['application/gpx', GpxParser.parse],
    // ['application/x-protobuf;type=mapbox-vector', VectorTileParser.parse],
    // ['application/gtx', GTXParser.parse],
    // ['application/isg', ISGParser.parse],
    // ['application/gdf', GDFParser.parse],
]);

const { Buffer } = require('buffer/');

const pool = workerpool.pool('../../dist/worker.js');

function typedarrayToBuffer(arr) {
    return ArrayBuffer.isView(arr)
    // To avoid a copy, use the typed array's underlying ArrayBuffer to back
    // new Buffer, respecting the "view", i.e. byteOffset and byteLength
        ? Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
    // Pass through all other types to `Buffer.from`
        : Buffer.from(arr);
}

export default {
    /**
     * Parse a GeoJSON file content and return a [FeatureCollection]{@link FeatureCollection}.
     *
     * @param {string} data - The GeoJSON file content to parse.
     * @param {ParsingOptions} options - Options controlling the parsing.

     * @return {Promise} A promise resolving with a [FeatureCollection]{@link FeatureCollection}.
     */
    parse(data, options = {}) {
        const format = options.in.format;
        return new Promise((resolve) => {
            const _options = {
                in: {
                    crs: options.in.crs,
                },
                out: {
                    ...(options.out.filter !== undefined && { filter: options.out.filter }),
                    accurate: options.out.accurate,
                    source: {
                        crs: options.out.source.crs,
                    },
                    crs: options.out.crs,
                    mergeFeatures: options.out.mergeFeatures,
                    structure: options.out.structure,
                    filterExtent: options.out.filterExtent,
                    buildExtent: options.out.buildExtent,
                    forcedExtentCrs: options.out.forcedExtentCrs,
                },
            };
            const parser = supportedParsers.get(format);
            pool.exec(parser, [data, sia(_options)])
                .then((result) => {
                    const deSia2 = new DeSia({ constructors: itownsConstructors });
                    const dataBuffed = typedarrayToBuffer(result);
                    const resDeBuf = deSia2.deserialize(dataBuffed);

                    const featureCollection = new FeatureCollection(options.out);
                    // featureCollection.style.copy(options.out.style);
                    featureCollection.style = options.out.style;
                    featureCollection.position.copy(resDeBuf.position);
                    featureCollection.quaternion.copy(resDeBuf.quaternion);
                    featureCollection.features = resDeBuf.features;
                    // featureCollection.features.forEach((feature) => {
                    //     feature.style = new Style({}, featureCollection.style);
                    // });
                    featureCollection.updateMatrix();
                    featureCollection.updateMatrixWorld();
                    featureCollection.extent.copy(resDeBuf.extent);
                    resolve(featureCollection);
                })
                .catch((err) => {
                    console.log('***ERROR in worker***\n', err);
                });
        });
    },
};
