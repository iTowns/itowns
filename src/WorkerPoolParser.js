import GeoJsonParser from 'Parser/GeoJsonParser';
import KmlParser from 'Parser/KMLParser';
import newConstructors from 'workers/constructors';

import { DOMParser } from 'xmldom';
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
    return KmlParser.parse(data, desia(options), DOMParser)
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
});
