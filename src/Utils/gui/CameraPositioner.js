import { CONTROL_EVENTS } from 'Controls/GlobeControls';
import { GLOBE_VIEW_EVENTS } from 'Core/Prefab/GlobeView';
import { PLANAR_CONTROL_EVENT } from 'Controls/PlanarControls';
import { VIEW_EVENTS } from 'Core/View';
import * as THREE from 'three';
import Widget from './Widget';


const DEFAULT_OPTIONS = {
    width: 200,
    height: 300,
    position: 'top-left',
};

class CameraPositioner extends Widget {
    constructor(view, options = {}) {
        // ---------- BUILD PROPERTIES ACCORDING TO DEFAULT OPTIONS AND OPTIONS PASSED IN PARAMETERS : ----------

        super(view, options, DEFAULT_OPTIONS);

        // ---------- this.domElement SETTINGS SPECIFIC TO camera-positioner : ----------

        this.domElement.id = 'widgets-camera-positioner';

        this.view = view;

        // Initialize the text content of the camera-positioner, which will later be updated by a numerical value.
        this.domElement.innerHTML = 'Camera-positioner';
        const coordinatesInputElement = this.createInputVector(
            ['x', 'y', 'z'],
            'Coordinates',
            100,
        );
        this.domElement.appendChild(coordinatesInputElement.title);
        this.domElement.appendChild(coordinatesInputElement.inputVector);
        const rotationInputElement = this.createInputVector(
            ['x', 'y', 'z'],
            'Rotation',
            100,
        );

        this.domElement.appendChild(rotationInputElement.title);
        this.domElement.appendChild(rotationInputElement.inputVector);

        const travelButton = document.createElement('button');
        travelButton.innerHTML = 'TRAVEL';
        const _this = this;
        travelButton.onclick = function () {
            const newCameraCoordinates = _this.inputVectorToVector(coordinatesInputElement.inputVector);
            console.log('Coordinates: ', newCameraCoordinates);
            const newCameraRotation = _this.inputVectorToVector(rotationInputElement.inputVector);
            console.log('Rotation: ', newCameraRotation);
            const newCameraQuaternion = new THREE.Quaternion();
            newCameraQuaternion.setFromEuler(new THREE.Euler(newCameraRotation.x, newCameraRotation.y, newCameraRotation.z), 'XYZ');
            console.log('Quaternion: ', newCameraQuaternion);
            view.controls.initiateTravel(newCameraCoordinates, 'auto', newCameraQuaternion, true);
        };
        this.domElement.appendChild(travelButton);


        this.width = options.width || DEFAULT_OPTIONS.width;

        if (this.view.isGlobeView) {
            this.view.addEventListener(
                GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED,
                () => {
                    this.update();
                },
            );
            this.view.controls.addEventListener(
                CONTROL_EVENTS.RANGE_CHANGED,
                () => {
                    this.update();
                },
            );
        } else if (this.view.isPlanarView) {
            this.view.addEventListener(VIEW_EVENTS.INITIALIZED, () => {
                this.update();
            });
            this.view.addEventListener(PLANAR_CONTROL_EVENT.MOVED, () => {
                this.update();
            });
        } else {
            console.warn(
                "The 'view' linked to camera-positioner widget is neither a 'GlobeView' nor a 'PlanarView'. The " +
                "camera-positioner wont automatically update. You can implement its update automation using 'camera-positioner.update' " +
                'method.',
            );
        }
    }

    addEventListeners() { }

    /**
     * Update the camera-positioner size and content according to view camera position.
     */
    update() { }

    /**
     * @param {Array.String} labels List of labels name
     * @param {String} vectorName Name of the vector
     * @param {number} step The step of HTMLElement input (type number)
     * @returns {Object} title => HTMLElement 'h3' ; inputVector => HTMLElement 'div' contains labels and inputs HTMLElements
     */
    createInputVector(labels, vectorName, step = 0.5) {
        const titleVector = document.createElement('h3');
        titleVector.innerHTML = vectorName;

        const inputVector = document.createElement('div');
        inputVector.id = `${vectorName}_inputVector`;
        inputVector.style.display = 'grid';
        for (let iInput = 0; iInput < labels.length; iInput++) {
            const labelElement = document.createElement('label');
            labelElement.innerHTML = labels[iInput];

            const componentElement = document.createElement('input');
            componentElement.id = vectorName + labelElement.innerHTML;
            componentElement.type = 'number';
            componentElement.setAttribute('value', '0');
            componentElement.step = step;

            labelElement.htmlFor = componentElement.id;

            inputVector.appendChild(labelElement);
            inputVector.appendChild(componentElement);
        }
        return {
            title: titleVector,
            inputVector,
        };
    }

    /**
     * It takes a vector input element and returns a vector object
     * @param {HTMLElement} inputVector  - The HTML element that contains the input elements.
     * @returns {THREE.Vector} A vector of the values of the input elements.
     */
    inputVectorToVector(inputVector) {
        const inputEls = inputVector.getElementsByTagName('input');

        const countEls = inputEls.length;

        switch (countEls) {
            case 2:
                return new THREE.Vector2(inputEls[0].value, inputEls[1].value);
            case 3:
                return new THREE.Vector3(
                    inputEls[0].value,
                    inputEls[1].value,
                    inputEls[2].value,
                );
            case 4:
                return new THREE.Vector4(
                    inputEls[0].value,
                    inputEls[1].value,
                    inputEls[2].value,
                    inputEls[3].value,
                );
            default: return null;
        }
    }
}

export default CameraPositioner;
