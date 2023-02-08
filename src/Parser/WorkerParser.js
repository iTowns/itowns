import workerpool from 'workerpool';
// import GeoJsonParser from 'Parser/GeoJsonParser';
import { Vector3, Quaternion } from 'three';
// import serialize from 'serialize-javascript';
// import { sia, DeSia, constructors } from 'sializer';
import { sia, DeSia, constructors } from '../../Sia/Sia';
// import { builtins } from 'sializer';
import { FeatureCollection } from '../Core/Feature';
import Style from '../Core/Style';
import Extent from '../Core/Geographic/Extent';

const { Buffer } = require('buffer/');

const pool = workerpool.pool('../../dist/worker.js');

const newConstructors = [
    ...constructors,
    {
        constructor: Extent, // The custom class you want to support
        code: 2, // A unique positive code point for this class, the smaller the better
        args: item => [item.crs, item.west, item.east, item.south, item.north], // A function to serialize the instances of the class
        build(crs, west, east, south, north) { // A function for restoring instances of the class
            return new Extent(crs, west, east, south, north);
        },
    },
    {
        constructor: Vector3, // The custom class you want to support
        code: 3, // A unique positive code point for this class, the smaller the better
        args: item => [item.x, item.y, item.z], // A function to serialize the instances of the class
        build(x, y, z) { // A function for restoring instances of the class
            return new Vector3(x, y, z);
        },
    },
    {
        constructor: Quaternion, // The custom class you want to support
        code: 4, // A unique positive code point for this class, the smaller the better
        args: item => [item.x, item.y, item.z, item.w], // A function to serialize the instances of the class
        build(x, y, z, w) { // A function for restoring instances of the class
            return new Quaternion(x, y, z, w);
        },
    },
];

function typedarrayToBuffer(arr) {
    return ArrayBuffer.isView(arr)
    // To avoid a copy, use the typed array's underlying ArrayBuffer to back
    // new Buffer, respecting the "view", i.e. byteOffset and byteLength
        ? Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
    // Pass through all other types to `Buffer.from`
        : Buffer.from(arr);
}

// function deserialize(serializedJavascript) {
//     // eslint-disable-next-line no-eval
//     return eval(`(${serializedJavascript})`);
// }

// function deleteFunctions(obj, keys) {
//     var functionKeys = [];
//     for (var key in obj) {
//         if (keys.includes(key) && typeof obj[key] === 'function') {
//             functionKeys.push(key);
//         }
//     }
//     for (var i = 0; i < functionKeys.length; i++) {
//         delete obj[functionKeys[i]];
//     }
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
        // if (window.Worker) {
        //     const myWorker = new Worker('../src/Worker4Parsing.js');
        //     // console.log(data);
        //     myWorker.postMessage(['data', 'options']);
        //     console.log('Message posted to worker');

        //     return new Promise((resolve) => {
        //         myWorker.onmessage = function tmp() {
        //             console.log('Message received from worker');
        //             resolve(GeoJsonParser.parse(data, options));
        //         };
        //     });
        // } else {
        //     console.log("Your browser doesn't support web workers.");
        // }

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
                    // style: options.out.style,
                    buildExtent: options.out.buildExtent,
                    forcedExtentCrs: options.out.forcedExtentCrs,
                },
            };

            // GeoJsonParser.parse(data, _options).then((res) => {
            //     console.log('------parse--------');
            //     console.log(res.features[0]);
            //     console.log(res.features[0].geometries);
            //     // const dataToSend = {};
            //     // ['extent', 'position', 'quaternion']
            //     //     .forEach((key) => {
            //     //         dataToSend[key] = res[key];
            //     //     });
            //     // dataToSend.features = [];
            //     // res.features.forEach((feature) => {
            //     //     const featureGeometry = [];
            //     //     feature.geometries.forEach((geometry) => {
            //     //         featureGeometry.push({
            //     //             extent: geometry.extent,
            //     //             indices: geometry.indices,
            //     //             properties: geometry.properties,
            //     //             size: geometry.size,
            //     //         });
            //     //     });

            //     //     dataToSend.features.push(
            //     //         {
            //     //             altitude: feature.altitude,
            //     //             crs: feature.crs,
            //     //             extent: feature.extent,
            //     //             geometries: featureGeometry,
            //     //             size: feature.size,
            //     //             type: feature.type,
            //     //             useCrsOut: feature.useCrsOut,
            //     //             vertices: feature.vertices,
            //     //             _pos: feature._pos,
            //     //         },
            //     //     );
            //     // });

            //     // console.log('___________________');
            //     // console.log(dataToSend);
            //     // const sia2 = new Sia({ constructors: newConstructors });
            //     // const resBuf = sia2.serialize(dataToSend);
            //     // pool.exec('read', [resBuf])
            //     //     .then((result) => {
            //     //         console.log('________result READ_____');
            //     //         const deSia2 = new DeSia({ constructors: newConstructors });
            //     //         const dataBuffed = typedarrayToBuffer(result);
            //     //         const resDeBuf = deSia2.deserialize(dataBuffed);
            //     //         console.log(resDeBuf);
            //     //         console.log('________READ--------');
            //     //         const featureCollection = new FeatureCollection(options.out);
            //     //         featureCollection.style.copy(options.out.style);
            //     //         featureCollection.position.copy(resDeBuf.position);
            //     //         featureCollection.quaternion.copy(resDeBuf.quaternion);
            //     //         featureCollection.features = resDeBuf.features;
            //     //         featureCollection.features.forEach((feature) => {
            //     //             feature.style = new Style(feature.style);
            //     //         });
            //     //         featureCollection.updateMatrix();
            //     //         featureCollection.updateMatrixWorld();
            //     //         featureCollection.extent.copy(resDeBuf.extent);
            //     //         // resolve(featureCollection);
            //     //         console.log('############READ###############');
            //     //     })
            //     //     .catch((err) => {
            //     //         console.error(err);
            //     //     })
            //     //     .then(() => {
            //     //         pool.terminate(); // terminate all workers when done
            //     //     });
            //     console.log('---------------');
            // });

            pool.exec('parse', [data, sia(_options)])
                .then((result) => {
                    const deSia2 = new DeSia({ constructors: newConstructors });
                    const dataBuffed = typedarrayToBuffer(result);
                    const resDeBuf = deSia2.deserialize(dataBuffed);

                    const featureCollection = new FeatureCollection(options.out);
                    featureCollection.style.copy(options.out.style);
                    featureCollection.position.copy(resDeBuf.position);
                    featureCollection.quaternion.copy(resDeBuf.quaternion);
                    featureCollection.features = resDeBuf.features;
                    featureCollection.features.forEach((feature) => {
                        feature.style = new Style(feature.style);
                    });
                    featureCollection.updateMatrix();
                    featureCollection.updateMatrixWorld();
                    featureCollection.extent.copy(resDeBuf.extent);
                    resolve(featureCollection);
                });

            // pool.exec('parseSansSia', [data, serialize(_options)])
            //     .then((result) => {
            //         const res = deserialize(result);

            //         const featureCollection = new FeatureCollection(options.out);
            //         featureCollection.style.copy(options.out.style);
            //         featureCollection.position.copy(res.position);
            //         // featureCollection.quaternion.copy(res.quaternion);
            //         featureCollection.quaternion._x = res.quaternion._x;
            //         featureCollection.quaternion._y = res.quaternion._y;
            //         featureCollection.quaternion._z = res.quaternion._z;
            //         featureCollection.quaternion._w = res.quaternion._w;
            //         console.log(res.features);
            //         featureCollection.features = res.features;
            //         featureCollection.features.forEach((feature) => {
            //             feature.style = new Style(feature.style);
            //         });
            //         featureCollection.updateMatrix();
            //         featureCollection.updateMatrixWorld();
            //         featureCollection.extent.copy(res.extent);
            //         console.log(featureCollection);
            //         // resolve(featureCollection);
            //     })
            //     .catch((err) => {
            //         console.error(err);
            //     })
            //     .then(() => {
            //         pool.terminate(); // terminate all workers when done
            //     });
        });
    },
};
