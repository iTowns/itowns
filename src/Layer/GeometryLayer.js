import Layer from './Layer';
import Picking from '../Core/Picking';

class GeometryLayer extends Layer {
    constructor(id, object3d) {
        if (!object3d || !object3d.isObject3D) {
            throw new Error('Missing/Invalid object3d parameter (must be a three.js Object3D instance)');
        }

        super(id, 'geometry');

        this._attachedLayers = [];
        if (object3d.type === 'Group' && object3d.name === '') {
            object3d.name = id;
        }

        Object.defineProperty(this, 'object3d', {
            value: object3d,
            writable: false,
        });

        // Setup default picking method
        this.pickObjectsAt = (view, mouse, radius) => Picking.pickObjectsAt(view, mouse, radius, this.object3d);

        this.postUpdate = () => {};
    }

    attach(layer) {
        if (!layer.update) {
            throw new Error(`Missing 'update' function -> can't attach layer ${layer.id}`);
        }
        this._attachedLayers.push(layer);
    }

    detach(layer) {
        const count = this._attachedLayers.length;
        this._attachedLayers = this._attachedLayers.filter(attached => attached.id != layer.id);
        return this._attachedLayers.length < count;
    }
}

export default GeometryLayer;
