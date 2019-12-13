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

        const placement = options.placement || {};
        placement.coord = placement.coord || extent.center();
        placement.tilt = placement.tilt || 90;
        placement.heading = placement.heading || 0;
        placement.range = placement.range || max;

        CameraUtils.transformCameraToLookAtTarget(this, camera3D, placement);

        this.tileLayer = tileLayer;
    }

    addLayer(layer) {
        return super.addLayer(layer, this.tileLayer);
    }
}

export default PlanarView;
