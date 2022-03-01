import FeatureGeometryLayer from 'Layer/FeatureGeometryLayer';

/**
 * `FeatureGeometryLayer` displays geographic vector data (geojson, kml...) in object 3D.
 * `FeatureGeometryLayer` is a pre-configured `GeometryLayer` to load and convert vector data.
 * In deed, `GeometryLayer` allows customizing data loading (`update` method)
 * and their conversion (`convert` method),
 *
 * @property {boolean} isFeatureGeometryLayer - Used to checkout whether this layer is
 * a FeatureGeometryLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class VectorTileGeometryLayer extends FeatureGeometryLayer {
    /**
     * @constructor
     * @extends GeometryLayer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer.
     * @param {function} [options.batchId] - optional function to create batchId attribute.
     * It is passed the feature property and the feature index.
     * As the batchId is using an unsigned int structure on 32 bits, the batchId could be between 0 and 4,294,967,295.
     * @param {THREE.Object3D} [config.object3d=new THREE.Group()] root object3d layer.
     *
     */
    constructor(id, config = {}) {
        super(id, config);
        this.isVectorTileGeometryLayer = true;
        this.crs = 'EPSG:3857';
    }
    // preUpdate(context, sources) {
    //     sources.forEach((node) => {
    //         if (node.isTileMesh) {
    //             const features = node.children.filter(n => n.layer == this);
    //             // console.log('node.', node.visible);
    //             features.forEach((feature) => {
    //                 // node.remove(feature);
    //                 // feature.displayed = true;
    //             });
    //         }
    //     });
    // }
}

export default VectorTileGeometryLayer;
