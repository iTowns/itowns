import * as THREE from 'three';

function isIntersectedOrOverlaped(a, b) {
    return !(a.left > b.right || a.right < b.left
        || a.top > b.bottom || a.bottom < b.top);
}

// A grid to manage labels on the screen.
class ScreenGrid {
    constructor(x = 12, y = 10, width, height) {
        this.x = x;
        this.y = y;

        this.grid = [];
        this.hidden = [];
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

        this.hidden = [];
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
                        this.hidden.push(obj);
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

const viewProjectionMatrix = new THREE.Matrix4();
const vector = new THREE.Vector3();

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
        this.domElement.appendChild(layer.domElement);
    }

    render(scene, camera) {
        if (!this.infoTileLayer || !this.infoTileLayer.layer.attachedLayers.find(l => l.isLabelLayer && l.visible)) { return; }
        this.grid.reset();

        viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

        this.culling(scene, this.infoTileLayer.currentMaxTileZoom, this.infoTileLayer.displayed.extent);

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
            }
        });

        this.grid.hidden.forEach((label) => { label.visible = false; });
    }

    culling(object, currentMaxZoom, extent) {
        if (!object.isLabel) {
            if (!object.visible) {
                this.hideNodeDOM(object);
                return;
            // Don't go further if the node can't be in the screen space (it
            // does not need to be rendered to continue the culling)
            } else if (object.extent && !object.extent.intersectsExtent(extent)) {
                this.hideNodeDOM(object);
                return;
            }

            this.showNodeDOM(object);

            object.children.forEach(c => this.culling(c, currentMaxZoom, extent));
        // By verifying the maxzoom and the presence of the label inside the
        // visible extent, we can filter more labels.
        } else if (object.zoom.max <= currentMaxZoom || !extent.isPointInside(object.coordinates)) {
            this.grid.hidden.push(object);
        // Do some horizon culling (if possible) if the tiles level is small
        // enough. The chosen value of 4 seems to provide a good result.
        } else if (object.parent.level < 4 && object.parent.layer.horizonCulling && object.parent.layer.horizonCulling(object.horizonCullingPoint)) {
            this.grid.hidden.push(object);
        } else {
            vector.setFromMatrixPosition(object.matrixWorld);
            vector.applyMatrix4(viewProjectionMatrix);

            object.updateProjectedPosition(vector.x * this.halfWidth + this.halfWidth, -vector.y * this.halfHeight + this.halfHeight);

            // Are considered duplicates, labels that have the same screen
            // coordinates and the same base content.
            if (this.grid.visible.some(l => l.projectedPosition.x == object.projectedPosition.x
                && l.projectedPosition.y == object.projectedPosition.y
                && l.baseContent == object.baseContent)) {
                object.parent.remove(object);
                this.grid.hidden.push(object);
            } else {
                this.grid.visible.push(object);
            }
        }
    }

    removeLabelDOM(label) {
        this.garbage.appendChild(label.content);
        this.garbage.innerHTML = '';
    }

    hideNodeDOM(node) {
        if (node.domElements) {
            const domElements = Object.values(node.domElements);
            if (domElements.length > 0) {
                domElements.forEach((domElement) => {
                    if (domElement.visible == true) {
                        domElement.dom.style.display = 'none';
                        domElement.visible = false;
                    }
                });
            } else {
                node.children.filter(n => n.isTileMesh).forEach(n => this.hideNodeDOM(n));
            }
        }
    }

    showNodeDOM(node) {
        if (node.domElements) {
            Object.values(node.domElements).forEach((domElement) => {
                if (domElement.visible == false) {
                    domElement.dom.style.display = 'block';
                    domElement.visible = true;
                }
            });
        }
    }
}

export default Label2DRenderer;
