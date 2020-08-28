import * as THREE from 'three';
import DEMUtils from 'Utils/DEMUtils';
import Coordinates from 'Core/Geographic/Coordinates';

const coord = new Coordinates('EPSG:4326');
let rect;

// set it once
let STYLE_TRANSFORM = '';
if (document.documentElement.style.transform !== undefined) {
    STYLE_TRANSFORM = 'transform';
} else if (document.documentElement.style.webkitTransform !== undefined) {
    STYLE_TRANSFORM = 'webkitTransform';
} else if (document.documentElement.style.mozTransform !== undefined) {
    STYLE_TRANSFORM = 'mozTransform';
} else if (document.documentElement.style.oTransform !== undefined) {
    STYLE_TRANSFORM = 'oTransform';
} else {
    STYLE_TRANSFORM = 'transform';
}

/**
 * An object that handles the display of a text and/or an icon, linked to a 3D
 * position. The content of the `Label` is managed through a DOM object, in a
 * `<div>` handled by the `Label2DRenderer`.
 *
 * @property {boolean} isLabel - Used to checkout whether this object is a
 * Label. Default is true. You should not change this, as it is used internally
 * for optimisation.
 * @property {Element} content - The DOM object that contains the content of the
 * label. The style and the position are applied on this object.
 * @property {THREE.Vector3} position - The position in the 3D world of the
 * label.
 * @property {Coordinates} coordinates - The coordinates of the label.
 */
class Label extends THREE.Object3D {
    /**
     * @param {Element|string} content - The content; can be a
     * string, with or without HTML tags in it, or it can be an Element.
     * @param {Coordinates} coordinates - The world coordinates, where to place
     * the Label.
     * @param {Style} style - The style to apply to the content. Once the style
     * is applied, it cannot be changed directly. However, if it really needed,
     * it can be accessed through `label.content.style`, but it is highly
     * discouraged to do so.
     */
    constructor(content, coordinates, style = {}) {
        if (content == undefined || coordinates == undefined) {
            throw new Error('content and coordinates are mandatory to add a Label');
        }

        super();

        let _visible = this.visible;
        // can't do an ES6 setter/getter here
        Object.defineProperty(this, 'visible', {
            set(v) {
                if (v != _visible) { // avoid changing the style
                    _visible = v;
                    this.content.style.display = v ? 'block' : 'none';
                    // TODO: add smooth transition for fade in/out
                }
            },
            get() {
                return _visible;
            },
        });

        this.isLabel = true;
        this.coordinates = coordinates;

        this.projectedPosition = { x: 0, y: 0 };
        this.boundaries = { left: 0, right: 0, top: 0, bottom: 0 };

        this.content = document.createElement('div');
        this.content.classList.add('itowns-label');
        this.content.style.userSelect = 'none';
        this.content.style.position = 'absolute';
        if (typeof content == 'string') {
            this.content.textContent = content || '';
        } else {
            this.content.appendChild(content);
        }
        this.baseContent = content;

        if (style.isStyle) {
            this.anchor = style.getTextAnchorPosition();
            if (style.text.haloWidth > 0) {
                this.content.classList.add('itowns-stroke-single');
            }
            style.applyToHTML(this.content);
        }

        this.zoom = {
            min: style.zoom && style.zoom.min != undefined ? style.zoom.min : 2,
            max: style.zoom && style.zoom.max != undefined ? style.zoom.max : 24,
        };
    }

    /**
     * Moves a label on the screen, using screen coordinates. It updates the
     * boundaries as it moves it.
     *
     * @param {number} x - X coordinates in pixels, from left.
     * @param {number} y - Y coordinates in pixels, from top.
     */
    updateProjectedPosition(x, y) {
        if (x != this.projectedPosition.x || y != this.projectedPosition.y) {
            this.projectedPosition.x = x;
            this.projectedPosition.y = y;

            this.boundaries.left = x + this.offset.left;
            this.boundaries.right = x + this.offset.right;
            this.boundaries.top = y + this.offset.top;
            this.boundaries.bottom = y + this.offset.bottom;
        }
    }

    updateCSSPosition() {
        this.content.style[STYLE_TRANSFORM] = `translate(${this.boundaries.left}px, ${this.boundaries.top}px)`;
    }

    /**
     * Updates the screen dimensions of the label, using
     * `getBoundingClientRect`.  It updates `width` and `height` property of the
     * label, and the boundaries.
     */
    initDimensions() {
        if (!this.offset) {
            rect = this.content.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);
            this.offset = {
                left: width * this.anchor[0],
                top: height * this.anchor[1],
            };
            this.offset.right = this.offset.left + width;
            this.offset.bottom = this.offset.top + height;
        }
    }

    update3dPosition(crs) {
        this.coordinates.as(crs, coord);
        coord.toVector3(this.position);
        this.parent.worldToLocal(this.position);
        this.updateMatrixWorld();
    }

    updateElevationFromLayer(layer) {
        const elevation = DEMUtils.getElevationValueAt(layer, this.coordinates, DEMUtils.FAST_READ_Z);
        if (elevation && elevation != this.coordinates.z) {
            this.coordinates.z = elevation;
            return true;
        }
    }
}

export default Label;
