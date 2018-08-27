import * as THREE from 'three';

import View from '../View';
import PanoramaLayer from './Panorama/PanoramaLayer';

export function createPanoramaLayer(id, coordinates, type, options = {}) {
    console.warn('createPanoramaLayer is deprecated, use the PanoramaLayer class instead.');
    return new PanoramaLayer(id, coordinates, type, options);
}

function PanoramaView(viewerDiv, coordinates, type, options = {}) {
    THREE.Object3D.DefaultUp.set(0, 0, 1);

    // Setup View
    View.call(this, coordinates.crs, viewerDiv, options);

    // Configure camera
    const camera = this.camera.camera3D;
    coordinates.xyz(camera.position);

    camera.fov = 45;
    camera.near = 0.1;
    camera.far = 1000;
    camera.up = coordinates.geodesicNormal;
    // look at to the north
    camera.lookAt(new THREE.Vector3(0, 1, 0).add(camera.position));

    if (camera.updateProjectionMatrix) {
        camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    this.tileLayer = new PanoramaLayer('panorama', coordinates, type, options);

    View.prototype.addLayer.call(this, this.tileLayer);
}

PanoramaView.prototype = Object.create(View.prototype);
PanoramaView.prototype.constructor = PanoramaView;

PanoramaView.prototype.addLayer = function addLayer(layer) {
    if (!layer) {
        return new Promise((resolve, reject) => reject(new Error('layer is undefined')));
    }
    if (layer.type != 'color') {
        throw new Error(`Unsupported layer type ${layer.type} (PanoramaView only support 'color' layers)`);
    }
    return View.prototype.addLayer.call(this, layer, this.tileLayer);
};

export default PanoramaView;
