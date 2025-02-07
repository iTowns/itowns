import { VIEW_EVENTS } from 'itowns';
import Widget from './Widget';


const DEFAULT_OPTIONS = {
    displayCompass: true,
    display3DToggle: true,
    displayZoomIn: true,
    displayZoomOut: true,
    animationDuration: 500,
    position: 'bottom-left',
    direction: 'column',
};


const DEFAULT_BUTTONS = {
    compass: {
        id: 'compass',
        content: '',
        info: 'Rotate the camera to face North',
        parentId: 'widgets',
    },
    toggle3D: {
        id: '3d-button',
        content: '3D',
        info: 'Tilt the camera',
    },
    zoomIn: {
        id: 'zoom-in-button',
        content: '<span class="widget-zoom-button-logo"></span>',
        info: 'Zoom in',
        parentId: 'zoom-button-bar',
    },
    zoomOut: {
        id: 'zoom-out-button',
        content: '<span id="zoom-out-logo" class="widget-zoom-button-logo"></span>',
        info: 'Zoom out',
        parentId: 'zoom-button-bar',
    },
};


/**
 * A widget menu manager for navigation.
 *
 * To use it, you need to link the widgets' stylesheet to your html webpage. This stylesheet is included in
 * [itowns bundles](https://github.com/iTowns/itowns/releases) if you downloaded them, or it can be found in
 * `node_modules/itowns/examples/css` if you installed iTowns with npm. Otherwise, it can be found at
 * [this link](https://raw.githubusercontent.com/iTowns/itowns/master/examples/css/widgets.css). See
 * [this example](http://www.itowns-project.org/itowns/examples/#widgets_navigation) for more details.
 *
 * @extends Widget
 *
 * @property {HTMLElement}          domElement      An html div containing all navigation widgets.
 * @property {HTMLElement}          parentElement   The parent HTML container of `this.domElement`.
 * @property {HTMLButtonElement}    compass         The HTML button for the compass.
 * @property {HTMLButtonElement}    toggle3D        The HTML button for the 3D/2D toggle button.
 * @property {HTMLButtonElement}    zoomIn          The HTML button for the zoom-in button.
 * @property {HTMLButtonElement}    zoomOut         The HTML button for the zoom-out button.
 *
 * @example
 * // Create a Navigation widget in the bottom-right corner of an iTowns view domElement
 * const navigation = new Navigation(view, { position: 'bottom-right' };
 *
 * // Change the tooltip for the compass :
 * navigation.compass.title = 'new tooltip';
 *
 * // Change the method ran when clicking zoom-in button :
 * function newMethod() {
 *     // do something
 * }
 * navigation.zoomIn.onclick = newMethod;
 */
class Navigation extends Widget {
    #_view;

    #_action(params) {
        params.time = this.animationDuration;
        return this.#_view.controls.lookAtCoordinate(params);
    }

    #_addDefaultButton(settings, onclick) {
        return this.addButton(settings.id, settings.content, settings.info, onclick, settings.parentId);
    }


    /**
     * @param   {GlobeView}     view                                    The iTowns view the navigation should be linked
                                                                        * to. For the moment, only `{@link GlobeView}`
                                                                        * is supported.
     * @param   {Object}        options                                 The navigation menu optional configuration.
     * @param   {HTMLElement}   [options.parentElement=view.domElement] The parent HTML container of the div which
                                                                        * contains navigation widgets.
     * @param   {boolean}       [options.displayCompass=true]           Whether the compass widget should be displayed.
     * @param   {boolean}       [options.display3DToggle=true]          Whether the navigation should include a widget
                                                                        * to toggle between top and oblique view.
     * @param   {boolean}       [options.displayZoomIn=true]            Whether the zoom-in widget should be displayed.
     * @param   {boolean}       [options.displayZoomOut=true]           Whether the zoom-out widget should be displayed.
     * @param   {number}        [options.animationDuration=500]         The duration of travel animations, when clicking
                                                                        * navigation widgets.
     * @param   {string}        [options.position='bottom-left']        Defines which corner of the `parentElement` the
                                                                        * navigation menu should be displayed to.
                                                                        * Possible values are `top-left`, `top-right`,
                                                                        * `bottom-left` and `bottom-right`. If the input
                                                                        * value does not match one of these, it will be
                                                                        * defaulted to `bottom-left`.
     * @param   {string}        [options.direction='column']            Whether the navigation menu should expand
                                                                        * horizontally or vertically. Possible values
                                                                        * are `column` and `row`. If the input value
                                                                        * does not match one of these, it will be
                                                                        * defaulted to `column`.
     * @param   {Object}        [options.translate]                     An optional translation of the navigation menu.
     * @param   {number}        [options.translate.x=0]                 The navigation menu translation along the page
                                                                        * x-axis.
     * @param   {number}        [options.translate.y=0]                 The navigation menu translation along the page
                                                                        * y-axis.
     */
    constructor(view, options = {}) {
        // ---------- BUILD PROPERTIES ACCORDING TO DEFAULT OPTIONS AND OPTIONS PASSED IN PARAMETERS : ----------

        // Check if the view is supported.
        if (!view.isGlobeView) {
            throw new Error(
                '\'Navigation\' plugin only supports \'GlobeView\'. Therefore, the \'view\' parameter must be a ' +
                '\'GlobeView\'.',
            );
        }

        // `top`, `bottom`, `left` and `right` values for `position` option are not relevant for navigation widget.
        if (['top', 'bottom', 'left', 'right'].includes(options.position)) {
            console.warn(
                '\'position\' optional parameter for \'Navigation\' is not a valid option. ' +
                `It will be set to '${DEFAULT_OPTIONS.position}'.`,
            );
            options.position = DEFAULT_OPTIONS.position;
        }

        super(view, options, DEFAULT_OPTIONS);
        this.#_view = view;

        this.direction = options.direction || DEFAULT_OPTIONS.direction;
        if (!['column', 'row'].includes(this.direction)) {
            console.warn(
                '\'direction\' optional parameter for \'Navigation\' constructor is not a valid option. '
                + `It will be set to '${DEFAULT_OPTIONS.direction}'.`,
            );
            this.direction = DEFAULT_OPTIONS.direction;
        }

        this.animationDuration = options.animationDuration === undefined ?
            DEFAULT_OPTIONS.animationDuration : options.animationDuration;



        // ---------- CREATE A DomElement WITH id AND classes RELEVANT TO THE WIDGET PROPERTIES : ----------

        // Create a div containing all widgets and add it to its specified parent.
        this.domElement.id = 'widgets-navigation';

        // Position widget div according to options.
        this.domElement.classList.add(`${this.direction}-widget`);



        // ---------- CREATE THE DEFAULT WIDGETS IF NOT HIDDEN (COMPASS, 3D AND ZOOM BUTTONS) : ----------

        // Add a compass widget if requested.
        if (options.displayCompass ?? DEFAULT_OPTIONS.displayCompass) {
            this.compass = this.#_addDefaultButton(DEFAULT_BUTTONS.compass, () => {
                this.#_action({ heading: 0, tilt: 89.5 });
            });

            // Manage compass rotation when the view's camera is moved.
            view.addEventListener(VIEW_EVENTS.CAMERA_MOVED, (event) => {
                this.compass.style.transform = `rotate(${-event.heading}deg)`;
            });
        }

        // Add a 3D toggle button if requested.
        if (options.display3DToggle ?? DEFAULT_OPTIONS.display3DToggle) {
            this.toggle3D = this.#_addDefaultButton(DEFAULT_BUTTONS.toggle3D, () => {
                this.#_action({ tilt: this.#_view.controls.getTilt() < 89 ? 89.5 : 40 });
            });

            // Manage button content toggle when the view's camera is moved.
            view.addEventListener(VIEW_EVENTS.CAMERA_MOVED, (event) => {
                this.toggle3D.innerHTML = event.tilt < 89 ? '2D' : '3D';
            });
        }

        // Add a zoom-in button if requested.
        if (options.displayZoomIn ?? DEFAULT_OPTIONS.displayZoomIn) {
            this.zoomIn = this.#_addDefaultButton(DEFAULT_BUTTONS.zoomIn, () => {
                this.#_action({ zoom: Math.min(20, this.#_view.controls.getZoom() + 1) });
            });
        }

        // Add a zoom-out button if requested.
        if (options.displayZoomOut ?? DEFAULT_OPTIONS.displayZoomOut) {
            this.zoomOut = this.#_addDefaultButton(DEFAULT_BUTTONS.zoomOut, () => {
                this.#_action({ zoom: Math.max(3, this.#_view.controls.getZoom() - 1) });
            });
        }
    }

    /**
     *
     * @param   {string}    id              The unique id the created button should be given.
     * @param   {string}    [content='']    An HTML string defining the content of the button.
     * @param   {string}    [title='']      An HTML string defining information on the button. This string will be
                                            * displayed in a tooltip when hovering the button.
     * @param   {function}  [onclick] The method that should be executed when the button is clicked on.
     * @param   {string}    [parentId]      The unique id of a button bar in which the created button should be added.
                                            * A button bar is a group which contains one or several buttons. All
                                            * buttons created with Navigation are in a button bar. If the given id does
                                            * not match an already existing button bar, a new button bar will be created
                                            * with this id. If no id is given, a button bar will be created with no id.
                                            * The later case can be useful for creating isolated buttons.
     *
     * @returns {HTMLButtonElement}     The created button.
     */
    addButton(
        id,
        content = '',
        title = '',
        onclick = () => {},
        parentId,
    ) {
        let buttonBar = document.getElementById(parentId);
        if (!buttonBar) {
            buttonBar = this.addButtonBar(parentId);
        }

        const button = document.createElement('button');
        button.className = 'widget-button';
        button.id = id;
        button.innerHTML = content;
        button.title = title;
        button.onclick = onclick;

        buttonBar.appendChild(button);

        // The buttons must not be focused using tab key.
        button.tabIndex = -1;
        // When releasing the mouse after clicking the button, we give the focus back to the view. Therefore, we can use
        // key events on the view without having to click the view to grant it focus.
        window.addEventListener('pointerup', () => {
            if (document.activeElement === button) {
                this.#_view.domElement.focus();
            }
        });

        return button;
    }

    addButtonBar(id) {
        const buttonBar = document.createElement('div');
        buttonBar.className = 'widget-button-bar';
        if (id) { buttonBar.id = id; }

        this.domElement.appendChild(buttonBar);
        return buttonBar;
    }
}


export default Navigation;
