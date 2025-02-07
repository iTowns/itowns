import { Group } from 'three';

import GeometryLayer from 'Layer/GeometryLayer';
import FeatureProcessing from 'Process/FeatureProcessing';
import Feature2Mesh from 'Converter/Feature2Mesh';

/**
 * `FeatureGeometryLayer` displays geographic vector data (geojson, kml...) in object 3D.
 * `FeatureGeometryLayer` is a pre-configured `GeometryLayer` to load and convert vector data.
 * In deed, `GeometryLayer` allows customizing data loading (`update` method)
 * and their conversion (`convert` method),
 *
 * @property {boolean} isFeatureGeometryLayer - Used to checkout whether this layer is
 * a FeatureGeometryLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 *
 * @extends GeometryLayer
 */
class FeatureGeometryLayer extends GeometryLayer {
    /**
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [options] - Optional configuration, all elements in it
     * will be merged as is in the layer.
     * @param {function} [options.batchId] - optional function to create batchId attribute.
     * It is passed the feature property and the feature index.
     * As the batchId is using an unsigned int structure on 32 bits, the batchId could be between 0 and 4,294,967,295.
     * @param {THREE.Object3D} [options.object3d=new THREE.Group()] root object3d layer.
     * @param {function} [options.onMeshCreated] this callback is called when the mesh is created. The callback parameters are the
     * `mesh` and the `context`.
     * @param {function} [options.filter] callback which filters the features of
     * this layer. It takes an object with a `properties` property as argument
     * and shall return a boolean.
     * @param {boolean} [options.accurate=TRUE] If `accurate` is `true`, data are re-projected with maximum geographical accuracy.
     * With `true`, `proj4` is used to transform data source.
     *
     * If `accurate` is `false`, re-projecting is faster but less accurate.
     * With `false`, an affine transformation is used to transform data source.
     * This method is an approximation. The error increases with the extent
     * dimension of the object or queries.
     *
     * For example :
     * * for a **100** meter dimension, there's a difference of **0.001** meter with the accurate method
     * * for a **500** meter dimension, there's a difference of **0.05** meter with the accurate method
     * * for a **20000** meter dimension, there's a difference of **40** meter with the accurate method
     *
     * **WARNING** If the source is `VectorTilesSource` then `accurate` is always false.
     */
    constructor(id, options = {}) {
        const {
            object3d,
            batchId,
            onMeshCreated,
            accurate = true,
            filter,
            ...geometryOptions
        } = options;

        super(id, object3d || new Group(), geometryOptions);

        this.update = FeatureProcessing.update;
        this.convert = Feature2Mesh.convert({
            batchId,
        });

        this.onMeshCreated = onMeshCreated;

        this.isFeatureGeometryLayer = true;
        this.accurate = accurate;
        this.buildExtent = !this.accurate;
        this.filter = filter;
    }

    preUpdate(context, sources) {
        if (sources.has(this.parent)) {
            this.object3d.clear();
        }
    }
}

export default FeatureGeometryLayer;
