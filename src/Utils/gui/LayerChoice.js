import CameraUtils from 'Utils/CameraUtils';
import Widget from './Widget';

import Coordinates from '../../Core/Geographic/Coordinates';

const DEFAULT_OPTIONS = {
    width: 200,
    height: 'fit-content',
    position: 'top-left',
};

/**
 * example path : "/examples/widgets_layer_choice.html"
 *
 * @extends Widget
 *
 * @property {HTMLElement} domElement An html div containing the minimap.
 */
class LayerChoice extends Widget {
    /**
     * It creates a new layer-choice widget, which is a div element that contains a list of color layers,
     * elevation layers, and geometry layers
     * @param {View} view - the view object of the scene
     * @param {Object} [config] - an object containing the configuration of the widget.
     * @param {Object} [options] - the options object passed in the constructor.
     */
    constructor(view, config = {}, options = {}) {
        // ---------- BUILD PROPERTIES ACCORDING TO DEFAULT OPTIONS AND OPTIONS PASSED IN PARAMETERS : ----------

        super(view, options, DEFAULT_OPTIONS);

        // ---------- this.domElement SETTINGS SPECIFIC TO layer-choice : ----------

        this.domElement.id = 'widgets-layer-choice';

        this.view = view;

        // Initialize the text content of the layer-choice, which will later be updated by a numerical value.
        this.domElement.innerHTML = 'Layer Choice';

        this.rangeFocus = config.rangeFocus || null;
        this.tiltFocus = config.tiltFocus || 60;

        this.width = options.width || DEFAULT_OPTIONS.width;
        this.height = options.height || DEFAULT_OPTIONS.height;
        this.updateUI();
    }

    /**
    * This function creates the UI for the widget
    */
    updateUI() {
        this.domElement.appendChild(this.initContentColorLayers());
        this.domElement.appendChild(this.initContentElevationLayers());
        this.domElement.appendChild(this.initContentGeometryLayers());
    }

    // Create the description part of ColorLayers
    initContentColorLayers() {
        const html = document.createElement('div');
        const titleColorLayers = document.createElement('h3');
        titleColorLayers.innerHTML = 'Color Layers : ';
        html.appendChild(titleColorLayers);

        const list = document.createElement('div');

        const layers = this.view.getLayers(layer => layer.isColorLayer);
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const divLayer = document.createElement('div');
            divLayer.innerHTML = layer.id;

            const labelVisible = document.createElement('label');
            labelVisible.innerHTML = ' Visible : ';
            divLayer.appendChild(labelVisible);
            const inputVisibleCheckbox = document.createElement('input');
            inputVisibleCheckbox.type = 'checkbox';
            inputVisibleCheckbox.checked = layer.visible;
            divLayer.appendChild(inputVisibleCheckbox);

            const labelInputOpactity = document.createElement('label');
            labelInputOpactity.innerHTML = ' Opacity : ';
            divLayer.appendChild(labelInputOpactity);
            const inputOpacity = document.createElement('input');
            inputOpacity.type = 'number';
            inputOpacity.id = `opacity_${i}`;
            inputOpacity.min = 0;
            inputOpacity.max = 1;
            inputOpacity.step = 0.05;
            inputOpacity.value = layer.opacity;
            divLayer.appendChild(inputOpacity);

            inputVisibleCheckbox.onchange = (event) => {
                layer.visible = event.target.checked;
                this.view.notifyChange();
            };

            inputOpacity.oninput = (event) => {
                layer.opacity = event.target.valueAsNumber;
                this.view.notifyChange();
            };

            list.appendChild(divLayer);
        }
        html.appendChild(list);

        return html;
    }

    // Create the description part of ElevationLayers
    initContentElevationLayers() {
        const html = document.createElement('div');
        const titleElevationLayers = document.createElement('h3');
        titleElevationLayers.innerHTML = 'Elevation Layers : ';
        html.appendChild(titleElevationLayers);

        const list = document.createElement('div');
        const layers = this.view.getLayers(layer => layer.isElevationLayer);
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const divLayer = document.createElement('div');

            divLayer.innerHTML = layer.id;

            const labelScale = document.createElement('label');
            labelScale.innerHTML = ' Scale : ';
            divLayer.appendChild(labelScale);
            const spanScale = document.createElement('span');
            spanScale.innerHTML = layer.scale;
            labelScale.appendChild(spanScale);

            const inputScale = document.createElement('input');
            inputScale.type = 'number';
            inputScale.min = 0;
            inputScale.max = 10;
            inputScale.step = 0.1;
            inputScale.value = layer.scale;
            divLayer.appendChild(inputScale);

            inputScale.oninput = (event) => {
                layer.scale = event.target.valueAsNumber;
                this.view.notifyChange();
                spanScale.innerHTML = layer.scale;
            };
            list.appendChild(divLayer);
        }
        html.appendChild(list);

        return html;
    }

    // Create the description part of GeometryLayers
    initContentGeometryLayers() {
        const html = document.createElement('div');
        const titleGeometryLayers = document.createElement('h3');
        titleGeometryLayers.innerHTML = 'Geometry Layers : ';
        html.appendChild(titleGeometryLayers);

        const divCheckAll = document.createElement('div');
        const labelCheckAll = document.createElement('label');
        labelCheckAll.innerHTML = 'Check All : ';
        divCheckAll.appendChild(labelCheckAll);

        const inputCheckAllCheckbox = document.createElement('input');
        inputCheckAllCheckbox.type = 'checkbox';
        inputCheckAllCheckbox.checked = true;
        divCheckAll.appendChild(inputCheckAllCheckbox);
        html.appendChild(divCheckAll);

        const layers = this.view.getLayers(layer => layer.isGeometryLayer);
        const list = document.createElement('div');
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];

            const divLayer = document.createElement('div');
            divLayer.innerHTML = layer.id;

            const divLayerVisibility = document.createElement('span');
            const inputLayerVisibilityCheckbox =
                document.createElement('input');
            inputLayerVisibilityCheckbox.type = 'checkbox';
            inputLayerVisibilityCheckbox.checked = layer.visible;

            inputLayerVisibilityCheckbox.onclick = (event) => {
                layer.visible = event.target.checked;
                this.view.notifyChange();
            };

            const focusButton = this.createFocusButton(layer);

            divLayerVisibility.appendChild(inputLayerVisibilityCheckbox);
            divLayerVisibility.appendChild(focusButton);
            divLayer.appendChild(divLayerVisibility);
            list.appendChild(divLayer);
        }

        inputCheckAllCheckbox.onclick = (event) => {
            for (const inputCheckbox of list.getElementsByTagName('input')) {
                inputCheckbox.checked = event.target.checked;
                inputCheckbox.dispatchEvent(new Event('click'));
            }
        };

        html.appendChild(list);

        return html;
    }

    /**
     * It creates a button that, when clicked, will animate the camera to look at the center of the layer's
     * extent
     * @param {Layer} layer - the layer to focus on
     * @returns {HTMLButtonElement} A button that will focus the camera on the layer.
     */
    createFocusButton(layer) {
        const focusButton = document.createElement('button');
        focusButton.innerHTML = 'Focus';
        const _this = this;
        focusButton.addEventListener('click', () => {
            const view = _this.view;
            const camera = view.camera.camera3D;

            const coord = new Coordinates(
                view.referenceCrs,
                layer.extent.center(),
            );

            const range =
                _this.rangeFocus ||
                Math.max(
                    Math.abs(layer.extent.west - layer.extent.east),
                    Math.abs(layer.extent.north - layer.extent.south),
                );

            const params = {
                coord,
                range,
                tilt: _this.tiltFocus,
            };

            CameraUtils.animateCameraToLookAtTarget(view, camera, params);
        });
        return focusButton;
    }
}

export default LayerChoice;
