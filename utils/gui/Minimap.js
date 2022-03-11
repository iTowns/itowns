import Coordinates from 'Core/Geographic/Coordinates';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import PlanarView from 'Core/Prefab/PlanarView';
import { CAMERA_TYPE } from 'Renderer/Camera';
import Widget from './Widget';


const DEFAULT_OPTIONS = {
    minScale: 1 / 500000,
    maxScale: 1 / 5E8,
    zoomRatio: 1 / 30,
    width: 150,
    height: 150,
    position: 'bottom-left',
};


/**
 * A widget for minimap
 *
 * @property    {HTMLElement}   domElement      An html div containing the minimap.
 * @property    {HTMLElement}   parentElement   The parent HTML container of `this.domElement`.
 */
class Minimap extends Widget {
    /**
     * @param   {GlobeView}             view                                    The iTowns view the minimap should be
                                                                                * linked to. Only {@link GlobeView} is
                                                                                * supported at the moment.
     * @param   {ColorLayer}            layer                                   The {@link ColorLayer} that should be
                                                                                * displayed on the minimap.
     * @param   {Object}                [options]                               The minimap optional configuration.
     * @param   {HTMLElement}           [options.parentElement=view.domElement] The parent HTML container of the div
                                                                                * which contains minimap widgets.
     * @param   {number}                [options.size]                          The size of the minimap. It is a number
                                                                                * that describing both width and height
                                                                                * in pixels of the minimap.
     * @param   {number}                [options.width=150]                     The width in pixels of the minimap.
     * @param   {number}                [options.height=150]                    The height in pixels of the minimap.
     * @param   {string}                [options.position='bottom-left']        Defines which corner of the
                                                                                * `parentElement` the minimap should be
                                                                                * displayed to. Possible values are
                                                                                * `top-left`, `top-right`, `bottom-left`
                                                                                * and `bottom-right`. If the input value
                                                                                * does not match one of these, it will
                                                                                * be defaulted to `bottom-left`.
     * @param   {Object}                [options.translate]                     An optional translation of the minimap.
     * @param   {number}                [options.translate.x=0]                 The minimap translation along the page
                                                                                * x-axis.
     * @param   {number}                [options.translate.y=0]                 The minimap translation along the page
                                                                                * y-axis.
     * @param   {HTMLElement|string}    [options.cursor]                        An html element or an HTML string
                                                                                * describing a cursor showing minimap
                                                                                * view camera target position at the
                                                                                * center of the minimap.
     * @param   {number}                [options.minScale=1/2000]               The minimal scale the minimap can reach.
     * @param   {number}                [options.maxScale=1/1_250_000]          The maximal scale the minimap can reach.
     * @param   {number}                [options.zoomRatio=1/30]                The ratio between minimap camera zoom
                                                                                * and view camera zoom.
     * @param   {number}                [options.pitch=0.28]                    The screen pixel pitch, used to compute
                                                                                * view and minimap scale.
     */
    constructor(view, layer, options = {}) {
        // ---------- BUILD PROPERTIES ACCORDING TO DEFAULT OPTIONS AND OPTIONS PASSED IN PARAMETERS : ----------

        if (!view.isGlobeView) {
            throw new Error(
                '\'Minimap\' plugin only supports \'GlobeView\'. Therefore, the \'view\' parameter must be a ' +
                '\'GlobeView\'.',
            );
        }
        if (!layer.isColorLayer) {
            throw new Error('\'layer\' parameter form \'Minimap\' constructor should be a \'ColorLayer\'.');
        }

        super(view, options, DEFAULT_OPTIONS);

        this.minScale = options.minScale || DEFAULT_OPTIONS.minScale;
        this.maxScale = options.maxScale || DEFAULT_OPTIONS.maxScale;

        // TODO : it could be interesting to be able to specify a method as zoomRatio parameter. This method could
        //  return a zoom ratio from the scale of the minimap.
        this.zoomRatio = options.zoomRatio || DEFAULT_OPTIONS.zoomRatio;


        // ---------- this.domElement SETTINGS SPECIFIC TO MINIMAP : ----------

        this.domElement.id = 'widgets-minimap';

        // Display a cursor at the center of the minimap, if requested.
        if (options.cursor) {
            // Wrap cursor domElement inside a div to center it in minimap.
            const cursorWrapper = document.createElement('div');
            cursorWrapper.id = 'cursor-wrapper';
            this.domElement.appendChild(cursorWrapper);

            // Add specified cursor to its wrapper.
            if (typeof options.cursor === 'string') {
                cursorWrapper.innerHTML = options.cursor;
            } else if (options.cursor instanceof HTMLElement) {
                cursorWrapper.appendChild(options.cursor);
            }
        }



        // ---------- CREATE A MINIMAP View AND DISPLAY DATA PASSED IN Layer PARAMETER : ----------

        this.view = new PlanarView(this.domElement, layer.source.extent, {
            camera: { type: CAMERA_TYPE.ORTHOGRAPHIC },
            placement: layer.source.extent,  // TODO : the default placement should be the view extent for ortho camera
            noControls: true,
            maxSubdivisionLevel: view.tileLayer.maxSubdivisionLevel,
        });
        this.view.addLayer(layer);  // TODO : should this promise be returned by constructor so that user can use it ?

        // Give the focus back to the main view. Indeed, `View` constructor takes the focus, and we don't want the focus
        // on the latest created `View`, which is the minimap view.
        view.domElement.focus();
        // Prevent the minimap domElement to get focus when clicked, and prevent click event to be propagated to the
        // main view controls.
        this.domElement.addEventListener('pointerdown', (event) => {
            event.preventDefault();
        });

        // Store minimap view camera3D in constant for code convenience.
        const camera3D = this.view.camera.camera3D;



        // ---------- UPDATE MINIMAP VIEW WHEN UPDATING THE MAIN VIEW : ----------

        // The minimal and maximal value the minimap camera3D zoom can reach in order to stay in the scale limits.
        const initialScale = this.view.getScale(options.pitch);
        const minZoom = camera3D.zoom * this.maxScale / initialScale;
        const maxZoom = camera3D.zoom * this.minScale / initialScale;

        // Coordinates used to transform position vectors from the main view CRS to the minimap view CRS.
        const mainViewCoordinates = new Coordinates(view.referenceCrs);
        const viewCoordinates = new Coordinates(this.view.referenceCrs);

        const targetPosition = view.controls.getCameraTargetPosition();

        view.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, () => {
            // Update minimap camera zoom
            const distance = view.camera.camera3D.position.distanceTo(targetPosition);
            const scale = view.getScaleFromDistance(options.pitch, distance);
            camera3D.zoom = this.zoomRatio * maxZoom * scale / this.minScale;
            camera3D.zoom = Math.min(Math.max(camera3D.zoom, minZoom), maxZoom);
            camera3D.updateProjectionMatrix();

            // Update minimap camera position.
            mainViewCoordinates.setFromVector3(view.controls.getCameraTargetPosition());
            mainViewCoordinates.as(this.view.referenceCrs, viewCoordinates);

            camera3D.position.x = viewCoordinates.x;
            camera3D.position.y = viewCoordinates.y;
            camera3D.updateMatrixWorld(true);

            this.view.notifyChange(camera3D);
        });
    }
}


export default Minimap;
