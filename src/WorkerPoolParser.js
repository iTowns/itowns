import GeoJsonParser from 'Parser/GeoJsonParser';
import KmlParser from 'Parser/KMLParser';
import GpxParser from 'Parser/GpxParser';
import ShapefileParser from 'Parser/ShapefileParser';
import VectorTileParser from 'Parser/VectorTileParser';

import newConstructors from 'workers/constructors';
import { Sia, DeSia } from '../Sia/Sia';

const workerpool = require('workerpool');

const desiaOptions = new DeSia();

function geojson(data, options) {
    return GeoJsonParser.parse(data, desiaOptions.deserialize(options))
        .then((parsedData) => {
            const dataToSend = {};
            ['extent', 'position', 'quaternion', 'features']
                .forEach((key) => {
                    dataToSend[key] = parsedData[key];
                });
            const sia = new Sia({ constructors: newConstructors });
            return sia.serialize(dataToSend);
        })
        .catch((err) => {
            throw err;
        });
}

function kml(data, options) {
    return KmlParser.parse(data, desiaOptions.deserialize(options))
        .then((parsedData) => {
            const dataToSend = {};
            ['extent', 'position', 'quaternion', 'features']
                .forEach((key) => {
                    dataToSend[key] = parsedData[key];
                });
            const sia = new Sia({ constructors: newConstructors });
            return sia.serialize(dataToSend);
        })
        .catch((err) => {
            throw err;
        });
}

function gpx(data, options) {
    return GpxParser.parse(data, desiaOptions.deserialize(options))
        .then((parsedData) => {
            const dataToSend = {};
            ['extent', 'position', 'quaternion', 'features']
                .forEach((key) => {
                    dataToSend[key] = parsedData[key];
                });
            const sia = new Sia({ constructors: newConstructors });
            return sia.serialize(dataToSend);
        })
        .catch((err) => {
            throw err;
        });
}

function shp(data, options) {
    return ShapefileParser.parse(data, desiaOptions.deserialize(options))
        .then((parsedData) => {
            const dataToSend = {};
            ['extent', 'position', 'quaternion', 'features']
                .forEach((key) => {
                    dataToSend[key] = parsedData[key];
                });
            const sia = new Sia({ constructors: newConstructors });
            return sia.serialize(dataToSend);
        })
        .catch((err) => {
            throw err;
        });
}

function vectorTile(data, options) {
    return VectorTileParser.parse(data, desiaOptions.deserialize(options))
        .then((parsedData) => {
            const dataToSend = {};
            ['extent', 'position', 'quaternion', 'features', 'scale']
                .forEach((key) => {
                    dataToSend[key] = parsedData[key];
                });
            const sia = new Sia({ constructors: newConstructors });
            return sia.serialize(dataToSend);
        })
        .catch((err) => {
            console.log('ERR:', err);
            throw err;
        });
}

workerpool.worker({
    geojson,
    kml,
    gpx,
    shp,
    vectorTile,
});
