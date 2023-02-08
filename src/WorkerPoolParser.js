// import serialize from 'serialize-javascript';
// import { Buffer } from 'buffer/';
import { Vector3, Quaternion } from 'three';

import GeoJsonParser from './Parser/GeoJsonParser';
import { desia, Sia, constructors } from '../Sia/Sia';
import Extent from './Core/Geographic/Extent';

// const { desia, Sia, DeSia } = require('sializer');
// const { constructors: builtins } = require('sializer');
const workerpool = require('workerpool');

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
        constructor: Vector3,
        code: 3,
        args: item => [item.x, item.y, item.z],
        build(x, y, z) {
            return new Vector3(x, y, z);
        },
    },
    {
        constructor: Quaternion,
        code: 4,
        args: item => [item.x, item.y, item.z, item.w],
        build(x, y, z, w) {
            return new Quaternion(x, y, z, w);
        },
    },
    // {
    //     constructor: FeatureCollection,
    //     code: 5,
    //     args: item => [item.option],
    //     build(option) {
    //         return new FeatureCollection(option);
    //     },
    // },
    // {
    //     constructor: Feature,
    //     code: 6,
    //     args: item => [item.type, item.collection],
    //     build(type, collection) {
    //         return new Feature(type, collection);
    //     },
    // },

];

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


// function deserialize(serializedJavascript) {
//     // eslint-disable-next-line no-eval
//     return eval(`(${serializedJavascript})`);
// }

// function typedarrayToBuffer(arr) {
//     return ArrayBuffer.isView(arr)
//     // To avoid a copy, use the typed array's underlying ArrayBuffer to back
//     // new Buffer, respecting the "view", i.e. byteOffset and byteLength
//         ? Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
//     // Pass through all other types to `Buffer.from`
//         : Buffer.from(arr);
// }

function parse(data, options) {
    // console.log('______');
    return GeoJsonParser.parse(data, desia(options))
        .then((parsedData) => {
            const dataToSend = {};
            ['extent', 'position', 'quaternion']
                .forEach((key) => {
                    dataToSend[key] = parsedData[key];
                });
            dataToSend.features = [];
            parsedData.features.forEach((feature) => {
                const featureGeometry = [];
                feature.geometries.forEach((geometry) => {
                    featureGeometry.push({
                        extent: geometry.extent,
                        indices: geometry.indices,
                        properties: geometry.properties,
                        size: geometry.size,
                    });
                });

                dataToSend.features.push(
                    {
                        altitude: feature.altitude,
                        crs: feature.crs,
                        extent: feature.extent,
                        geometries: featureGeometry,
                        size: feature.size,
                        type: feature.type,
                        useCrsOut: feature.useCrsOut,
                        vertices: feature.vertices,
                        _pos: feature._pos,
                    },
                );
            });

            // console.log('___________________');
            // console.log(dataToSend);
            const sia2 = new Sia({ constructors: newConstructors });
            return sia2.serialize(dataToSend);
        })
        .catch((err) => {
            // console.log(err);
            throw err;
        });
}

// function parseSansSia(data, options) {
//     console.log('______');
//     return GeoJsonParser.parse(data, deserialize(options))
//         .then((parsedData) => {
//             const dataToSend = {};
//             parsedData.features.forEach((feature) => {
//                 deleteFunctions(feature, ['transformToLocalSystem', '_pushValues']);
//             });
//             ['extent', 'features', 'position', 'quaternion']
//                 .forEach((key) => {
//                     dataToSend[key] = parsedData[key];
//                 });
//             dataToSend.features.forEach((feature) => {
//                 delete feature.style;
//             });
//             return serialize(dataToSend, { isJSON: true, ignoreFunction: true });
//         })
//         .catch((err) => {
//             console.log(err);
//         });
// }

// function read(data) {
//     // console.log(data);
//     console.log('_____________worker READ_____');
//     console.log(data);
//     const dataBuffed = typedarrayToBuffer(data);
//     // console.log('toStg', data.toString(), 'toSTGEND');
//     // console.log('length', data.byteLength);
//     const deSia2 = new DeSia({ constructors: newConstructors });
//     const resBuf = deSia2.deserialize(dataBuffed);
//     console.log(resBuf);
//     console.log('________worker_____');
//     // console.log(data.properties);
//     return data;
// }

// create a worker and register public functions
workerpool.worker({
    parse,
    // parseSansSia,
    // read,
});
