import Extent from 'Core/Geographic/Extent';

function defaultExtent(crs) {
    return new Extent(crs, Infinity, -Infinity, Infinity, -Infinity);
}

function _extendBuffer(feature, size) {
    feature.vertices.length += size * feature.size;
    if (feature.normals) {
        feature.normals.length = feature.vertices.length;
    }
}


/**
 * @property {Extent} extent - The 2D extent containing all the points
 * composing the geometry.
 * @property {Object[]} indices - Contains the indices
 * that define the geometry. Objects stored in this array have two
 * properties, an <code>offset</code> and a <code>count</code>. The offset
 * is related to the overall number of vertices in the Feature.
 *
 * @property {Object} properties - Properties of the geometry. It can be
 * anything specified in the GeoJSON under the <code>properties</code>
 * property.
 */
class FeatureGeometry {
    /**
     * @param {Feature} feature geometry
     */
    constructor(feature) {
        this.extent = feature.extent ? defaultExtent(feature.crs) : undefined;
        this.indices = [];
        this._feature = feature;
        this.properties = {};
    }
    /**
     * Add a new marker to indicate the starting of sub geometry and extends the vertices buffer.
     * Then you have to push new the coordinates of sub geometry.
     * The sub geometry stored in indices, see constructor for more information.
     * @param {number} count count of vertices
     */
    startSubGeometry(count) {
        const last = this.indices.length - 1;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            this._feature.vertices.length / this.size;
        this.indices.push({ offset, count });
        _extendBuffer(this._feature, count);
    }

    /**
     * After you have pushed new the coordinates of sub geometry without <code>startSubGeometry</code>,
     * this function close sub geometry. The sub geometry stored in indices,
     * see constructor for more information.
     * @param {number} count count of vertices
     */
    closeSubGeometry(count) {
        const last = this.indices.length - 1;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            this._feature.vertices.length / this.size - count;
        this.indices.push({ offset, count });
    }
    /**
     * Push new coordinates in vertices buffer.
     * @param {Coordinates} coord The coordinates to push.
     */
    pushCoordinates(coord) {
        if (coord.crs !== this._feature.crs) {
            coord.as(this._feature.crs, coord);
        }
        if (this._feature.normals) {
            coord.geodesicNormal.toArray(this._feature.normals, this._feature._pos);
        }

        this._feature._pushValues(this._feature, coord._values[0], coord._values[1], coord._values[2]);
        // expand extent if present
        if (this.extent) {
            this.extent.expandByCoordinates(coord);
        }
    }

    /**
    * Push new values coordinates in vertices buffer.
    * No geographical conversion is made or the normal doesn't stored.
    *
    * @param {number} long The longitude coordinate.
    * @param {number} lat The latitude coordinate.
    * @param {number} alt The altitude coordinate.
    */
    pushCoordinatesValues(long, lat, alt) {
        this._feature._pushValues(this._feature, long, lat, alt);
        // expand extent if present
        if (this.extent) {
            this.extent.expandByValuesCoordinates(long, lat, alt);
        }
    }
    /**
     * @returns {number} the number of values of the array that should be associated with a coordinates.
     * The size is 3 with altitude and 2 without altitude.
     */
    get size() {
        return this._feature.size;
    }
}

function push2DValues(feature, value0, value1) {
    feature.vertices[feature._pos++] = value0;
    feature.vertices[feature._pos++] = value1;
}

function push3DValues(feature, value0, value1, value2) {
    feature.vertices[feature._pos++] = value0;
    feature.vertices[feature._pos++] = value1;
    feature.vertices[feature._pos++] = value2;
}

export const FEATURE_TYPES = {
    POINT: 'point',
    POLYGON: 'polygon',
    LINE: 'line',
};

/**
 *
 * This class improves and simplifies the construction and conversion of geographic data structures.
 * It's an intermediary structure between geomatic formats and THREE objects.
 *
 * @property {string} type - Geometry type, can be <code>point</code>, <code>line</code>,
 * or <code>polygon</code> or
 * @property {number[]} vertices - All the vertices of the Feature.
 * @property {number[]} normals - All the normals of the Feature.
 * @property {number} size - the number of values of the array that should be associated with a coordinates.
 * The size is 3 with altitude and 2 without altitude.
 * @property {string} crs - Geographic or Geocentric coordinates system.
 * @property {Array.<FeatureGeometry>} geometry - The feature's geometry.
 * @property {Extent?} extent - The extent containing all the geometries
 * composing the feature.
 */
class Feature {
    /**
     *
     * @param {string} type type of Feature. It can be 'point', 'line' or 'polygon'.
     * @param {string} crs Geographic or Geocentric coordinates system.
     * @param {Object} [options={}] options to build feature.
     * @param {boolean} [options.buildExtent] Build extent and update when adding new vertice.
     * @param {boolean} [options.withAltitude] Set vertice altitude when adding new vertice.
     * @param {boolean} [options.withNormal] Set vertice normal when adding new vertice.
     */
    constructor(type, crs, options = {}) {
        if (Object.keys(FEATURE_TYPES).find(t => FEATURE_TYPES[t] === type)) {
            this.type = type;
        } else {
            throw new Error(`Unsupported Feature type: ${type}`);
        }
        this.geometry = [];
        /**
         * @property {number[]} vertices the vertices
         */
        this.vertices = [];
        this.normals = options.withNormal ? [] : undefined;
        this.crs = crs;
        this.size = options.withAltitude ? 3 : 2;
        this.extent = options.buildExtent ? defaultExtent(crs) : undefined;
        this._pos = 0;
        this._pushValues = this.size === 3 ? push3DValues : push2DValues;
    }
    /**
     * Instance a new {@link FeatureGeometry}  and push in {@link Feature}.
     * @returns {FeatureGeometry} the instancied geometry.
     */
    bindNewGeometry() {
        const geometry = new FeatureGeometry(this);
        this.geometry.push(geometry);
        return geometry;
    }
    /**
     * Update {@link Extent} feature with {@link Extent} geometry
     * @param {FeatureGeometry} geometry used to update Feature {@link Extent}
     */
    updateExtent(geometry) {
        if (this.extent) {
            this.extent.union(geometry.extent);
        }
    }

    /**
     * @returns {number} the count of geometry.
     */
    get geometryCount() {
        return this.geometry.length;
    }
}

export default Feature;

/**
 * @property {Feature[]} features - The array of features composing the
 * collection.
 * @property {Extent?} extent - The 2D extent containing all the features
 * composing the collection.
 * @property {string} crs - Geographic or Geocentric coordinates system.
 * @property {boolean} isFeatureCollection - Used to check whether this is FeatureCollection.
 *
 * An object regrouping a list of [features]{@link Feature} and the extent of this collection.
 */
export class FeatureCollection {
    constructor(crs, options) {
        this.isFeatureCollection = true;
        this.crs = crs;
        this.features = [];
        this.optionsFeature = options || {};
        this.extent = options.buildExtent ? defaultExtent(crs) : undefined;
    }

    /**
     * Update FeatureCollection extent with <code>extent</code> or
     * all features extent if <code>extent</code> is <code>undefined</code>.
     * @param {Extent} extent
     */
    updateExtent(extent) {
        if (this.extent) {
            const extents = extent ? [extent] : this.features.map(feature => feature.extent);
            for (const ext of extents) {
                this.extent.union(ext);
            }
        }
    }

    /**
     * Remove features that don't have [FeatureGeometry]{@link FeatureGeometry}.
     */
    removeEmptyFeature() {
        this.features = this.features.filter(feature => feature.geometry.length);
    }

    /**
     * Push the <code>feature</code> in FeatureCollection.
     * @param {Feature} feature
     */
    pushFeature(feature) {
        this.features.push(feature);
        this.updateExtent(feature.extent);
    }

    /**
     * Returns the Feature by type if <code>mergeFeatures</code> is <code>true</code>
     * or returns the new instance of typed Feature.
     *
     * @param {string} type the type requested
     * @returns {Feature}
     */
    getFeatureByType(type) {
        const feature = this.features.find(feature => feature.type === type);
        if (feature && this.optionsFeature.mergeFeatures) {
            return feature;
        } else {
            const newFeature = new Feature(type, this.crs, this.optionsFeature);
            this.features.push(newFeature);
            return newFeature;
        }
    }
}
