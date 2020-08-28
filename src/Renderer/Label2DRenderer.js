import * as THREE from 'three';

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
                this.grid[i][j] = false;
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
                if (this.grid[i][j]) {
                    this.hidden.push(obj);
                    return false;
                }
            }
        }

        for (let i = minx; i <= maxx; i++) {
            for (let j = miny; j <= maxy; j++) {
                this.grid[i][j] = true;
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
        this.grid.x = Math.ceil(width / 30);
        this.grid.y = Math.ceil(height / 30);

        this.grid.resize();
    }

    registerLayer(layer) {
        this.domElement.appendChild(layer.domElement);
    }

    render(scene, camera) {
        if (!this.infoTileLayer) { return; }
        this.grid.reset();

        viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

        this.culling(scene, this.infoTileLayer.currentMaxTileZoom, this.infoTileLayer.displayed.extent);

        this.grid.visible.forEach((l, i) => {
            if (this.grid.insert(l, i)) {
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
            }

            // Don't go further if the node can't be in the screen space (it
            // does not need to be rendered to continue the culling)
            if (object.extent && !object.extent.intersectsExtent(extent)) {
                this.hideNodeDOM(object);
                return;
            }

            this.showNodeDOM(object);

            object.children.forEach(c => this.culling(c, currentMaxZoom, extent));
        // By verifying the maxzoom and the presence of the label inside the
        // visible extent, we can filter more labels.
        } else if (object.zoom.max <= currentMaxZoom || !extent.isPointInside(object.coordinates)) {
            this.grid.hidden.push(object);
        } else {
            vector.setFromMatrixPosition(object.matrixWorld);
            vector.applyMatrix4(viewProjectionMatrix);

            object.updateProjectedPosition(Math.round(vector.x * this.halfWidth + this.halfWidth), Math.round(-vector.y * this.halfHeight + this.halfHeight));

            // Are considered duplicates, labels that have the same screen
            // coordinates and the same base content.
            if (this.grid.visible.some(l => l.projectedPosition.x == object.projectedPosition.x
                && l.projectedPosition.y == object.projectedPosition.y
                && l.baseContent == object.baseContent)) {
                object.parent.remove(object);
                this.grid.hidden.push(object);
            } else if (object.visible) {
                // Give priority to already visible label, to reduce jittering
                this.grid.visible.unshift(object);
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
        if (node.domElementVisible == true) {
            node.domElement.style.display = 'none';
            node.domElementVisible = false;
        }
    }

    showNodeDOM(node) {
        if (node.domElementVisible == false) {
            node.domElement.style.display = 'block';
            node.domElementVisible = true;
        }
    }
}

export default Label2DRenderer;
