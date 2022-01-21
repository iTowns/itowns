import { VIEW_EVENTS } from 'Core/View';


const DEFAULT_OPTIONS = {
    parentElement: document.body,
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
 * @property {HTMLElement}  domElement      An html div containing all navigation widgets.
 * @property {HTMLElement}  parentElement   The parent HTML container of `this.domElement`.
 */
class Navigation {
    /**
     * @param   {View}          view                                    The iTowns view the navigation should be linked
                                                                        * to.
     * @param   {Object}        options                                 The navigation menu optional configuration.
     * @param   {HTMLElement}   [options.parentElement=document.body]   The parent HTML container of the div which
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

        this.parentElement = options.parentElement || DEFAULT_OPTIONS.parentElement;

        this.direction = options.direction || DEFAULT_OPTIONS.direction;
        if (!['column', 'row'].includes(this.direction)) {
            console.warn(
                '\'direction\' optional parameter for \'Navigation\' constructor is not a valid option. '
                + `It will be set to '${DEFAULT_OPTIONS.direction}'.`,
            );
            this.direction = DEFAULT_OPTIONS.direction;
        }

        this.position = options.position || DEFAULT_OPTIONS.position;
        if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(this.position)) {
            console.warn(
                '\'position\' optional parameter for \'Navigation\' constructor is not a valid option. '
                + `It will be set to '${DEFAULT_OPTIONS.position}'.`,
            );
            this.position = DEFAULT_OPTIONS.position;
        }

        this.animationDuration = options.animationDuration === undefined ?
            DEFAULT_OPTIONS.animationDuration : options.animationDuration;



        // ---------- CREATE A DomElement WITH id AND classes RELEVANT TO THE WIDGET PROPERTIES : ----------

        // Create a div containing all widgets and add it to its specified parent.
        this.domElement = document.createElement('div');
        this.domElement.id = 'widgets-navigation';
        this.parentElement.appendChild(this.domElement);

        // Position widget div according to options.
        const positionArray = this.position.split('-');
        this.domElement.classList.add(`${positionArray[0]}-widget`);
        this.domElement.classList.add(`${positionArray[1]}-widget`);
        this.domElement.classList.add(`${this.direction}-widget`);

        // Translate widget div according to optional translate parameter.
        if (options.translate) {
            this.domElement.style.transform = `translate(${options.translate.x || 0}px, ${options.translate.y || 0}px)`;
        }



        // ---------- CREATE THE DEFAULT WIDGETS IF NOT HIDDEN (COMPASS, 3D AND ZOOM BUTTONS) : ----------

        // Add a compass widget if requested.
        if (options.displayCompass === undefined ? DEFAULT_OPTIONS.displayCompass : options.displayCompass) {
            this.compass = this.addButton(
                'compass',
                '',
                () => {
                    view.controls.lookAtCoordinate({
                        heading: 0,
                        tilt: 89.5,
                        time: this.animationDuration,
                    });
                },
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
                () => {
                    let tilt;
                    if (view.controls.getTilt() < 89) {
                        tilt = 89.5;
                    } else {
                        tilt = 40;
                    }
                    view.controls.lookAtCoordinate({ tilt, time: this.animationDuration });
                },
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
                () => {
                    view.controls.lookAtCoordinate({
                        zoom: Math.min(20, view.controls.getZoom() + 1),
                        time: this.animationDuration,
                    });
                },
                'zoom-button-bar',
            );
        }

        // Add a zoom-out button if requested.
        if (options.displayZoomOut === undefined ? DEFAULT_OPTIONS.displayZoomOut : options.displayZoomOut) {
            this.zoomOutButton = this.addButton(
                'zoom-out-button',
                '<span id="zoom-out-logo" class="widget-zoom-button-logo"></span>',
                () => {
                    view.controls.lookAtCoordinate({
                        zoom: Math.max(3, view.controls.getZoom() - 1),
                        time: this.animationDuration,
                    });
                },
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
