import Layer from 'Layer/Layer';
import Picking from 'Core/Picking';

/**
 * Fires when the opacity of the layer has changed.
 * @event GeometryLayer#opacity-property-changed
 */

/**
 * @property {boolean} isGeometryLayer - Used to checkout whether this layer is
 * a GeometryLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 */
class GeometryLayer extends Layer {
    /**
     * A layer usually managing a geometry to display on a view. For example, it
     * can be a layer of buildings extruded from a a WFS stream.
     *
     * @constructor
     * @extends Layer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {THREE.Object3d} object3d - The object3d used to contain the
     * geometry of the GeometryLayer. It is usually a <code>THREE.Group</code>,
     * but it can be anything inheriting from a <code>THREE.Object3d</code>.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements <code>name, protocol, extent</code>, these
     * elements will be available using <code>layer.name</code> or something
     * else depending on the property name.
     * @param {WMTSSource|WMSSource|WFSSource|TMSSource|FileSource} [config.source] -
     * Description and options of the source.
     *
     * @throws {Error} <code>object3d</code> must be a valid
     * <code>THREE.Object3d</code>.
     *
     * @example
     * // Create a GeometryLayer
     * const geometry = new GeometryLayer('buildings', {
     *      source: {
     *          url: 'http://server.geo/wfs?',
     *          protocol: 'wfs',
     *          format: 'application/json'
     *      },
     * });
     *
     * // Add the layer
     * view.addLayer(geometry);
     */
    constructor(id, object3d, config = {}) {
        super(id, config);

        this.isGeometryLayer = true;

        if (!object3d || !object3d.isObject3D) {
            throw new Error(`Missing/Invalid object3d parameter (must be a
                three.js Object3D instance)`);
        }

        if (object3d.type === 'Group' && object3d.name === '') {
            object3d.name = id;
        }

        Object.defineProperty(this, 'object3d', {
            value: object3d,
            writable: false,
            configurable: true,
        });

        this.defineLayerProperty('opacity', 1.0, () => {
            const root = this.parent ? this.parent.object3d : this.object3d;
            root.traverse((object) => {
                if (object.layer == this) {
                    this.changeOpacity(object);
                } else if (object.content && object.content.layer == this) {
                    object.content.traverse(this.changeOpacity);
                }
            });
        });

        this.defineLayerProperty('wireframe', false, () => {
            const root = this.parent ? this.parent.object3d : this.object3d;
            root.traverse((object) => {
                if (object.layer == this && object.material) {
                    object.material.wireframe = this.wireframe;
                } else if (object.content && object.content.layer == this) {
                    object.content.traverse((o) => {
                        if (o.material && o.layer == this) {
                            o.material.wireframe = this.wireframe;
                        }
                    });
                }
            });
        });

        this.attachedLayers = [];
        this.visible = true;

        // Attached layers expect to receive the visual representation of a
        // layer (= THREE object with a material).  So if a layer's update
        // function don't process this kind of object, the layer must provide a
        // getObjectToUpdateForAttachedLayers function that returns the correct
        // object to update for attached layer.
        // See 3dtilesProvider or PointCloudProvider for examples.
        // eslint-disable-next-line arrow-body-style
        this.getObjectToUpdateForAttachedLayers = (obj) => {
            if (obj.parent && obj.material) {
                return {
                    element: obj,
                    parent: obj.parent,
                };
            }
        };
    }

    // Placeholder
    // eslint-disable-next-line
    postUpdate() {}

    // Placeholder
    // eslint-disable-next-line
    culling() {
        return true;
    }

    /**
     * Attach another layer to this one. Layers attached to a GeometryLayer will
     * be available in <code>geometryLayer.attachedLayers</code>.
     *
     * @param {Layer} layer - The layer to attach, that must have an
     * <code>update</code> method.
     */
    attach(layer) {
        if (!layer.update) {
            throw new Error(`Missing 'update' function -> can't attach layer
                ${layer.id}`);
        }
        this.attachedLayers.push(layer);
        // To traverse GeometryLayer object3d attached
        layer.parent = this;
    }

    /**
     * Detach a layer attached to this one. See {@link attach} to learn how to
     * attach a layer.
     *
     * @param {Layer} layer - The layer to detach.
     *
     * @return {boolean} Confirmation of the detachment of the layer.
     */
    detach(layer) {
        const count = this.attachedLayers.length;
        this.attachedLayers = this.attachedLayers.filter(attached => attached.id != layer.id);
        layer.parent = undefined;
        return this.attachedLayers.length < count;
    }

    /**
     * Picking method for this layer. It uses the {@link Picking#pickObjectsAt}
     * method.
     *
     * @param {View} view - The view instance.
     * @param {Object} coordinates - The coordinates to pick in the view. It
     * should have at least <code>x</code> and <code>y</code> properties.
     * @param {number} radius - Radius of the picking circle.
     *
     * @return {Array} An array containing all targets picked under the
     * specified coordinates.
     */
    pickObjectsAt(view, coordinates, radius = this.options.defaultPickingRadius) {
        return Picking.pickObjectsAt(view, coordinates, radius, this.object3d);
    }

    /**
     * Change the opacity of an object, according to the value of the
     * <code>opacity</code> property of this layer.
     *
     * @param {Object} object - The object to change the opacity from. It is
     * usually a <code>THREE.Object3d</code> or an implementation of it.
     */
    changeOpacity(object) {
        if (object.material) {
            // != undefined: we want the test to pass if opacity is 0
            if (object.material.opacity != undefined) {
                object.material.transparent = this.opacity < 1.0;
                object.material.opacity = this.opacity;
            }
            if (object.material.uniforms && object.material.uniforms.opacity != undefined) {
                object.material.transparent = this.opacity < 1.0;
                object.material.uniforms.opacity.value = this.opacity;
            }
        }
    }
}

export default GeometryLayer;
