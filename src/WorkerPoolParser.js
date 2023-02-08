import GeoJsonParser from 'Parser/GeoJsonParser';
import newConstructors from 'workers/constructors';

import { desia, Sia } from '../Sia/Sia';

const workerpool = require('workerpool');

function parse(data, options) {
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

workerpool.worker({ parse });
