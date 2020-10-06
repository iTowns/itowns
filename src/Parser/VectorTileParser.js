import { Vector2, Vector3 } from 'three';
import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import { globalExtentTMS } from 'Core/Geographic/Extent';
import { FeatureCollection, FEATURE_TYPES } from 'Core/Feature';
import { deprecatedParsingOptionsToNewOne } from 'Core/Deprecated/Undeprecator';

const worldDimension3857 = globalExtentTMS.get('EPSG:3857').dimensions();
const globalExtent = new Vector3(worldDimension3857.x, worldDimension3857.y, 1);
const lastPoint = new Vector2();
const firstPoint = new Vector2();

// Classify option, it allows to classify a full polygon and its holes.
// Each polygon with its holes are in one FeatureGeometry.
// A polygon is determined by its clockwise direction and the holes are in the opposite direction.
// Clockwise direction is determined by Shoelace formula https://en.wikipedia.org/wiki/Shoelace_formula
// Draw polygon with canvas doesn't need to classify however it is necessary for meshs.
function vtFeatureToFeatureGeometry(vtFeature, feature, classify = false) {
    let geometry = feature.bindNewGeometry();
    classify = classify && (feature.type === FEATURE_TYPES.POLYGON);

    geometry.properties = vtFeature.properties;
    const pbf = vtFeature._pbf;
    pbf.pos = vtFeature._geometry;

    const end = pbf.readVarint() + pbf.pos;
    let cmd = 1;
    let length = 0;
    let x = 0;
    let y = 0;
    let count = 0;
    let sum = 0;

    while (pbf.pos < end) {
        if (length <= 0) {
            const cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();

            if (cmd === 1) {
                if (count) {
                    if (classify && sum > 0 && geometry.indices.length > 0) {
                        feature.updateExtent(geometry);
                        geometry = feature.bindNewGeometry();
                        geometry.properties = vtFeature.properties;
                    }
                    geometry.closeSubGeometry(count, feature);
                    geometry.getLastSubGeometry().ccw = sum < 0;
                }
                count = 0;
                sum = 0;
            }
            count++;
            geometry.pushCoordinatesValues(feature, x, y);
            if (count == 1) {
                firstPoint.set(x, y);
                lastPoint.set(x, y);
            } else if (classify && count > 1) {
                sum += (lastPoint.x - x) * (lastPoint.y + y);
                lastPoint.set(x, y);
            }
        } else if (cmd === 7) {
            if (count) {
                count++;
                geometry.pushCoordinatesValues(feature, firstPoint.x, firstPoint.y);
                if (classify) {
                    sum += (lastPoint.x - firstPoint.x) * (lastPoint.y + firstPoint.y);
                }
            }
        } else {
            throw new Error(`unknown command ${cmd}`);
        }
    }

    if (count) {
        if (classify && sum > 0 && geometry.indices.length > 0) {
            feature.updateExtent(geometry);
            geometry = feature.bindNewGeometry();
            geometry.properties = vtFeature.properties;
        }
        geometry.closeSubGeometry(count, feature);
        geometry.getLastSubGeometry().ccw = sum < 0;
    }
    feature.updateExtent(geometry);
}

export function getStyle(styles, id, zoom) {
    return styles[id].find(s => s.zoom.min <= zoom && s.zoom.max > zoom);
}

function readPBF(file, options) {
    options.out = options.out || {};
    const vectorTile = new VectorTile(new Protobuf(file));
    const sourceLayers = Object.keys(vectorTile.layers);

    if (sourceLayers.length < 1) {
        return;
    }

    // x,y,z tile coordinates
    const x = file.extent.col;
    const z = file.extent.zoom;
    // We need to move from TMS to Google/Bing/OSM coordinates
    // https://alastaira.wordpress.com/2011/07/06/converting-tms-tile-coordinates-to-googlebingosm-tile-coordinates/
    // Only if the layer.origin is top
    const y = options.in.isInverted ? file.extent.row : (1 << z) - file.extent.row - 1;

    options.out.buildExtent = true;
    options.out.mergeFeatures = true;
    options.out.withAltitude = false;
    options.out.withNormal = false;

    const collection = new FeatureCollection('EPSG:3857', options.out);

    const vFeature = vectorTile.layers[sourceLayers[0]];
    // TODO: verify if size is correct because is computed with only one feature (vFeature).
    const size = vFeature.extent * 2 ** z;
    const center = -0.5 * size;
    collection.scale.set(size, -size, 1).divide(globalExtent);
    collection.translation.set(-(vFeature.extent * x + center), -(vFeature.extent * y + center), 0).divide(collection.scale);

    sourceLayers.forEach((layer_id) => {
        if (!options.in.layers[layer_id]) { return; }

        const sourceLayer = vectorTile.layers[layer_id];

        for (let i = sourceLayer.length - 1; i >= 0; i--) {
            const vtFeature = sourceLayer.feature(i);
            const layers = options.in.layers[layer_id].filter(l => l.filterExpression.filter({ zoom: z }, vtFeature) && z >= l.zoom.min && z < l.zoom.max);
            let feature;

            for (const layer of layers) {
                if (!feature) {
                    feature = collection.requestFeatureById(layer.id, vtFeature.type - 1);
                    feature.id = layer.id;
                    feature.order = layer.order;
                    feature.style = getStyle(options.in.styles, feature.id, z);
                    vtFeatureToFeatureGeometry(vtFeature, feature);
                } else if (!collection.features.find(f => f.id === layer.id)) {
                    feature = collection.newFeatureByReference(feature);
                    feature.id = layer.id;
                    feature.order = layer.order;
                    feature.style = getStyle(options.in.styles, feature.id, z);
                }
            }
        }
    });

    collection.removeEmptyFeature();
    // TODO Some vector tiles are already sorted
    collection.features.sort((a, b) => a.order - b.order);
    // TODO verify if is needed to updateExtent for previous features.
    collection.updateExtent();
    collection.extent = file.extent;
    return Promise.resolve(collection);
}

/**
 * @module VectorTileParser
 */
export default {
    /**
     * Parse a vector tile file and return a [Feature]{@link module:GeoJsonParser.Feature}
     * or an array of Features. While multiple formats of vector tile are
     * available, the only one supported for the moment is the
     * [Mapbox Vector Tile]{@link https://www.mapbox.com/vector-tiles/specification/}.
     *
     * @param {ArrayBuffer} file - The vector tile file to parse.
     *
     * @param {ParsingOptions} options - Options controlling the parsing {@link ParsingOptions}.
     *
     * @param {InformationsData} options.in - Object containing all styles,
     * layers and informations data, see {@link InformationsData}.
     *
     * @param {Object} options.in.Styles - Object containing subobject with
     * informations on a specific style layer. Styles available is by `layer.id` and by zoom.
     *
     * @param {Object} options.in.layers - Object containing subobject with
     *
     * @param {FeatureBuildingOptions} options.out - options indicates how the features should be built,
     * see {@link FeatureBuildingOptions}.
     *
     * @return {Promise} A Promise resolving with a Feature or an array a
     * Features.
     */
    parse(file, options) {
        options = deprecatedParsingOptionsToNewOne(options);
        return Promise.resolve(readPBF(file, options));
    },
};
