/* global itowns */

/**
 * A module to parse OGR Virtual Format files.
 *
 * See the [GDAL documentation](https://gdal.org/drivers/vector/vrt.html) and
 * the [xsd
 * schema](https://github.com/OSGeo/gdal/blob/master/gdal/data/ogrvrt.xsd) of
 * the OGR VRT file.
 *
 * It is highly recommended to use the [Papa Parse](https://www.papaparse.com/)
 * parser to parse the CSV content before feeding it to this parser.
 *
 * @example
 * Fetcher.multi('data', {
 *     xml: ['vrt'],
 *     text: ['csv']
 * }).then(function _(res) {
 *     res.csv = Papa.parse(res.csv.trim()).data;
 *     return CSVnVRTParser.parse(res, { out: {
 *              crs: 'EPSG:4326'
 *          }
 *     });
 * }).then(function _(features) {
 *     var source = new itowns.FileSource({ features });
 *     var layer = new itowns.ColorLayer('CSVnVRT', { source });
 *     view.addLayer(layer);
 * });
 *
 * @module CSVnVRTParser
 */
const CSVnVRTParser = (function _() {
    const coord = new itowns.Coordinates('EPSG:4326');
    let header;

    function xml2json(xml, json) {
        const res = {};

        const attributes = xml.getAttributeNames();
        if (attributes.length > 0) {
            res['@attributes'] = {};
            for (let i = 0; i < attributes.length; i++) {
                res['@attributes'][attributes[i]] = xml.getAttributeNode(attributes[i]).value;
            }
        }

        if (xml.childElementCount > 0) {
            for (let j = 0; j < xml.childElementCount; j++) {
                xml2json(xml.children[j], res);
            }
        } else if (xml.textContent) {
            res.value = xml.textContent;
        }

        const name = xml.nodeName;

        if (!json[name]) {
            json[name] = res;
        } else if (json[name].length > 0) {
            json[name].push(res);
        } else {
            json[name] = [res];
        }

        return json;
    }

    function getGeometryType(type) {
        switch (type) {
            case 'wkbPoint':
            case 'wkbMultiPoint':
                return itowns.FEATURE_TYPES.POINT;
            case 'wkbLineString':
            case 'wkbMultiLineString':
                return itowns.FEATURE_TYPES.LINE;
            case 'wkbPolygon':
            case 'wkbMultiPolygon':
                return itowns.FEATURE_TYPES.POLYGON;
            default:
                throw new Error('This type of GeometryType is not supported yet: ' + type);
        }
    }

    function OGRVRTLayer2Feature(layer, data, crs, options) {
        const collection = new itowns.FeatureCollection(options.out);

        const _crs = (layer.LayerSRS && layer.LayerSRS.value) || crs;

        let type = itowns.FEATURE_TYPES.POINT;
        if (layer.GeometryType) {
            type = getGeometryType(layer.GeometryType.value);
        }

        const feature = collection.requestFeatureByType(type);

        if (layer.Field) {
            if (!layer.Field.length) {
                layer.Field = [layer.Field];
            }

            for (let f = 0; f < layer.Field.length; f++) {
                layer.Field[f]['@attributes'].pos = header.indexOf(layer.Field[f]['@attributes'].src);
            }
        }

        if (layer.GeometryField) {
            switch (layer.GeometryField['@attributes'].encoding) {
                case 'PointFromColumns': {
                    const x = header.indexOf(layer.GeometryField['@attributes'].x);
                    const y = header.indexOf(layer.GeometryField['@attributes'].y);
                    const z = header.indexOf(layer.GeometryField['@attributes'].z);
                    // const m = header.indexOf(layer.GeometryField['@attributes'].m);

                    for (let i = 0; i < data.length; i++) {
                        const line = data[i];
                        const geometry = feature.bindNewGeometry();

                        if (layer.Field) {
                            for (let p = 0; p < layer.Field.length; p++) {
                                geometry.properties[layer.Field[p]['@attributes'].name] = line[layer.Field[p]['@attributes'].pos];
                            }
                        }

                        geometry.startSubGeometry(1, feature);
                        coord.crs = (layer.GeometryField.SRS && layer.GeometryField.SRS.value) || _crs;
                        coord.setFromValues(Number(line[x]), Number(line[y]), Number(line[z]) || 0);
                        geometry.pushCoordinates(feature, coord);

                        geometry.updateExtent();
                        feature.updateExtent(geometry);
                    }

                    break;
                }
                case undefined:
                    break;
                default:
                    throw new Error('This type of encoding is not supported yet: ' + layer.GeometryField['@attributes'].encoding);
            }
        }

        collection.updateExtent();

        return collection;
    }

    // eslint-disable-next-line no-unused-vars
    function OGRVRTWarpedLayer2Feature(layer, data, options, crs) {
        throw new Error('not supported yet');
    }

    // eslint-disable-next-line no-unused-vars
    function OGRVRTUnionLayer2Feature(layer, data, options, crs) {
        throw new Error('not supported yet');
    }

    function readLayer(layer, data, options, crs) {
        if (layer.OGRVRTLayer) {
            return OGRVRTLayer2Feature(layer.OGRVRTLayer, data, layer.TargetSRS.value, options);
        } else if (layer.OGRVRTWarpedLayer) {
            return OGRVRTWarpedLayer2Feature(layer, data, options, crs);
        } else if (layer.OGRVRTUnionLayer) {
            return OGRVRTUnionLayer2Feature(layer, data, options, crs);
        }
    }

    return {
        /**
         * Parse a CSV associated to a VRT and return a {@link
         * FeatureCollection}.
         *
         * @param {Object} data - The data needed.
         * @param {string} data.csv - Data from the CSV, with values separated
         * by comma, semicolon or tabulation.
         * @param {Document} data.vrt - The OGR VRT file, describing the CSV.
         * @param {geojsonParserOptions} [options]
         *
         * @return {Promise} A promise resolving with a [FeatureCollection]{@link
         * module:GeoJsonParser~FeatureCollection}.
         *
         * @memberof module:CSVnVRTParser
         */
        parse: function _(data, options) {
            if (!data.csv || !data.vrt) {
                throw new Error('Missing files when parsing');
            }
            const schema = xml2json(data.vrt.children[0], {});

            header = data.csv.shift();

            const collection = readLayer(schema.OGRVRTDataSource, data.csv, options);

            return Promise.resolve(collection);
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = CSVnVRTParser;
}
