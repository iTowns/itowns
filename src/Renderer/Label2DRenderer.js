import * as THREE from 'three';
import GlobeLayer from 'Core/Prefab/Globe/GlobeLayer';

function isIntersectedOrOverlaped(a, b) {
    return !(a.left > b.right || a.right < b.left
        || a.top > b.bottom || a.bottom < b.top);
}

const frustum = new THREE.Frustum();

// A grid to manage labels on the screen.
export class ScreenGrid {
    constructor(x = 12, y = 10, width, height) {
        this.x = x;
        this.y = y;

        this.grid = [];
        this.visible = [];

        this.resize();
        this.reset();

        this.width = width;
        this.height = height;
    }

    // Reset each cell and hidden and visible.
    reset() {
        for (let i = 0; i < this.x; i++) {
            for (let j = 0; j < this.y; j++) {
                // Splice is prefered to creating a new array, in term of memory
                this.grid[i][j].splice(0, this.grid[i][j].length);
            }
        }

        this.visible = [];
    }

    // Add rows if needed — but don't delete anything else. Columns are taken
    // care in reset().
    resize() {
        for (let i = 0; i < this.x; i++) {
            if (!this.grid[i]) {
                this.grid[i] = [];
            }

            for (let j = 0; j < this.y; j++) {
                if (!this.grid[i][j]) {
                    this.grid[i][j] = [];
                }
            }
        }
    }

    // Insert a label using its boundaries. It is either added to hidden or
    // visible, given the result. The grid is populated with true for every
    // filled cell.
    insert(obj) {
        const minx = Math.max(0, Math.floor(obj.boundaries.left / this.width * this.x));
        const maxx = Math.min(this.x - 1, Math.floor(obj.boundaries.right / this.width * this.x));
        const miny = Math.max(0, Math.floor(obj.boundaries.top / this.height * this.y));
        const maxy = Math.min(this.y - 1, Math.floor(obj.boundaries.bottom / this.height * this.y));

        for (let i = minx; i <= maxx; i++) {
            for (let j = miny; j <= maxy; j++) {
                if (this.grid[i][j].length > 0) {
                    if (this.grid[i][j].some(l => isIntersectedOrOverlaped(l.boundaries, obj.boundaries))) {
                        obj.visible = false;
                        return false;
                    }
                }
            }
        }

        for (let i = minx; i <= maxx; i++) {
            for (let j = miny; j <= maxy; j++) {
                this.grid[i][j].push(obj);
            }
        }

        return true;
    }
}

const worldPosition = new THREE.Vector3();

/**
 * This renderer is inspired by the
 * [`THREE.CSS2DRenderer`](https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer).
 * It is instanciated in `c3DEngine`, as another renderer to handles Labels.
 */
class Label2DRenderer {
    constructor() {
        this.domElement = document.createElement('div');
        this.domElement.style.overflow = 'hidden';
        this.domElement.style.position = 'absolute';
        this.domElement.style.top = '0';
        this.domElement.style.height = '100%';
        this.domElement.style.width = '100%';
        this.domElement.style.zIndex = 1;

        // Used to destroy labels that are not added to the DOM
        this.garbage = document.createElement('div');
        this.garbage.style.display = 'none';
        this.domElement.appendChild(this.garbage);

        this.halfWidth = 0;
        this.halfHeight = 0;

        this.grid = new ScreenGrid();

        this.infoTileLayer = undefined;
    }

    setSize(width, height) {
        this.domElement.style.width = `${width}`;
        this.domElement.style.height = `${height}`;

        this.halfWidth = width / 2;
        this.halfHeight = height / 2;

        this.grid.width = width;
        this.grid.height = height;
        this.grid.x = Math.ceil(width / 20);
        this.grid.y = Math.ceil(height / 20);

        this.grid.resize();
    }

    registerLayer(layer) {
        this.domElement.appendChild(layer.domElement.dom);
    }

    render(scene, camera) {
        const labelLayers = this.infoTileLayer && this.infoTileLayer.layer.attachedLayers.filter(l => l.isLabelLayer && l.visible);
        if (labelLayers.length == 0) { return; }
        this.grid.reset();

        // set camera frustum
        frustum.setFromProjectionMatrix(camera.projectionMatrix);

        labelLayers.forEach((labelLayer) => {
            labelLayer.submittedLabelNodes.forEach(
                (labelsNode) => {
                    labelsNode.labels.forEach(
                        (label) => {
                            labelsNode.updatePosition(label);

                            this.culling(label, camera);
                        });
                    labelsNode.domElements.labels.show();
                    labelsNode.needsUpdate = false;
                });
        });

        // sort by order, then by visibility inside those subsets
        // https://docs.mapbox.com/help/troubleshooting/optimize-map-label-placement/#label-hierarchy
        this.grid.visible.sort((a, b) => {
            const r = b.order - a.order;
            if (r == 0) {
                if (!a.visible && b.visible) {
                    return 1;
                } else { return -1; }
            } else {
                return r;
            }
        });
        this.grid.visible.forEach((l) => {
            if (this.grid.insert(l)) {
                l.visible = true;
                l.updateCSSPosition();
            } else {
                l.visible = false;
            }
        });

        labelLayers.forEach((labelLayer) => {
            labelLayer.toHide.children.forEach(labelsNode => labelsNode.domElements?.labels.hide());
            labelLayer.toHide.clear();
        });
    }

    culling(label, camera) {
        label.getWorldPosition(worldPosition);
        // Check if the frustum contains tle label
        if (!frustum.containsPoint(worldPosition.applyMatrix4(camera.matrixWorldInverse)) ||
        // Check if globe horizon culls the label
        // Do some horizon culling (if possible) if the tiles level is small enough.
            label.horizonCullingPoint && GlobeLayer.horizonCulling(label.horizonCullingPoint)
            // Why do we might need this part ?
            // || // Check if content isn't present in visible labels
            // this.grid.visible.some((l) => {
            //     // TODO for icon without text filter by position
            //     const textContent = label.content.textContent;
            //     return textContent !== '' && l.content.textContent.toLowerCase() == textContent.toLowerCase();
            // })
        ) {
            label.visible = false;
        } else {
            // projecting world position label
            worldPosition.applyMatrix4(camera.projectionMatrix);

            label.updateProjectedPosition(worldPosition.x * this.halfWidth + this.halfWidth, -worldPosition.y * this.halfHeight + this.halfHeight);

            this.grid.visible.push(label);
        }
    }

    removeLabelDOM(label) {
        this.garbage.appendChild(label.content);
        this.garbage.innerHTML = '';
    }
}

export default Label2DRenderer;
