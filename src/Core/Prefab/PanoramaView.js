import * as THREE from 'three';

import View from '../View';

import { GeometryLayer } from '../Layer/Layer';
import Extent from '../Geographic/Extent';
import { processTiledGeometryNode } from '../../Process/TiledNodeProcessing';
import { updateLayeredMaterialNodeImagery } from '../../Process/LayeredMaterialNodeProcessing';
import { panoramaCulling, panoramaSubdivisionControl } from '../../Process/PanoramaTileProcessing';
import PanoramaTileBuilder from './Panorama/PanoramaTileBuilder';
import SubdivisionControl from '../../Process/SubdivisionControl';

export function createPanoramaLayer(id, coordinates, ratio, options = {}) {
    const tileLayer = new GeometryLayer(id, options.object3d || new THREE.Group());

    coordinates.xyz(tileLayer.object3d.position);
    tileLayer.object3d.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1), coordinates.geodesicNormal);
    tileLayer.object3d.updateMatrixWorld(true);

    // FIXME: add CRS = '0' support
    tileLayer.extent = new Extent('EPSG:4326', {
        west: -180,
        east: 180,
        north: 90,
        south: -90,
    });

    if (ratio == 2) {
        // equirectangular -> spherical geometry
        tileLayer.schemeTile = [
            new Extent('EPSG:4326', {
                west: -180,
                east: 0,
                north: 90,
                south: -90,
            }), new Extent('EPSG:4326', {
                west: 0,
                east: 180,
                north: 90,
                south: -90,
            })];
    } else {
        // cylindrical geometry
        tileLayer.schemeTile = [
            new Extent('EPSG:4326', {
                west: -180,
                east: -90,
                north: 90,
                south: -90,
            }), new Extent('EPSG:4326', {
                west: -90,
                east: 0,
                north: 90,
                south: -90,
            }), new Extent('EPSG:4326', {
                west: 0,
                east: 90,
                north: 90,
                south: -90,
            }), new Extent('EPSG:4326', {
                west: 90,
                east: 180,
                north: 90,
                south: -90,
            })];
    }
    tileLayer.disableSkirt = true;

    // Configure tiles
    const nodeInitFn = function nodeInitFn(layer, parent, node) {
        if (layer.noTextureColor) {
            node.material.uniforms.noTextureColor.value.copy(layer.noTextureColor);
        }
        node.material.depthWrite = false;

        if (__DEBUG__) {
            node.material.uniforms.showOutline = { value: layer.showOutline || false };
            node.material.wireframe = layer.wireframe || false;
        }
    };

    function _commonAncestorLookup(a, b) {
        if (!a || !b) {
            return undefined;
        }
        if (a.level == b.level) {
            if (a.id == b.id) {
                return a;
            } else if (a.level != 0) {
                return _commonAncestorLookup(a.parent, b.parent);
            } else {
                return undefined;
            }
        } else if (a.level < b.level) {
            return _commonAncestorLookup(a, b.parent);
        } else {
            return _commonAncestorLookup(a.parent, b);
        }
    }

    tileLayer.preUpdate = (context, layer, changeSources) => {
        SubdivisionControl.preUpdate(context, layer);

        if (__DEBUG__) {
            layer._latestUpdateStartingLevel = 0;
        }

        if (changeSources.has(undefined) || changeSources.size == 0) {
            return layer.level0Nodes;
        }

        let commonAncestor;
        for (const source of changeSources.values()) {
            if (source.isCamera) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return layer.level0Nodes;
            }
            if (source.layer === layer.id) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = _commonAncestorLookup(commonAncestor, source);
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


    function subdivision(context, layer, node) {
        if (SubdivisionControl.hasEnoughTexturesToSubdivide(context, layer, node)) {
            return panoramaSubdivisionControl(
                options.maxSubdivisionLevel || 10, new THREE.Vector2(512, 512 / ratio))(context, layer, node);
        }
        return false;
    }

    tileLayer.update = processTiledGeometryNode(panoramaCulling, subdivision);
    tileLayer.builder = new PanoramaTileBuilder(ratio);
    tileLayer.onTileCreated = nodeInitFn;
    tileLayer.type = 'geometry';
    tileLayer.protocol = 'tile';
    tileLayer.visible = true;
    tileLayer.segments = 8;
    tileLayer.quality = 0.5;
    tileLayer.lighting = {
        enable: false,
        position: { x: -0.5, y: 0.0, z: 1.0 },
    };

    return tileLayer;
}

function PanoramaView(viewerDiv, coordinates, ratio, options = {}) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    // Setup View
    View.call(this, coordinates.crs, viewerDiv, options);

    // Configure camera
    coordinates.xyz(this.camera.camera3D.position);
    this.camera.camera3D.fov = 45;

    this.camera.camera3D.near = 0.1;
    this.camera.camera3D.far = 1000;
    this.camera.camera3D.up = coordinates.geodesicNormal;
    this.camera.camera3D.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), coordinates.geodesicNormal);
    this.camera.camera3D.updateProjectionMatrix();
    this.camera.camera3D.updateMatrixWorld();

    const tileLayer = createPanoramaLayer('panorama', coordinates, ratio, options);

    View.prototype.addLayer.call(this, tileLayer);

    this.baseLayer = tileLayer;
}

PanoramaView.prototype = Object.create(View.prototype);
PanoramaView.prototype.constructor = PanoramaView;

PanoramaView.prototype.addLayer = function addLayer(layer) {
    if (layer.type == 'color') {
        layer.update = updateLayeredMaterialNodeImagery;
    } else {
        throw new Error(`Unsupported layer type ${layer.type} (PanoramaView only support 'color' layers)`);
    }
    return View.prototype.addLayer.call(this, layer, this.baseLayer);
};

export default PanoramaView;
