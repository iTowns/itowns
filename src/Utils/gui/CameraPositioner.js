import { CONTROL_EVENTS } from 'Controls/GlobeControls';
import { GLOBE_VIEW_EVENTS } from 'Core/Prefab/GlobeView';
import { PLANAR_CONTROL_EVENT } from 'Controls/PlanarControls';
import { VIEW_EVENTS } from 'Core/View';
import Widget from './Widget';

const DEFAULT_OPTIONS = {
    width: 200,
    height: 300,
    position: 'top-left',
};

class CameraPositioner extends Widget {
    /**
     * @param   {View}                  view                                    The iTowns view the camera-positioner should be
     * linked to. If it is a
     * {@link PlanarView} or a
     * {@link GlobeView}, the camera-positioner will be
     * automatically updated. Otherwise, user
     * will need to implement the update
     * automation using the `camera-positioner.update`
     * method.
     * @param   {Object}                [options]                               The camera-positioner optional configuration.
     * @param   {HTMLElement}           [options.parentElement=view.domElement] The parent HTML container of the div
     * which contains camera-positioner widgets.
     * @param   {number}                [options.width=200]                     The width in pixels of the camera-positioner.
     * @param   {number}                [options.height=30]                     The height in pixels of the camera-positioner.
     * @param   {string}                [options.position='bottom-left']        Defines which position within the
     * `parentElement` the camera-positioner should be
     * displayed to. Possible values are
     * `top`, `bottom`, `left`, `right`,
     * `top-left`, `top-right`, `bottom-left`
     * and `bottom-right`. If the input value
     * does not match one of these, it will
     * be defaulted to `bottom-left`.
     * @param   {Object}                [options.translate]                     An optional translation of the camera-positioner.
     * @param   {number}                [options.translate.x=0]                 The camera-positioner translation along the page
     * x-axis.
     * @param   {number}                [options.translate.y=0]                 The camera-positioner translation along the page
     * y-axis.
     */
    constructor(view, options = {}) {
        // ---------- BUILD PROPERTIES ACCORDING TO DEFAULT OPTIONS AND OPTIONS PASSED IN PARAMETERS : ----------

        super(view, options, DEFAULT_OPTIONS);

        // ---------- this.domElement SETTINGS SPECIFIC TO camera-positioner : ----------

        this.domElement.id = 'widgets-camera-positioner';

        this.view = view;

        // Initialize the text content of the camera-positioner, which will later be updated by a numerical value.
        this.domElement.innerHTML = 'Camera-positioner';
        const coordinatesInputElement = this.createInputVector(['x', 'y', 'z'], 'Coordinates', 100);
        this.domElement.appendChild(coordinatesInputElement.title);
        this.domElement.appendChild(coordinatesInputElement.inputVector);
        const rotationInputElement = this.createInputVector(['x', 'y', 'z'], 'Rotation', 100);
        this.domElement.appendChild(rotationInputElement.title);
        this.domElement.appendChild(rotationInputElement.inputVector);

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

    addEventListeners() {}

    /**
     * Update the camera-positioner size and content according to view camera position.
     */
    update() {

    }

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
}

export default CameraPositioner;
