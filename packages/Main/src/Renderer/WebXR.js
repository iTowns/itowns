import * as THREE from 'three';
import VRControls from 'Controls/VRControls';

// TODO handle xr session end
export const VR_EVENTS = {
    CONTROLS_INITIALIZED: 'vrControls-initialized',

};

function updateCamera3D(xr, view) {
    /* This is what's done in updateUserCamera the WebXRManager.js of threejs
            Update projectionMatrix, could be replaced by:
           camera.projectionMatrix.copy( cameraXR.projectionMatrix );
          camera.projectionMatrixInverse.copy( cameraXR.projectionMatrixInverse );
           But it safer to also change all the attributes, in case of another call to updateProjectionMatrix
   */

    const {
        near,
        far,
        aspect,
        fov,
    } = extractCameraAttributesFromProjectionMatrix(view._camXR.projectionMatrix);
    view.camera3D.near = near;
    view.camera3D.far = far;
    view.camera3D.aspect = aspect;
    view.camera3D.fov = fov;
    view.camera3D.zoom = 1;
    view.camera3D.updateProjectionMatrix();

    xr.getCamera()
        .getWorldPosition(view.camera3D.position);
    xr.getCamera()
        .getWorldQuaternion(view.camera3D.quaternion);


    // Update the local transformation matrix for the object itself
    view.camera3D.updateMatrix();

    // // Update the world transformation matrix, ensuring it reflects global transforms
    view.camera3D.updateMatrixWorld(true);
    view.notifyChange(view.camera3D, true);
}
// Note: WebXR cameras are perspective cameras
function extractCameraAttributesFromProjectionMatrix(projectionMatrix) {
    const m = projectionMatrix.elements;

    // Extract near and far
    const near = m[14] / (m[10] - 1);
    const far = m[14] / (m[10] + 1);

    // Extract vertical FOV
    const fovY = 2 * Math.atan(1 / m[5]); // m[5] = 1 / tan(fovY / 2)
    const fov = THREE.MathUtils.radToDeg(fovY); // Convert to degrees

    // Extract aspect ratio
    const aspect = m[5] / m[0]; // m[0] = 1 / (tan(fovY / 2) * aspect)

    return {
        near,
        far,
        aspect,
        fov,
    };
}
/**
 * @property {VRControls} vrControls - WebXR controllers handler
 * */
class WebXR extends THREE.EventDispatcher {
    /**
     * Handler of a webXR session
     *
     *
     * @param {GlobeView} view - The view where the webXR session will be started
     * @param {Object} [options] - WebXR configuration - its presence alone
     * enable WebXR to switch on VR visualization.
     * @param {function} [options.callback] - WebXR rendering callback.
     * @param {boolean} [options.controllers] - Enable the webXR controllers handling.
     */
    constructor(view, options) {
        super();
        this.view = view;
        this.options = options;
        this.renderCb = options.callback;
        this.vrControls = null;
    }

    // Start the webXR handler
    initializeWebXR = () => {
        const xr = this.view.renderer.xr;

        xr.addEventListener('sessionstart', () => {
            xr.enabled = true;

            xr.getReferenceSpace('local');

            // To avoid controllers precision issues, headset should handle camera position
            const vrHeadSet = new THREE.Object3D();
            if (__DEBUG__) { vrHeadSet.name = 'xrHeadset'; }
            this.view.scene.add(vrHeadSet);

            this.view.camera3D.getWorldPosition(vrHeadSet.position);
            this.view.camera3D.getWorldQuaternion(vrHeadSet.quaternion);
            vrHeadSet.updateMatrixWorld(true);
            vrHeadSet.add(xr.getCamera());

            // Placeholder camera to initialize correctly the vr, which needs a parent
            this.view._camXR = this.view.camera3D.clone();

            // Important to see the controllers -> maybe could be improved
            this.view._camXR.far = 2000000;
            this.view._camXR.near = 0.1;
            this.view._camXR.updateProjectionMatrix();

            vrHeadSet.add(this.view._camXR);

            this.view.notifyChange();

            if (this.options.controllers) {
                this.vrControls = new VRControls(this.view, vrHeadSet);
                this.dispatchEvent(
                    {
                        type: 'vrControls-initialized',
                    },
                );
            }

            xr.setAnimationLoop((timestamp) => {
                if (xr.isPresenting && xr.getCamera().cameras.length > 0) {
                    // TODO should be called only once, but the first values are wrong because the camL&camR weren't updated
                    updateCamera3D(xr, this.view);

                    // This will also update the controllers position
                    vrHeadSet.updateMatrixWorld(true);

                    if (this.vrControls) {
                        this.vrControls.listenGamepad();
                    }

                    if (this.renderCb) {
                        this.renderCb();
                    }
                }
                this.view.mainLoop.step(this.view, timestamp);
            });
        });
    };
}
export default WebXR;


