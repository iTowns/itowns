import workerpool from 'workerpool';
import itownsConstructors from 'workers/constructors';
import { Sia, DeSia } from '../../Sia/Sia';
import { FeatureCollection } from '../Core/Feature';

const supportedParsers = new Map([
    ['geojson', 'geojson'],
    ['application/json', 'geojson'],
    ['application/geo+json', 'geojson'],
    ['application/kml', 'kml'],
    ['application/vnd.google-earth.kml+xml', 'kml'],
    // ['text/plain', KMLParser.parse],
    ['application/gpx', 'gpx'],
    ['application/x-protobuf;type=mapbox-vector', 'vectorTile'],
    // ['application/gtx', GTXParser.parse],
    // ['application/isg', ISGParser.parse],
    // ['application/gdf', GDFParser.parse],
]);

const pool = workerpool.pool('../../dist/worker.js', {
    workerType: 'web',
});

// function typedarrayToBuffer(arr) {
//     return ArrayBuffer.isView(arr)
//     // To avoid a copy, use the typed array's underlying ArrayBuffer to back
//     // new Buffer, respecting the "view", i.e. byteOffset and byteLength
//         ? Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
//     // Pass through all other types to `Buffer.from`
//         : Buffer.from(arr);
// }

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
                    layers: options.in.layers, // VectorTile
                    isInverted: options.in.isInverted, // VectorTile
                    styles: options.in.styles, // VectorTile
                },
                out: {
                    ...(options.out.filter !== undefined && { filter: options.out.filter }),
                    ...(options.out.accurate !== undefined && { accurate: options.out.accurate }),
                    source: {
                        crs: options.out.source.crs,
                    },
                    crs: options.out.crs,
                    mergeFeatures: options.out.mergeFeatures,
                    ...(options.out.structure !== undefined && { structure: options.out.structure }),
                    ...(options.out.filterExtent !== undefined && { filterExtent: options.out.filterExtent }),
                    buildExtent: options.out.buildExtent,
                    ...(options.out.forcedExtentCrs !== undefined && { forcedExtentCrs: options.out.forcedExtentCrs }),
                },
            };
            if (data.extent) {
                _options.extent = {
                    crs: data.extent.crs,
                    zoom: data.extent.zoom,
                    row: data.extent.row,
                    col: data.extent.col,
                };
            }
            const parser = supportedParsers.get(format);
            // console.log('***WorkerParse:*** ', parser);
            const siaOptions = new Sia();
            // pool.exec(parser, [siaData.serialize(data), siaOptions.serialize(_options)])
            pool.exec(parser, [data, siaOptions.serialize(_options)])
                .then((result) => {
                    const deSia = new DeSia({ constructors: itownsConstructors });

                    const resDeBuf = deSia.deserialize(result);

                    const featureCollection = new FeatureCollection(options.out);
                    // featureCollection.style.copy(options.out.style);
                    featureCollection.style = options.out.style;

                    featureCollection.position.copy(resDeBuf.position);
                    featureCollection.quaternion.copy(resDeBuf.quaternion);
                    featureCollection.features = resDeBuf.features;

                    featureCollection.isInverted = options.in.isInverted;
                    if (resDeBuf.scale) {
                        featureCollection.scale.copy(resDeBuf.scale);
                    }
                    featureCollection.features.forEach((feature) => {
                        if (feature.hasExtraStyle) {
                            feature.style = options.in.styles[feature.hasExtraStyle];
                            feature.style.isExtraStyle = true;
                        }
                    });

                    if (options.out.style && options.out.style.fill && options.out.style.fill.base_altitude) {
                        featureCollection.features.forEach((feature) => {
                            feature.style.fill.base_altitude = options.out.style.fill.base_altitude;
                            feature.geometries.forEach((geom) => {
                                const altitude = geom.baseAltitude(feature);
                                geom.verticePos.forEach((vertice) => {
                                    feature.vertices[vertice + 2] = altitude;
                                });

                                geom.altitude.min = Math.min(geom.altitude.min, altitude);
                                geom.altitude.max = Math.max(geom.altitude.max, altitude);
                                // feature.updateExtent(geom);
                            });
                        });
                    }

                    featureCollection.updateMatrix();
                    featureCollection.updateMatrixWorld();
                    featureCollection.extent.copy(resDeBuf.extent);
                    // console.log(pool.stats());
                    resolve(featureCollection);
                })
                .catch((err) => {
                    console.log('***ERROR in worker***\n', err);
                });
        });
    },
};
