import * as THREE from 'three';

import View from 'Core/View';
import CameraUtils from 'Utils/CameraUtils';
import { CAMERA_TYPE } from 'Renderer/Camera';

import PlanarControls from 'Controls/PlanarControls';
import PlanarLayer from './Planar/PlanarLayer';

class PlanarView extends View {
    /**
     * @constructor
     * @extends View
     *
     * @example <caption><b>Enable WebGl 1.0 instead of WebGl 2.0.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * const extent = new Extent('EPSG:3946', 1837816.94334, 1847692.32501, 5170036.4587, 5178412.82698);
     * var view = new itowns.PlanarView(viewerDiv, extent, {  renderer: { isWebGL2: false } });
     *
     * @example <caption><b>Instance with placement on the ground.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * const extent = new Extent('EPSG:3946', 1837816.94334, 1847692.32501, 5170036.4587, 5178412.82698);
     * var view = new itowns.PlanarView(viewerDiv, extent, { placement: { heading: -49.6, range: 6200, tilt: 17 } });
     *
     * @param {HTMLDivElement} viewerDiv - Where to attach the view and display it
     * in the DOM.
     * @param {Extent} extent - The ground extent.
     * @param {object=} options - See options of {@link View}.
     * @param {boolean} [options.noControls=false] - If true, no controls are associated to the view.
     * @param {object=} [options.controls] - options for the {@link PlanarControls} associated to the view, if
     * `options.noControls` is false.
     */
    constructor(viewerDiv, extent, options = {}) {
        THREE.Object3D.DefaultUp.set(0, 0, 1);

        // If an orthographic camera is requested (by options.cameraType), the extent height is passed in options when
        // calling view constructor. Doing so allows Camera constructor (called in view constructor) to access it, and
        // set the frustrum in order to see the total extent height.
        if (options.camera && options.camera.type === CAMERA_TYPE.ORTHOGRAPHIC) {
            options.camera.orthoExtent = extent.dimensions().y;
        }
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
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        this.addLayer(tileLayer);

        const placement = options.placement || {};
        placement.coord = placement.coord || extent.center();
        placement.tilt = placement.tilt || 90;
        placement.heading = placement.heading || 0;
        placement.range = placement.range || max;

        CameraUtils.transformCameraToLookAtTarget(this, camera3D, placement);

        if (!options.noControls) {
            this.controls = new PlanarControls(this, options.controls);
        }

        this.tileLayer = tileLayer;
    }

    addLayer(layer) {
        return super.addLayer(layer, this.tileLayer);
    }
}

export default PlanarView;
