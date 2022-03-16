import { VIEW_EVENTS } from 'Core/View';
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


/**
 * A widget menu manager for navigation.
 *
 * @extends Widget
 *
 * @property {HTMLElement}  domElement          An html div containing all navigation widgets.
 * @property {HTMLElement}  parentElement       The parent HTML container of `this.domElement`.
 * @property {Object}       onClick             An object containing methods which are executed when clicking one of the
                                                * default navigation buttons. These default buttons are the compass, the
                                                * 3D toggle, zoom-in and zoom-out buttons. The `onClick` object can be
                                                * modified by user in order to implement custom behaviour on default
                                                * buttons.
 * @property {function}     onClick.compass     The method ran when clicking the compass button.
 * @property {function}     onClick.toggle3D    The method ran when clicking the 3D/2D button.
 * @property {function}     onClick.zoomIn      The method ran when clicking the zoom-in button.
 * @property {function}     onClick.zoomOut     The method ran when clicking the zoom-out button.
 */
class Navigation extends Widget {
    #_view;

    #_setActionsOnClick() {
        const action = (params) => {
            params.time = this.animationDuration;
            this.#_view.controls.lookAtCoordinate(params);
        };

        this.onClick = {};

        this.onClick.compass = () => {
            action({ heading: 0, tilt: 89.5 });
        };
        this.onClick.toggle3D = () => {
            action({ tilt: this.#_view.controls.getTilt() < 89 ? 89.5 : 40 });
        };
        this.onClick.zoomIn = () => {
            action({ zoom: Math.min(20, this.#_view.controls.getZoom() + 1) });
        };
        this.onClick.zoomOut = () => {
            action({ zoom: Math.max(3, this.#_view.controls.getZoom() - 1) });
        };
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
        this.#_setActionsOnClick();

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
        if (options.displayCompass === undefined ? DEFAULT_OPTIONS.displayCompass : options.displayCompass) {
            this.compass = this.addButton(
                'compass',
                '',
                this.onClick.compass,
                'widgets',
            );

            // Manage compass rotation when the view's camera is moved.
            view.addEventListener(VIEW_EVENTS.CAMERA_MOVED, (event) => {
                this.compass.style.transform = `rotate(${-event.heading}deg)`;
            });
        }

        // Add a 3D toggle button if requested.
        if (options.display3DToggle === undefined ? DEFAULT_OPTIONS.display3DToggle : options.display3DToggle) {
            this.switch3dButton = this.addButton(
                '3d-button',
                '3D',
                this.onClick.toggle3D,
            );

            // Manage button content toggle when the view's camera is moved.
            view.addEventListener(VIEW_EVENTS.CAMERA_MOVED, (event) => {
                this.switch3dButton.innerHTML = event.tilt < 89 ? '2D' : '3D';
            });
        }

        // Add a zoom-in button if requested.
        if (options.displayZoomIn === undefined ? DEFAULT_OPTIONS.displayZoomIn : options.displayZoomIn) {
            this.zoomInButton = this.addButton(
                'zoom-in-button',
                '<span class="widget-zoom-button-logo"></span>',
                this.onClick.zoomIn,
                'zoom-button-bar',
            );
        }

        // Add a zoom-out button if requested.
        if (options.displayZoomOut === undefined ? DEFAULT_OPTIONS.displayZoomOut : options.displayZoomOut) {
            this.zoomOutButton = this.addButton(
                'zoom-out-button',
                '<span id="zoom-out-logo" class="widget-zoom-button-logo"></span>',
                this.onClick.zoomOut,
                'zoom-button-bar',
            );
        }
    }

    /**
     *
     * @param   {string}    id              The unique id the created button should be given.
     * @param   {string}    [content='']    An HTML string defining the content of the button.
     * @param   {function}  [actionOnClick] The method that should be executed when the button is clicked on.
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
        actionOnClick = () => {},
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

        buttonBar.appendChild(button);

        button.addEventListener('click', actionOnClick);

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
