import { CONTROL_EVENTS } from 'Controls/GlobeControls';
import { GLOBE_VIEW_EVENTS } from 'Core/Prefab/GlobeView';
import { PLANAR_CONTROL_EVENT } from 'Controls/PlanarControls';
import { VIEW_EVENTS } from 'Core/View';
import Widget from './Widget';


const DEFAULT_OPTIONS = {
    width: 200,
    height: 30,
    position: 'bottom-left',
};


/**
 * A widget for scale
 *
 * @extends Widget
 *
 * @property    {HTMLElement}   domElement      An html div containing the scale.
 * @property    {HTMLElement}   parentElement   The parent HTML container of `this.domElement`.
 */
class Scale extends Widget {
    /**
     * @param   {View}                  view                                    The iTowns view the scale should be
                                                                                * linked to. If it is a
                                                                                * {@link PlanarView} or a
                                                                                * {@link GlobeView}, the scale will be
                                                                                * automatically updated. Otherwise, user
                                                                                * will need to implement the update
                                                                                * automation using the `Scale.update`
                                                                                * method.
     * @param   {Object}                [options]                               The scale optional configuration.
     * @param   {HTMLElement}           [options.parentElement=view.domElement] The parent HTML container of the div
                                                                                * which contains scale widgets.
     * @param   {number}                [options.width=200]                     The width in pixels of the scale.
     * @param   {number}                [options.height=30]                     The height in pixels of the scale.
     * @param   {string}                [options.position='bottom-left']        Defines which position within the
                                                                                * `parentElement` the scale should be
                                                                                * displayed to. Possible values are
                                                                                * `top`, `bottom`, `left`, `right`,
                                                                                * `top-left`, `top-right`, `bottom-left`
                                                                                * and `bottom-right`. If the input value
                                                                                * does not match one of these, it will
                                                                                * be defaulted to `bottom-left`.
     * @param   {Object}                [options.translate]                     An optional translation of the scale.
     * @param   {number}                [options.translate.x=0]                 The scale translation along the page
                                                                                * x-axis.
     * @param   {number}                [options.translate.y=0]                 The scale translation along the page
                                                                                * y-axis.
     */
    constructor(view, options = {}) {
        // ---------- BUILD PROPERTIES ACCORDING TO DEFAULT OPTIONS AND OPTIONS PASSED IN PARAMETERS : ----------

        super(view, options, DEFAULT_OPTIONS);



        // ---------- this.domElement SETTINGS SPECIFIC TO SCALE : ----------

        this.domElement.id = 'widgets-scale';

        this.view = view;

        // Initialize the text content of the scale, which will later be updated by a numerical value.
        this.domElement.innerHTML = 'Scale';

        this.width = options.width || DEFAULT_OPTIONS.width;

        if (this.view.isGlobeView) {
            this.view.addEventListener(GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, () => {
                this.update();
            });
            this.view.controls.addEventListener(CONTROL_EVENTS.RANGE_CHANGED, () => {
                this.update();
            });
        } else if (this.view.isPlanarView) {
            this.view.addEventListener(VIEW_EVENTS.INITIALIZED, () => {
                this.update();
            });
            this.view.addEventListener(PLANAR_CONTROL_EVENT.MOVED, () => {
                this.update();
            });
        } else {
            console.warn(
                'The \'view\' linked to scale widget is neither a \'GlobeView\' nor a \'PlanarView\'. The ' +
                'scale wont automatically update. You can implement its update automation using \'Scale.update\' ' +
                'method.',
            );
        }
    }

    addEventListeners() {

    }

    /**
     * Update the scale size and content according to view camera position.
     */
    update() {
        // Calculate the rounded metric distance which matches the scale width in pixels.
        let metricDistance = Math.round(this.view.getPixelsToMeters(this.width));

        const digit = 10 ** (metricDistance.toString().length - 1);
        metricDistance = Math.round(metricDistance / digit) * digit;

        const pixelDistance = this.view.getMetersToPixels(metricDistance);

        let unit = 'm';
        if (metricDistance >= 1000) {
            metricDistance /= 1000;
            unit = 'km';
        }

        this.domElement.innerHTML = `${metricDistance} ${unit}`;
        this.domElement.style.width = `${pixelDistance}px`;
    }
}


export default Scale;
