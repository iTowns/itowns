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
 * label. The style and the position are applied on this object. All labels
 * contain the `itowns-label` class, as well as a specific class related to the
 * layer linked to it: `itowns-label-[layer-id]` (replace `[layer-id]` by the
 * correct string).
 * @property {THREE.Vector3} position - The position in the 3D world of the
 * label.
 * @property {number} padding - sets the padding area on all four sides of an element at once.
 * @property {Coordinates} coordinates - The coordinates of the label.
 * @property {number} order - Order of the label that will be read from the
 * style. It helps sorting and prioritizing a Label during render.
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
    constructor(content = '', coordinates, style = {}) {
        if (coordinates == undefined) {
            throw new Error('coordinates are mandatory to add a Label');
        }
        if (arguments.length > 3) {
            console.warn('Deprecated argument sprites in Label constructor. Sprites must be configured in style argument.');
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

        if (typeof content === 'string') {
            this.content = document.createElement('div');
            this.content.textContent = style.text.field;
        } else {
            this.content = content.cloneNode(true);
        }

        this.content.classList.add('itowns-label');
        this.content.style.userSelect = 'none';
        this.content.style.position = 'absolute';

        if (style.isStyle) {
            this.anchor = style.getTextAnchorPosition();
            this.styleOffset = style.text.offset;
            if (typeof content === 'string') {
                if (style.text.haloWidth > 0) {
                    this.content.classList.add('itowns-stroke-single');
                }
                style.applyToHTML(this.content)
                    .then((icon) => {
                        if (icon) { // Not sure if that test is needed...
                            this.icon = icon;
                        }
                    });
            }
        } else {
            this.anchor = [0, 0];
            this.styleOffset = [0, 0];
        }

        this.iconOffset = { left: 0, right: 0, top: 0, bottom: 0 };

        this.zoom = {
            min: style.zoom && style.zoom.min != undefined ? style.zoom.min : 2,
            max: style.zoom && style.zoom.max != undefined ? style.zoom.max : 24,
        };

        this.order = style.order || 0;
        // Padding value, to avoid labels being too close to each other.
        this.padding = 2;
    }

    /**
     * Moves a label on the screen, using screen coordinates. It updates the
     * boundaries as it moves it.
     *
     * @param {number} x - X coordinates in pixels, from left.
     * @param {number} y - Y coordinates in pixels, from top.
     */
    updateProjectedPosition(x, y) {
        const X = Math.round(x);
        const Y = Math.round(y);
        if (X != this.projectedPosition.x || Y != this.projectedPosition.y) {
            this.projectedPosition.x = X;
            this.projectedPosition.y = Y;

            this.boundaries.left = x + this.offset.left - this.padding;
            this.boundaries.right = x + this.offset.right + this.padding;
            this.boundaries.top = y + this.offset.top - this.padding;
            this.boundaries.bottom = y + this.offset.bottom + this.padding;

            // The boundaries of the label are the union of the boundaries of the text
            // and the boundaries of the icon, if it exists.
            // Checking if this.icon is not only zeros is mandatory, to prevent case
            // when a boundary is set to x or y coordinate
            if (
                this.iconOffset.left !== 0 || this.iconOffset.right !== 0
                || this.iconOffset.top !== 0 || this.iconOffset.bottom !== 0
            ) {
                this.boundaries.left = Math.min(this.boundaries.left, x + this.iconOffset.left);
                this.boundaries.right = Math.max(this.boundaries.right, x + this.iconOffset.right);
                this.boundaries.top = Math.min(this.boundaries.top, y + this.iconOffset.top);
                this.boundaries.bottom = Math.max(this.boundaries.bottom, y + this.iconOffset.bottom);
            }
        }
    }

    updateCSSPosition() {
        // translate all content according to its given anchor
        this.content.style[STYLE_TRANSFORM] = `translate(${
            this.projectedPosition.x + this.offset.left
        }px, ${
            this.projectedPosition.y + this.offset.top
        }px)`;

        // translate possible icon inside content to cancel anchoring on it, so that it can later be positioned
        // according to its own anchor
        if (this.icon) {
            this.icon.style[STYLE_TRANSFORM] = `translate(${-this.offset.left}px, ${-this.offset.top}px)`;
        }
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
                left: width * this.anchor[0] + this.styleOffset[0],
                top: height * this.anchor[1] + this.styleOffset[1],
            };
            this.offset.right = this.offset.left + width;
            this.offset.bottom = this.offset.top + height;

            if (this.icon) {
                rect = this.icon.getBoundingClientRect();
                this.iconOffset = {
                    left: Math.floor(rect.x),
                    top: Math.floor(rect.y),
                    right: Math.ceil(rect.x + rect.width),
                    bottom: Math.ceil(rect.y + rect.height),
                };
            }
        }
    }

    update3dPosition(crs) {
        this.coordinates.as(crs, coord).toVector3(this.position);
        this.updateMatrixWorld();
    }

    updateElevationFromLayer(layer, nodes) {
        if (layer.attachedLayers.filter(l => l.isElevationLayer).length == 0) {
            return;
        }

        let elevation = Math.max(0, DEMUtils.getElevationValueAt(layer, this.coordinates, DEMUtils.FAST_READ_Z, nodes));

        if (isNaN(elevation)) {
            elevation = Math.max(0, DEMUtils.getElevationValueAt(layer, this.coordinates, DEMUtils.FAST_READ_Z));
        }

        if (!isNaN(elevation) && elevation != this.coordinates.z) {
            this.coordinates.z = elevation;
        }
    }

    updateHorizonCullingPoint() {
        if (this.horizonCullingPoint) {
            this.getWorldPosition(this.horizonCullingPoint);
        }
    }
}

export default Label;
