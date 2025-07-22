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
     */
    constructor(viewerDiv, extent, options = {}) {
        THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

        // Setup View
        super(extent.crs, viewerDiv, options);
        this.isPlanarView = true;

        // Configure camera
        const dim = extent.planarDimensions();
        const max = Math.max(dim.x, dim.y);
        this.camera3D.near = 0.1;
        this.camera3D.far = this.camera3D.isOrthographicCamera ? 2000 : 2 * max;
        this.camera3D.updateProjectionMatrix();

        const tileLayer = new PlanarLayer('planar', extent, options.object3d, options);
        this.mainLoop.gfxEngine.label2dRenderer.infoTileLayer = tileLayer.info;

        this.addLayer(tileLayer);

        this.addEventListener(VIEW_EVENTS.CAMERA_MOVED, () => {
            // update camera's near and far

            const obj = tileLayer.object3d;
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

            this.camera3D.far = Math.sqrt(maxDistSq);

            const closestPoint = new THREE.Vector3();
            box.clampPoint(camPos, closestPoint);
            this.camera3D.near = Math.max(1, closestPoint.distanceToSquared(camPos) /
                this.camera3D.far);

            this.camera3D.updateProjectionMatrix();

            const fog = this.scene.fog;
            if (!fog) { return; }
            fog.far = this.camera3D.far;
            fog.near = fog.far - this.fogSpread * (fog.far - this.camera3D.near);
        });

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

        this.fogSpread = options.fogSpread ?? 0.5;
    }

    addLayer(layer) {
        return super.addLayer(layer, this.tileLayer);
    }
}

export default PlanarView;
