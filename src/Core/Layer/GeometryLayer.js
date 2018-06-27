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

GeometryLayer.prototype.onTileCreated = function onTileCreated(layer, parent, node) {
    node.material.setLightingOn(layer.lighting.enable);
    node.material.uniforms.lightPosition.value = layer.lighting.position;

    if (layer.noTextureColor) {
        node.material.uniforms.noTextureColor.value.copy(layer.noTextureColor);
    }

    if (__DEBUG__) {
        node.material.uniforms.showOutline = { value: layer.showOutline || false };
        node.material.wireframe = layer.wireframe || false;
    }
};

GeometryLayer.prototype.preUpdate = function preUpdate(context, layer, changeSources) {
    let commonAncestor;
    for (const source of changeSources.values()) {
        if (source.isCamera) {
            // if the change is caused by a camera move, no need to bother
            // to find common ancestor: we need to update the whole tree:
            // some invisible tiles may now be visible
            return layer.level0Nodes;
        }
        if (source.layer === layer) {
            if (!commonAncestor) {
                commonAncestor = source;
            } else {
                commonAncestor = source.findCommonAncestor(commonAncestor);
                if (!commonAncestor) {
                    return layer.level0Nodes;
                }
            }
            if (commonAncestor.material == null) {
                commonAncestor = undefined;
            }
        }
    }
    if (commonAncestor) {
        if (__DEBUG__) {
            layer._latestUpdateStartingLevel = commonAncestor.level;
        }
        return [commonAncestor];
    } else {
        return layer.level0Nodes;
    }
};

export default GeometryLayer;
