import * as THREE from 'three';

import View from 'Core/View';
import CameraUtils from 'Utils/CameraUtils';

import PlanarControls from 'Controls/PlanarControls';
import PlanarLayer from './Planar/PlanarLayer';

class PlanarView extends View {
    /**
     * @constructor
     * @extends View
     *
     * @example <caption><b>Instance with placement on the ground.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * const extent = new Extent('EPSG:3946', 1837816.94334, 1847692.32501, 5170036.4587, 5178412.82698);
     * var view = new itowns.PlanarView(viewerDiv, extent, { placement: { heading: -49.6, range: 6200, tilt: 17 } });
     *
     * @param {HTMLDivElement} viewerDiv - Where to attach the view and display it
     * in the DOM.
     * @param {object=} options - See options of {@link View}.
     * @param {Extent} options.extent - The ground extent.
     * @param {boolean} [options.noControls=false] - If true, no controls are associated to the view.
     * @param {object=} [options.controls] - options for the {@link PlanarControls} associated to the view, if
     * `options.noControls` is false.
     * @param {CameraUtils~CameraTransformOptions|Extent} [options.placement] - The
     * {@link CameraUtils~CameraTransformOptions} to apply to view's camera or the extent it must display at
     * initialization. By default, camera will display the view's extent (given in `extent` parameter).
     */
    constructor(viewerDiv, options = {}) {
        THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

        if (arguments.length > 2 || options.isExtent) {
            console.warn("Deprecated: change in arguments, 'extent' should be set in options");
            // eslint-disable-next-line prefer-rest-params
            const [, ext, opt = {}] = arguments;
            opt.extent = ext;
            options = opt;
        }
        const extent = options.extent;

        // Setup View
        super(extent.crs, viewerDiv, options);
        this.isPlanarView = true;

        const tileLayer = new PlanarLayer('planar', extent, options.object3d, options);
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        this.addLayer(tileLayer);
        this.tileLayer = tileLayer;

        // Configure camera
        const dim = extent.planarDimensions();
        const max = Math.max(dim.x, dim.y);
        this.camera3D.near = 0.1;
        this.camera3D.far = this.camera3D.isOrthographicCamera ? 2000 : 2 * max;
        this.camera3D.updateProjectionMatrix();

        const placement = options.placement || {};
        if (!placement.isExtent) {
            placement.coord = placement.coord || extent.center();
            placement.tilt = placement.tilt || 90;
            placement.heading = placement.heading || 0;
            placement.range = placement.range || max;
        }
        CameraUtils.transformCameraToLookAtTarget(this, this.camera3D, placement);

        if (!options.noControls) {
            this.controls = new PlanarControls(this, options.controls);
        }
    }

    addLayer(layer) {
        return super.addLayer(layer, this.tileLayer);
    }
}

export default PlanarView;
