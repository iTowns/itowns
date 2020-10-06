import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';
import Style from 'Core/Style';

function defaultExtent(crs) {
    return new Extent(crs, Infinity, -Infinity, Infinity, -Infinity);
}

function _extendBuffer(feature, size) {
    feature.vertices.length += size * feature.size;
    if (feature.normals) {
        feature.normals.length = feature.vertices.length;
    }
}

const coordOut = new Coordinates('EPSG:4326', 0, 0, 0);
const defaultNormal = new THREE.Vector3(0, 0, 1);

/**
 * @property {string} crs - The CRS to convert the input coordinates to.
 * @property {Extent|boolean} [filteringExtent=undefined] - Optional filter to reject
 * features outside of extent. Extent filetring is file extent if filteringExtent is true.
 * @property {boolean} [buildExtent=false] - If true the geometry will
 * have an extent property containing the area covered by the geometry.
 * True if the layer does not inherit from {@link GeometryLayer}.
 * @property {string} forcedExtentCrs - force feature extent crs if buildExtent is true.
 * @property {function} [filter] - Filter function to remove features
 * @property {boolean} [mergeFeatures=true] - If true all geometries are merged by type and multi-type
 * @property {boolean} [withNormal=true] - If true each coordinate normal is computed.
 * True if the layer inherits from {@link GeometryLayer}
 * @property {boolean} [withAltitude=true] - If true each coordinate altitude is kept
 * True if the layer inherits from {@link GeometryLayer}
 * @property {boolean} [overrideAltitudeInToZero=false] - If true, the altitude of the source data isn't taken into account for 3D geometry convertions.
 * the altitude will be override to 0. This can be useful if you don't have a DEM or provide a new one when converting (with Layer.convert).
 * @property {Style} style - The style to inherit when creating
 * style for all new features.
 *
*/
export class FeatureBuildingOptions {}

/**
 * @property {Extent} extent - The 2D extent containing all the points
 * composing the geometry.
 * @property {Object[]} indices - Contains the indices that define the geometry.
 * Objects stored in this array have two properties, an `offset` and a `count`.
 * The offset is related to the overall number of vertices in the Feature.
 *
 * @property {Object} properties - Properties of the geometry. It can be
 * anything specified in the GeoJSON under the `properties` property.
 */
export class FeatureGeometry {
    /**
     * @param {Feature} feature geometry
     */
    constructor(feature) {
        this.indices = [];
        this.properties = {};
        this.size = feature.size;
        if (feature.extent) {
            this.extent = defaultExtent(feature.extent.crs);
            this._currentExtent = defaultExtent(feature.extent.crs);
        }
    }
    /**
     * Add a new marker to indicate the starting of sub geometry and extends the vertices buffer.
     * Then you have to push new the coordinates of sub geometry.
     * The sub geometry stored in indices, see constructor for more information.
     * @param {number} count - count of vertices
     * @param {Feature} feature - the feature containing the geometry
     */
    startSubGeometry(count, feature) {
        const last = this.indices.length - 1;
        const extent = this.extent ? defaultExtent(this.extent.crs) : undefined;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            feature.vertices.length / this.size;
        this.indices.push({ offset, count, extent });
        this._currentExtent = extent;
        _extendBuffer(feature, count);
    }

    /**
     * After you have pushed new the coordinates of sub geometry without
     * `startSubGeometry`, this function close sub geometry. The sub geometry
     * stored in indices, see constructor for more information.
     * @param {number} count count of vertices
     * @param {Feature} feature - the feature containing the geometry
     */
    closeSubGeometry(count, feature) {
        const last = this.indices.length - 1;
        const offset = last > -1 ?
            this.indices[last].offset + this.indices[last].count :
            feature.vertices.length / this.size - count;
        this.indices.push({ offset, count, extent: this._currentExtent });
        if (this.extent) {
            this.extent.union(this._currentExtent);
            this._currentExtent = defaultExtent(this.extent.crs);
        }
    }

    getLastSubGeometry() {
        const last = this.indices.length - 1;
        return this.indices[last];
    }
    /**
     * Push new coordinates in vertices buffer.
     * @param {Coordinates} coordIn The coordinates to push.
     * @param {Feature} feature - the feature containing the geometry
     */
    pushCoordinates(coordIn, feature) {
        coordIn.as(feature.crs, coordOut);

        if (feature.normals) {
            coordOut.geodesicNormal.toArray(feature.normals, feature._pos);
        }

        feature._pushValues(coordOut.x, coordOut.y, coordOut.z);
        // expand extent if present
        if (this._currentExtent) {
            this._currentExtent.expandByCoordinates(feature.useCrsOut ? coordOut : coordIn);
        }
    }

    /**
     * Push new values coordinates in vertices buffer.
     * No geographical conversion is made or the normal doesn't stored.
     *
     * @param {Feature} feature - the feature containing the geometry
     * @param {number} long The longitude coordinate.
     * @param {number} lat The latitude coordinate.
     * @param {number} [alt=0] The altitude coordinate.
     * @param {THREE.Vector3} [normal=THREE.Vector3(0,0,1)] the normal on coordinates.
     */
    pushCoordinatesValues(feature, long, lat, alt = 0, normal = defaultNormal) {
        if (feature.normals) {
            normal.toArray(feature.normals, feature._pos);
        }

        feature._pushValues(long, lat, alt);
        // expand extent if present
        if (this._currentExtent) {
            this._currentExtent.expandByValuesCoordinates(long, lat, alt);
        }
    }

    /**
     * update geometry extent with the last sub geometry extent.
     */
    updateExtent() {
        if (this.extent) {
            const last = this.indices[this.indices.length - 1];
            if (last) {
                this.extent.union(last.extent);
            }
        }
    }
}

function push2DValues(value0, value1) {
    this.vertices[this._pos++] = value0;
    this.vertices[this._pos++] = value1;
}

function push3DValues(value0, value1, value2 = 0) {
    this.vertices[this._pos++] = value0;
    this.vertices[this._pos++] = value1;
    this.vertices[this._pos++] = value2;
}

export const FEATURE_TYPES = {
    POINT: 0,
    LINE: 1,
    POLYGON: 2,
};

/**
 *
 * This class improves and simplifies the construction and conversion of geographic data structures.
 * It's an intermediary structure between geomatic formats and THREE objects.
 *
 * @property {string} type - Geometry type, can be `point`, `line`, or
 * `polygon`.
 * @property {number[]} vertices - All the vertices of the Feature.
 * @property {number[]} normals - All the normals of the Feature.
 * @property {number} size - the number of values of the array that should be associated with a coordinates.
 * The size is 3 with altitude and 2 without altitude.
 * @property {string} crs - Geographic or Geocentric coordinates system.
 * @property {FeatureGeometry[]} geometries - An array containing all {@link
 * FeatureGeometry}.
 * @property {Extent?} extent - The extent containing all the geometries
 * composing the feature.
 */
class Feature {
    /**
     *
     * @param {string} type type of Feature. It can be 'point', 'line' or 'polygon'.
     * @param {string} crs Geographic or Geocentric coordinates system.
     * @param {FeatureBuildingOptions} [options={}] options to build feature.
     * @param {boolean} [options.buildExtent] Build extent and update when adding new vertice.
     * @param {boolean} [options.withAltitude] Set vertice altitude when adding new vertice.
     * @param {boolean} [options.withNormal] Set vertice normal when adding new vertice.
     * @param {Style} [options.style] The style to inherit when creating a new
     * style for this feature.
     */
    constructor(type, crs, options = {}) {
        if (Object.keys(FEATURE_TYPES).find(t => FEATURE_TYPES[t] === type)) {
            this.type = type;
        } else {
            throw new Error(`Unsupported Feature type: ${type}`);
        }
        this.geometries = [];
        this.vertices = [];
        this.normals = options.withNormal ? [] : undefined;
        this.crs = crs;
        this.size = options.withAltitude ? 3 : 2;
        if (options.buildExtent) {
            // this.crs is final crs projection, is out projection.
            // If the extent crs is the same then we use output coordinate (coordOut) to expand it.
            this.extent = defaultExtent(options.forcedExtentCrs || this.crs);
            this.useCrsOut = !options.forceExtentCrs;
        }
        this._pos = 0;
        this._pushValues = (this.size === 3 ? push3DValues : push2DValues).bind(this);
        this.style = new Style({}, options.style);
    }
    /**
     * Instance a new {@link FeatureGeometry}  and push in {@link Feature}.
     * @returns {FeatureGeometry} the instancied geometry.
     */
    bindNewGeometry() {
        const geometry = new FeatureGeometry(this);
        this.geometries.push(geometry);
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
        return this.geometries.length;
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
 * @property {THREE.Vector3} translation - Apply translation on vertices and extent to transform on coordinates system.
 * @property {THREE.Vector3} scale - Apply scale on vertices and extent to transform on coordinates system.
 *
 * An object regrouping a list of [features]{@link Feature} and the extent of this collection.
 */
export class FeatureCollection {
    /**
     * Constructs a new instance.
     *
     * @param      {string}  crs      The crs projection.
     * @param      {FeatureBuildingOptions|Layer}  options  The building options .
     */
    constructor(crs, options) {
        this.isFeatureCollection = true;
        // TODO: Replace crs parameter by CRS.formatToEPSG(options.crs)
        this.crs = crs;
        this.features = [];
        this.optionsFeature = options || {};
        if (this.optionsFeature.buildExtent) {
            this.extent = defaultExtent(options.forcedExtentCrs || this.crs);
        }
        this.translation = new THREE.Vector3();
        this.scale = new THREE.Vector3(1, 1, 1);
    }

    /**
     * Update FeatureCollection extent with `extent` or all features extent if
     * `extent` is `undefined`.
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
        this.features = this.features.filter(feature => feature.geometries.length);
    }

    /**
     * Push the `feature` in FeatureCollection.
     * @param {Feature} feature
     */
    pushFeature(feature) {
        this.features.push(feature);
        this.updateExtent(feature.extent);
    }

    requestFeature(type, callback) {
        const feature = this.features.find(callback);
        if (feature && this.optionsFeature.mergeFeatures) {
            return feature;
        } else {
            const newFeature = new Feature(type, this.crs, this.optionsFeature);
            this.features.push(newFeature);
            return newFeature;
        }
    }

    /**
     * Returns the Feature by type if `mergeFeatures` is `true` or returns the
     * new instance of typed Feature.
     *
     * @param {string} type the type requested
     * @returns {Feature}
     */
    requestFeatureByType(type) {
        return this.requestFeature(type, feature => feature.type === type);
    }

    /**
     * Returns the Feature by type if `mergeFeatures` is `true` or returns the
     * new instance of typed Feature.
     *
     * @param {string} id the id requested
     * @param {string} type the type requested
     * @returns {Feature}
     */
    requestFeatureById(id, type) {
        return this.requestFeature(type, feature => feature.id === id);
    }
    /**
     * Add a new feature with references to all properties.
     * It allows to have features with different styles
     * without having to duplicate the geometry.
     * @param      {Feature}   feature  The feature to reference.
     * @return     {Feature}  The new referenced feature
     */
    newFeatureByReference(feature) {
        const ref = new Feature(feature.type, this.crs, this.optionsFeature);
        ref.extent = feature.extent;
        ref.geometries = feature.geometries;
        ref.normals = feature.normals;
        ref.size = feature.size;
        ref.vertices = feature.vertices;
        ref._pos = feature._pos;
        this.features.push(ref);
        return ref;
    }

    /**
     * Transforms a given {@link Coordinates}, using the translation and the
     * scale of this collection.
     *
     * @param {Coordinates} coordinates - The coordinates to transform
     *
     * @return {Coordinates} The same coordinates, with transformation applied.
     */
    transformCoordinates(coordinates) {
        coordinates.x = (coordinates.x / this.scale.x) - this.translation.x;
        coordinates.y = (coordinates.y / this.scale.y) - this.translation.y;
        coordinates.z = (coordinates.z / this.scale.z) - this.translation.z;
        return coordinates;
    }

    setParentStyle(style) {
        if (style) {
            this.features.forEach((f) => {
                f.style.parent = style;
            });
        }
    }
}
