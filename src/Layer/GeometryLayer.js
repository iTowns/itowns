import Layer from 'Layer/Layer';
import Picking from 'Core/Picking';
import { CACHE_POLICIES } from 'Core/Scheduler/Cache';

function disposeMesh(obj) {
    if (obj.dispose) {
        obj.dispose();
    } else {
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                for (const material of obj.material) {
                    material.dispose();
                }
            } else {
                obj.material.dispose();
            }
        }
    }
}

function traverse(obj, callback) {
    for (const child of obj.children) {
        traverse(child, callback);
    }
    callback(obj);
}

/**
 * Fires when the opacity of the layer has changed.
 * @event GeometryLayer#opacity-property-changed
 */

/**
 * @property {boolean} isGeometryLayer - Used to checkout whether this layer is
 * a GeometryLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {number} [zoom.max=Infinity] - this is the maximum zoom beyond which it'll be hidden.
 * The `max` is constant and the value is `Infinity` because there's no maximum display level after which it is hidden.
 * This property is used only if the layer is attached to [TiledGeometryLayer]{@link TiledGeometryLayer}.
 * @property {number} [zoom.min=0] - this is the minimum zoom from which it'll be visible.
 * This property is used only if the layer is attached to [TiledGeometryLayer]{@link TiledGeometryLayer}.
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
     * geometry of the GeometryLayer. It is usually a `THREE.Group`, but it can
     * be anything inheriting from a `THREE.Object3d`.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {Source} [config.source] - Description and options of the source.
     *
     * @throws {Error} `object3d` must be a valid `THREE.Object3d`.
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
        config.cacheLifeTime = config.cacheLifeTime == undefined ? CACHE_POLICIES.GEOMETRY : config.cacheLifeTime;
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
        this.visible = config.visible == undefined ? true : config.visible;
        Object.defineProperty(this.zoom, 'max', {
            value: Infinity,
            writable: false,
        });

        // Feature options
        this.filteringExtent = !this.source.isFileSource;
        this.withNormal = true;
        this.withAltitude = true;
    }

    // Attached layers expect to receive the visual representation of a
    // layer (= THREE object with a material).  So if a layer's update
    // function don't process this kind of object, the layer must provide a
    // getObjectToUpdateForAttachedLayers function that returns the correct
    // object to update for attached layer.
    // See 3dtilesLayer or PotreeLayer for examples.
    // eslint-disable-next-line arrow-body-style
    getObjectToUpdateForAttachedLayers(obj) {
        if (obj.parent && obj.material) {
            return {
                element: obj,
                parent: obj.parent,
            };
        }
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
     * be available in `geometryLayer.attachedLayers`.
     *
     * @param {Layer} layer - The layer to attach, that must have an `update`
     * method.
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
     * All layer's meshs are removed from scene and disposed from video device.
     */
    delete() {
        // if Layer is attached
        if (this.parent) {
            traverse(this.parent.object3d, (obj) => {
                if (obj.layer && obj.layer.id == this.id) {
                    obj.parent.remove(obj);
                    disposeMesh(obj);
                }
            });
        }

        if (this.object3d.parent) {
            this.object3d.parent.remove(this.object3d);
        }
        this.object3d.traverse(disposeMesh);
    }

    /**
     * Picking method for this layer. It uses the {@link Picking#pickObjectsAt}
     * method.
     *
     * @param {View} view - The view instance.
     * @param {Object} coordinates - The coordinates to pick in the view. It
     * should have at least `x` and `y` properties.
     * @param {number} radius - Radius of the picking circle.
     * @param {Array} target - target to push result.
     *
     * @return {Array} An array containing all targets picked under the
     * specified coordinates.
     */
    pickObjectsAt(view, coordinates, radius = this.options.defaultPickingRadius, target = []) {
        const object3d = this.parent ? this.parent.object3d : this.object3d;
        return Picking.pickObjectsAt(view, coordinates, radius, object3d, target, this.threejsLayer);
    }

    /**
     * Change the opacity of an object, according to the value of the `opacity`
     * property of this layer.
     *
     * @param {Object} object - The object to change the opacity from. It is
     * usually a `THREE.Object3d` or an implementation of it.
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
