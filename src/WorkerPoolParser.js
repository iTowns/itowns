import GeoJsonParser from 'Parser/GeoJsonParser';
import KmlParser from 'Parser/KMLParser';
import GpxParser from 'Parser/GpxParser';

import newConstructors from 'workers/constructors';
import { desia, Sia } from '../Sia/Sia';

const workerpool = require('workerpool');

function geojson(data, options) {
    return GeoJsonParser.parse(data, desia(options))
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
    return KmlParser.parse(data, desia(options))
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
    return GpxParser.parse(data, desia(options))
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

workerpool.worker({
    geojson,
    kml,
    gpx,
});
