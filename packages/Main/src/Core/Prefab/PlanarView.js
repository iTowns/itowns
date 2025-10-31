import * as THREE from 'three';

import View, { VIEW_EVENTS } from 'Core/View';
import CameraUtils from 'Utils/CameraUtils';

import PlanarControls from 'Controls/PlanarControls';
import PlanarLayer from './Planar/PlanarLayer';

class PlanarView extends View {
    /**
     * @extends View
     *
     * @example <caption><b>Instance with placement on the ground.</b></caption>
     * var viewerDiv = document.getElementById('viewerDiv');
     * const extent = new Extent('EPSG:3946', 1837816.94334, 1847692.32501, 5170036.4587, 5178412.82698);
     * var view = new itowns.PlanarView(viewerDiv, extent, { placement: { heading: -49.6, range: 6200, tilt: 17 } });
     *
     * @param {HTMLDivElement} viewerDiv - Where to attach the view and display it
     * in the DOM.
     * @param {Extent} extent - The ground extent.
     * @param {Object} [options] - See options of {@link View}.
     * @param {boolean} [options.noControls=false] - If true, no controls are associated to the view.
     * @param {Object} [options.controls] - options for the {@link PlanarControls} associated to the view, if
     * `options.noControls` is false.
     * @param {CameraUtils~CameraTransformOptions|Extent} [options.placement] - The
     * {@link CameraUtils~CameraTransformOptions} to apply to view's camera or the extent it must display at
     * initialization. By default, camera will display the view's extent (given in `extent` parameter).
     * @param {boolean} [options.dynamicCameraNearFar=true] - The camera's near and far are automatically adjusted.
     * @param {number} [options.farFactor=20] - Controls how far the camera can see.
     * The maximum view distance is this factor times the camera’s altitude (above sea level).
     * @param {number} [options.fogSpread=0.5] - Proportion of the visible depth range that contains fog.
     *  Between 0 and 1.
     */
    constructor(viewerDiv, extent, options = {}) {
        THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

        // Setup View
        super(extent.crs, viewerDiv, options);
        this.isPlanarView = true;

        // Configure camera
        const dim = extent.planarDimensions();
        const max = Math.max(dim.x, dim.y);

        const tileLayer = new PlanarLayer('planar', extent, options.object3d, options);
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        this.addLayer(tileLayer);

        if (options.dynamicCameraNearFar || options.dynamicCameraNearFar === undefined) {
            this.addEventListener(VIEW_EVENTS.CAMERA_MOVED, () => {
                // update camera's near and far

                // compute layer's bounding box
                if (!this.tileLayer) { return; }
                const obj = this.tileLayer.object3d;
                const box = new THREE.Box3();
                obj.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        child.geometry.computeBoundingBox();
                        const childBox = new THREE.Box3().copy(child.geometry.boundingBox)
                            .applyMatrix4(child.matrixWorld);
                        box.union(childBox);
                    }
                });
                if (box.isEmpty()) { return; }

                // calculate the greatest distance to the corners of the box
                let maxDistSq = 0;
                const camPos = this.camera3D.position;
                for (const x of [box.min.x, box.max.x]) {
                    for (const y of [box.min.y, box.max.y]) {
                        for (const z of [box.min.z, box.max.z]) {
                            const distSq = camPos.distanceToSquared({ x, y, z });
                            if (distSq > maxDistSq) {
                                maxDistSq = distSq;
                            }
                        }
                    }
                }
                const maxDist = Math.sqrt(maxDistSq);

                const camToGroundDistMin = this.camera3D.position.z - View.ALTITUDE_MAX;
                this.camera3D.near = Math.max(1, camToGroundDistMin * this.fovDepthFactor);

                const boxBottomToCam = camPos.z - box.min.z;
                const far = this.farFactor * boxBottomToCam;
                this.camera3D.far = Math.min(far, maxDist);
                this.camera3D.updateProjectionMatrix();

                const fog = this.scene.fog;
                if (!fog) { return; }
                fog.far = far;
                fog.near = fog.far - this.fogSpread * (fog.far - this.camera3D.near);
            });
        }

        // Configure camera
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

        this.tileLayer = tileLayer;

        this.farFactor = options.farFactor ?? 20;
        this.fogSpread = options.fogSpread ?? 0.5;
        this.scene.fog = new THREE.Fog(0xe2edff, 1, 1000); // default fog
    }

    addLayer(layer) {
        const p = super.addLayer(layer, this.tileLayer);
        p.then(() => {
            this.dispatchEvent({ type: VIEW_EVENTS.CAMERA_MOVED });
        });
        return p;
    }
}

export default PlanarView;
