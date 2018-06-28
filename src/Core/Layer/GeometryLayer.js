import { EventDispatcher } from 'three';
import Picking from '../Picking';

function GeometryLayer(id, object3d) {
    if (!id) {
        throw new Error('Missing id parameter (GeometryLayer must have a unique id defined)');
    }
    if (!object3d || !object3d.isObject3D) {
        throw new Error('Missing/Invalid object3d parameter (must be a three.js Object3D instance)');
    }

    this._attachedLayers = [];
    this.type = 'geometry';
    this.protocol = 'tile';
    this.visible = true;
    this.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

    if (object3d && object3d.type === 'Group' && object3d.name === '') {
        object3d.name = id;
    }

    Object.defineProperty(this, 'object3d', {
        value: object3d,
        writable: false,
    });

    Object.defineProperty(this, 'id', {
        value: id,
        writable: false,
    });

    // Setup default picking method
    this.pickObjectsAt = (view, mouse, radius) => Picking.pickObjectsAt(view, mouse, radius, this.object3d);

    this.postUpdate = () => {};
}

GeometryLayer.prototype = Object.create(EventDispatcher.prototype);
GeometryLayer.prototype.constructor = GeometryLayer;

GeometryLayer.prototype.attach = function attach(layer) {
    if (!layer.update) {
        throw new Error(`Missing 'update' function -> can't attach layer ${layer.id}`);
    }
    this._attachedLayers.push(layer);
};

GeometryLayer.prototype.detach = function detach(layer) {
    const count = this._attachedLayers.length;
    this._attachedLayers = this._attachedLayers.filter(attached => attached.id != layer.id);
    return this._attachedLayers.length < count;
};

GeometryLayer.prototype.onTileCreated = function onTileCreated(node) {
    node.material.setLightingOn(this.lighting.enable);
    node.material.uniforms.lightPosition.value = this.lighting.position;

    if (this.noTextureColor) {
        node.material.uniforms.noTextureColor.value.copy(this.noTextureColor);
    }

    if (__DEBUG__) {
        node.material.uniforms.showOutline = { value: this.showOutline || false };
        node.material.wireframe = this.wireframe || false;
    }
};

GeometryLayer.prototype.preUpdate = function preUpdate(context, changeSources) {
    let commonAncestor;
    for (const source of changeSources.values()) {
        if (source.isCamera) {
            // if the change is caused by a camera move, no need to bother
            // to find common ancestor: we need to update the whole tree:
            // some invisible tiles may now be visible
            return this.level0Nodes;
        }
        if (source.this === this) {
            if (!commonAncestor) {
                commonAncestor = source;
            } else {
                commonAncestor = source.findCommonAncestor(commonAncestor);
                if (!commonAncestor) {
                    return this.level0Nodes;
                }
            }
            if (commonAncestor.material == null) {
                commonAncestor = undefined;
            }
        }
    }
    if (commonAncestor) {
        if (__DEBUG__) {
            this._latestUpdateStartingLevel = commonAncestor.level;
        }
        return [commonAncestor];
    } else {
        return this.level0Nodes;
    }
};

export default GeometryLayer;
