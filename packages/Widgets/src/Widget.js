/**
 * An interface that stores common methods for all specific widgets.
 *
 * @hideconstructor
 */
class Widget {
    #_display;

    constructor(view, options = {}, defaultOptions) {
        this.parentElement = options.parentElement || view.domElement;

        this.position = options.position || defaultOptions.position;
        if (
            !['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right']
                .includes(this.position)
        ) {
            console.warn(
                '\'position\' optional parameter for \'Widget\' constructor is not a valid option. '
                + `It will be set to '${defaultOptions.position}'.`,
            );
            this.position = defaultOptions.position;
        }



        // ---------- CREATE A DomElement WITH id, classes AND style RELEVANT TO THE WIDGET PROPERTIES : ----------

        // Create a div containing minimap widget and add it to its specified parent.
        this.domElement = document.createElement('div');
        this.parentElement.appendChild(this.domElement);

        // Size widget according to options.
        this.domElement.style.width = `${options.width || options.size || defaultOptions.width}px`;
        this.domElement.style.height = `${options.height || options.size || defaultOptions.height}px`;

        // Position widget according to options.
        const positionArray = this.position.split('-');
        this.domElement.classList.add(`${positionArray[0]}-widget`);
        if (positionArray[1]) {
            this.domElement.classList.add(`${positionArray[1]}-widget`);
        } else {
            // If only one position parameter was given, center the domElement on the other axis.
            // TODO : at this stage, offsetWidth and offsetHeight do no include borders. This should be worked around.
            switch (positionArray[0]) {
                case 'top':
                case 'bottom':
                    this.domElement.style.left = `calc(50% - ${this.domElement.offsetWidth / 2}px)`;
                    break;
                case 'left':
                case 'right':
                    this.domElement.style.top = `calc(50% - ${this.domElement.offsetHeight / 2}px)`;
                    break;
                default:
                    break;
            }
        }

        // Translate widget div according to optional translate parameter.
        if (options.translate) {
            this.domElement.style.transform = `translate(${options.translate.x || 0}px, ${options.translate.y || 0}px)`;
        }

        // Prevent triggering `GlobeControls` and `PlanarControls` mouse or pointer events when clicking the search bar.
        // For example, this prevents triggering an animated travel when double-clicking search bar in a `GlobeView`.
        this.domElement.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
        this.domElement.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    }

    /**
     * Change the widget style `display` property so that the widget becomes visible.
     */
    show() {
        this.domElement.style.display = this.#_display;
    }

    /**
     * Change the widget style `display` property so that the widget becomes invisible.
     */
    hide() {
        this.#_display = window.getComputedStyle(this.domElement).display;
        this.domElement.style.display = 'none';
    }
}


export default Widget;
