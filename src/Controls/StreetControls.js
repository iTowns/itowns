import * as THREE from 'three';
import FirstPersonControls from 'Controls/FirstPersonControls';
import AnimationPlayer, { AnimatedExpression } from 'Core/AnimationPlayer';

// Expression used to damp camera's moves
function moveCameraExp(root, progress) {
    const dampingProgress = 1 - Math.pow((1 - (Math.sin((progress - 0.5) * Math.PI) * 0.5 + 0.5)), 2);
    root.camera.position.lerpVectors(root.positionFrom, root.positionTo, dampingProgress);
}
/**
 * @classdesc Camera controls that can follow a path.
 * It is used to simulate a street view.
 * It stores a currentPosition and nextPosition, and do a camera traveling to go to next position.
 *
 * <ul> Bindings inherited from FirstPersonControls
 * <li><b> up + down keys : </b> forward/backward </li>
 * <li><b> left + right keys: </b> strafing movements </li>
 * <li><b> pageUp + pageDown: </b> vertical movements </li>
 * <li><b> mouse click+drag: </b> pitch and yaw movements (as looking at a panorama) </li>
 * </ul>
 * <ul> Bindings added
 * <li><b> keys Z : </b> Move camera to the next position </li>
 * </ul>
 * @extends FirstPersonControls
 */
class StreetControls extends FirstPersonControls {
    /**
     * @constructor
     * @param { View } view - View where this control will be used
     * @param { Object } options - Configuration of this controls
     * @param { number } options.animationDuration - Duration of the animation to another panoramic.
     */
    constructor(view, options = {}) {
        super(view, options);

        this.isStreetControls = true;

        // store layers
        this.layers = [];
        this.currentLayerIndex = 0;

        // manage camera movements
        this.player = new AnimationPlayer();
        this.positionFrom = new THREE.Vector3();
        this.animationMoveCamera = new AnimatedExpression({
            duration: options.animationDuration || 50,
            root: this,
            expression: moveCameraExp,
            name: 'Move camera',
        });
        this.player.addEventListener('animation-frame', this.updateView.bind(this));

        // twos positions used by this control : current and next
        this.currentPosition = undefined;
        this.nextPosition = undefined;
    }

    setCurrentPosition(newCurrentPosition) {
        this.currentPosition = newCurrentPosition;
    }

    setNextPosition(newNextPosition) {
        this.nextPosition = newNextPosition;
    }

    /**
     * Sets the camera to the current position, looking at the next position.
     */
    setCameraToCurrentPosition() {
        this.setCameraOnPosition(this.currentPosition, this.nextPosition);
    }

    /**
     * Set the camera on a position, looking at another position.
     *
     * @param      { THREE.Vector3 }  position   The position to set the camera
     * @param      { THREE.Vector3 }  lookAt      The position where the camera look at.
     */
    setCameraOnPosition(position, lookAt) {
        if (!position || !lookAt) {
            return;
        }
        this.camera.position.copy(position);
        this.camera.up.copy(position).normalize();
        this.camera.lookAt(lookAt);
        this.camera.updateMatrixWorld();
        this.reset();
    }

    /**
     * Move the camera
     *
     * @param { THREE.Vector3 }  positionTo  Destination of the movement.
     */
    moveCameraTo(positionTo) {
        this.positionFrom.copy(this.camera.position);
        this.positionTo = positionTo;
        this.player.play(this.animationMoveCamera);
    }

    onKeyDown(e) {
        super.onKeyDown(e);
        if (e.keyCode == 90) {
            this.moveCameraTo(this.nextPosition);
        }
    }

    updateView() {
        this.view.notifyChange(this.camera);
    }
}

export default StreetControls;
