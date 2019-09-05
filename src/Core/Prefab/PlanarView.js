import * as THREE from 'three';

import View from 'Core/View';
import CameraUtils from 'Utils/CameraUtils';

import PlanarLayer from './Planar/PlanarLayer';

class PlanarView extends View {
    constructor(viewerDiv, extent, options = {}) {
        THREE.Object3D.DefaultUp.set(0, 0, 1);

        // Setup View
        super(extent.crs, viewerDiv, options);
        this.isPlanarView = true;

        // Configure camera
        const dim = extent.dimensions();
        const max = Math.max(dim.x, dim.y);
        const camera3D = this.camera.camera3D;
        camera3D.near = 0.1;
        camera3D.far = 2 * max;
        this.camera.camera3D.updateProjectionMatrix();

        const tileLayer = new PlanarLayer('planar', extent, options.object3d, options);

        this.addLayer(tileLayer);

        const p = { coord: extent.center(), range: max, tilt: 20, heading: 0 };
        CameraUtils.transformCameraToLookAtTarget(this, camera3D, p);

        this.tileLayer = tileLayer;
    }

    addLayer(layer) {
        return super.addLayer(layer, this.tileLayer);
    }
}

export default PlanarView;
