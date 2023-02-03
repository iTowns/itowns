import * as THREE from 'three';
// import { CSS2DRenderer, CSS2DObject } from 'ThreeExtended/renderers/CSS2DRenderer';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import Coordinates from 'Core/Geographic/Coordinates';
import DEMUtils from 'Utils/DEMUtils';
import { CONTROL_EVENTS } from 'Controls/GlobeControls';
import Widget from './Widget';

const DEFAULT_OPTIONS = {
    position: 'top',
    width: 50,
    height: 50,
    placeholder: 'Measure elevation',
};

const loader = new THREE.TextureLoader();
const POINT_TEXTURE = loader.load('sprites/mycircle.png'); // TODO: update url once PR itowns sample data accepted

const MOVE_POINT_MATERIAL = new THREE.PointsMaterial({
    color: 0xff0000,
    size: 10.0,
    map: POINT_TEXTURE,
    alphaTest: 0.5,
    sizeAttenuation: false,
    depthTest: false, // allows to render the point above the objects of the scene (used with renderOrder = 1)
});

const CLICK_POINT_MATERIAL = MOVE_POINT_MATERIAL.clone();
CLICK_POINT_MATERIAL.color.set(0xffffff);

// Constants for garbage collector optimization
const pickedCoord = new Coordinates('EPSG:4978'); // default crs but will be set to view crs later
const pickedCoord4326 = new Coordinates('EPSG:4326');
const cameraPos = new THREE.Vector3();
const cameraPosGeo = new Coordinates('EPSG:4978'); // default crs but will be set to view crs later

/**
 * Widget to measure the elevation in the 3D scene. Click anywhere in the scene to measure and display the elevation.
 * Works on all layers that can be added to itowns: 3D Tiles, terrain, etc.
 *
 * @extends Widget
 *
 * @property {HTMLElement} domElement An html div containing the searchbar.
 * @property {HTMLElement} parentElement The parent HTML container of `this.domElement`.
 * @property {Number} [decimals=2] The number of decimals of the measured elevation.
 * @property {String} [noElevationText='-'] The text to display when the elevation value is not found (e.g. if the user
 * tries to measure the elevation where there is no elevation texture available).
 */
class ElevationMeasure extends Widget {
    // --- Internal fields
    // boolean indicating whether the tool is active or not
    #active;
    // the view where to pick
    #view;
    // a point following the mouse pointer
    #movePoint;
    // a point displayed where the user clicks to mesure elevation
    #clickPoint;
    // the threejs CSS2DRenderer used to display the label containing the elevation
    #labelRenderer;
    // the threejs label object
    #labelObj;
    // boolean used to check if the user is dragging (don't mesure elevation or just clicking (mesure elevation)
    #drag = false;
    // store previous mouse move event (and hence last mouse position) to move the movePoint when zooming in or out
    #previousMouseMoveEvent = null;

    // --- Config options
    decimals = 2;
    noElevationText = '-';
    movePointMaterial = MOVE_POINT_MATERIAL;
    clickPointMaterial = CLICK_POINT_MATERIAL;

    /**
     *
     * @param {View} view the iTowns view in which the tool will measure elevation
     * @param {Object} options The elevation measure widget optional configuration
     * @param {HTMLElement} [options.parentElement=view.domElement] The parent HTML container of the div which
     *                                                              contains searchbar widgets.
     * @param {String} [options.position='top'] Defines which position within the
     *                                          `parentElement` the searchbar should be
                                                                        * displayed to. Possible values are `top`,
                                                                        * `bottom`, `left`, `right`, `top-left`,
                                                                        * `top-right`, `bottom-left` and `bottom-right`.
                                                                        * If the input value does not match one of
                                                                        * these, it will be defaulted to `top`.
    * @param {number} [options.width=50] The width in pixels of the scale.
    * @param {number} [options.height=50] The height in pixels of the scale.
    * @param {Number} [options.decimals=2] The number of decimals of the measured elevation
    * @param {String} [options.noElevationText='-'] The text to display when the elevation value is not found (e.g. if
    * the user tries to measure the elevation where there is no elevation texture available).
    * @param {Material|Object} [options.movePointMaterial='THREE.PointsMaterial'] Either the material of the point
    * moving under the cursor (e.g. THREE.PointsMaterial) or options of THREE.PointsMaterial that should be applied to
    * the default material (e.g. {color: 0x0000FF} for a blue point). If not set, defaults to a THREE.PointsMaterial
    * with a circle sprite, red color and 10px size.
    * @param {Material|Object} [options.clickPointMaterial='THREE.PointsMaterial'] Either the material of the point
    * where the elevation is measured (e.g. THREE.PointsMaterial) or options of THREE.PointsMaterial that should be
    * applied to the default material (e.g. {size: 20} for a point of size 20px). If not set, defaults to a
    * THREE.PointsMaterial with a circle sprite, white color and 10px size.
    */
    constructor(view, options = {}) {
        super(view, options, DEFAULT_OPTIONS);

        if (options.decimals !== null && options.decimals !== undefined && !isNaN(options.decimals) &&
            options.decimals >= 0) {
            this.decimals = options.decimals;
        }
        if (options.noElevationText &&
            (typeof options.noElevationText === 'string' || options.noElevationText instanceof String)) {
            this.noElevationText = options.noElevationText;
        }
        if (options.movePointMaterial) {
            if (options.movePointMaterial.isMaterial) {
                this.movePointMaterial = options.movePointMaterial;
                // render the point above the objects of the scene (used with renderOrder = 1)
                this.movePointMaterial.depthTest = false;
            } else if (typeof options.movePointMaterial === 'object') {
                this.movePointMaterial.setValues(options.movePointMaterial);
            } else {
                console.warn('[Elevation measure widget] Material options should either be a THREE.Material or an object.');
            }
        }
        if (options.clickPointMaterial) {
            if (options.clickPointMaterial.isMaterial) {
                this.clickPointMaterial = options.clickPointMaterial;
                // render the point above the objects of the scene (used with renderOrder = 1)
                this.clickPointMaterial.depthTest = false;
            } else if (typeof options.clickPointMaterial === 'object') {
                this.clickPointMaterial.setValues(options.clickPointMaterial);
            } else {
                console.warn('[Elevation measure widget] Material options should either be a THREE.Material or an object.');
            }
        }

        this.#view = view;
        // set constants coordinates crs
        pickedCoord.setCrs(this.#view.referenceCrs);
        cameraPosGeo.setCrs(this.#view.referenceCrs);

        this.#active = false;
        this.domElement.id = 'widgets-elevation';

        const activationButton = document.createElement('button');
        activationButton.id = 'widgets-elevation-activation-button';
        activationButton.classList.add('widget-button');
        activationButton.addEventListener('mousedown', this.onButtonClick.bind(this));
        this.domElement.appendChild(activationButton);
    }

    /**
     * Activate or deactivate tool
     */
    onButtonClick() {
        this.#active = !this.#active;
        if (this.#active) {
            document.getElementById('widgets-elevation-activation-button').classList.add('widget-button-active');
            this.activateTool();
        } else {
            document.getElementById('widgets-elevation-activation-button').classList.remove('widget-button-active');
            this.deactivateTool();
        }
    }

    /**
     * Bind events of the tool and init labels stuff to display the elevation value
     */
    activateTool() {
        // Save function signatures with binding to be able to remove the eventListener in deactivateTool
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onZoom = this.onZoom.bind(this);
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        this.#view.controls.addEventListener(CONTROL_EVENTS.RANGE_CHANGED, this.onZoom);

        this.#movePoint = this.initPoint(this.movePointMaterial);
        this.#clickPoint = this.initPoint(this.clickPointMaterial);
        this.initLabel();
    }

    /**
     * Go back to a state before the tool has been activated: remove event listeners, points and labels
     */
    deactivateTool() {
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.#view.controls.removeEventListener(CONTROL_EVENTS.RANGE_CHANGED, this.onZoom);

        this.removePoints();
        this.removeLabel();
    }

    /**
     * Initializes a threejs point with specific attributes
     * @param {Material} material the threejs Material to apply to the point
     * @return {Points} the threejs point initialized
     */
    initPoint(material) {
        const typedArr = new Float32Array(3);
        const bufferAttrib = new THREE.BufferAttribute(typedArr, 3);

        const bufferGeom = new THREE.BufferGeometry();
        bufferGeom.setAttribute('position', bufferAttrib);

        const point = new THREE.Points(bufferGeom, material);

        point.frustumCulled = false; // Avoid the point to be frustum culled when zooming in.
        point.renderOrder = 1; // allows to render the point above the other 3D objects of the scene
        point.visible = false;

        this.#view.scene.add(point);

        return point;
    }

    /**
     * Updates a threejs point position
     * @param {Points} point the threejs point to update
     * @param {Coordinates} coordinates The coordinates where to display the point
     */
    updatePointPosition(point, coordinates) {
        const pos = point.geometry.attributes.position;
        pos.array[0] = coordinates.x;
        pos.array[1] = coordinates.y;
        pos.array[2] = coordinates.z;
        pos.needsUpdate = true;
    }

    /**
     * Create or update a point in the 3D scene that follows the mouse cursor
     * @param {Event} event mouse event
     */
    onMouseMove(event) {
        this.#drag = true;
        this.#previousMouseMoveEvent = event;

        if (this.#movePoint.visible === false) {
            this.#movePoint.visible = true;
        }

        const terrainWorldCoordinates = this.#view.pickTerrainCoordinates(event);
        this.updatePointPosition(this.#movePoint, terrainWorldCoordinates);

        this.#view.notifyChange();
    }

    onMouseDown() {
        this.#drag = false;
    }

    /**
     * Create or update a point where the user chose to display the elevation.
     * @param {Event} event mouse event
     */
    onMouseUp(event) {
        // Verify it's a left click and it's not a drag movement
        if (event.button !== 0 || this.#drag === true) {
            return;
        }

        if (this.#clickPoint.visible === false) {
            this.#clickPoint.visible = true;
        }

        const terrainWorldCoordinates = this.#view.pickTerrainCoordinates(event);
        this.updatePointPosition(this.#clickPoint, terrainWorldCoordinates);

        const elevationText = this.getElevationText(event, terrainWorldCoordinates);

        const pointVec3 = terrainWorldCoordinates.toVector3();
        this.updateLabel(elevationText, pointVec3);

        this.#view.notifyChange(true);
    }

    /**
     * Updates move point position on zoom
     */
    onZoom() {
        if (this.#movePoint.visible === false) {
            this.#movePoint.visible = true;
        }

        const terrainWorldCoordinates = this.#view.pickTerrainCoordinates(this.#previousMouseMoveEvent);
        this.updatePointPosition(this.#movePoint, terrainWorldCoordinates);

        this.#view.notifyChange();
    }

    /**
     * Compute elevation from mouse position
     * @param {Event} event the mouse event that generated the elevation measure
     * @param {Coordinates} terrainWorldCoordinates terrain coordinates in the 3D world correxponding to the mouse
     * position
     * @return {String} the elevation text to display in the label
     */
    getElevationText(event, terrainWorldCoordinates) {
        let elevationText = this.noElevationText;

        const pickedObjs = this.#view.pickObjectsAt(event);
        if (!pickedObjs) {
            return elevationText;
        }

        // Picked objects can either be 3D objects (which have an attribute distance indicating its distance to the
        // camera) or a tileMesh (which don't have a distance attribute). Compute the distance attribute of the tileMesh
        // to enable sorting objects based on that distance afterwards.
        for (const obj of pickedObjs) {
            if (!obj.distance) {
                if (obj.object.isTileMesh) {
                    obj.distance = this.computeDistanceToCamera(terrainWorldCoordinates);
                } else {
                    console.warn('[Elevation measure widget]: Picked object that are not of type TileMesh should have' +
                    ' a distance attribute.');
                }
            }
        }

        // Sort objects from the closest to the farest
        pickedObjs.sort((o1, o2) => o1.distance - o2.distance);
        const closestObj = pickedObjs[0];

        if (closestObj.object.isTileMesh) {
            elevationText = this.computeTerrainElevationText(terrainWorldCoordinates, closestObj.object);
        } else if (closestObj.object.isMesh || closestObj.object.isPoints) {
            pickedCoord.setFromVector3(closestObj.point);
            elevationText = this.compute3DObjectElevationText(pickedCoord);
        } else {
            console.error('[Elevation measure widget]: Unknown picked object type.');
        }

        return elevationText;
    }

    /**
     * Computes the distance between a point and the camera
     * @param {Coordinates} point the point in the 3D scene
     * @return {Number} the spatial euclidean distance between the point and the camera
     */
    computeDistanceToCamera(point) {
        this.#view.camera.camera3D.getWorldPosition(cameraPos);
        cameraPosGeo.setFromVector3(cameraPos);
        return point.spatialEuclideanDistanceTo(cameraPosGeo);
    }

    /**
     * Computes the elevation and the elevation text to display from a point on the terrain in the 3D scene
     * (in world coordinates)
     * @param {Coordinates} terrainCoord The 3D coordinates of the terrain point
     * @param {TileMesh} tile The picked terrain tile (used to look up elevation)
     * @return {String} The elevation text to display in the label
     */
    computeTerrainElevationText(terrainCoord, tile) {
        const elevation = DEMUtils.getElevationValueAt(this.#view.tileLayer, terrainCoord, DEMUtils.PRECISE_READ_Z, [tile]);
        if (elevation !== null && elevation !== undefined && !isNaN(elevation)) {
            return `${elevation.toFixed(this.decimals)} m`;
        } else {
            return this.noElevationText;
        }
    }

    /**
     * COmputes the elevation and elevation text to display from a point in the 3D scene (likely a point on a picked 3D
     * object in world coordinates)
     * @param {Coordinates} point the point to compute elevation text from
     * @return {String} the elevation text to display in the label
     */
    compute3DObjectElevationText(point) {
        // convert the point to 4326 to get elevation
        point.as('EPSG:4326', pickedCoord4326);
        return `${pickedCoord4326.z.toFixed(this.decimals)} m`;
    }

    /**
     * Initialize all elements to display the measured elevation as a label with threejs: a threejs css 2D renderer,
     * a callback to render the label at each frame, the div holding the label and a threejs label object.
     */
    initLabel() {
        this.#labelRenderer = null;
        this.#labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.#labelRenderer.domElement.style.position = 'absolute';
        this.#labelRenderer.domElement.style.top = '0px';
        document.body.appendChild(this.#labelRenderer.domElement);

        this.renderLabel = this.renderLabel.bind(this);
        this.#view.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, this.renderLabel);

        const labelDiv = document.createElement('div');
        // hack to position the label above the click point: add a child div containing a translation (if we put it in
        // labelDiv directly, it gets overwritten by threejs CSS2DRenderer)
        const posLabel = document.createElement('div');
        posLabel.classList.add('label-elevation');
        const pointSize = this.clickPointMaterial.size;
        // Translation obtained empirically
        posLabel.style.transform = `translateY(${-((pointSize / 2) + 12)}px)`;
        labelDiv.appendChild(posLabel);
        this.#labelObj = null;
        this.#view.scene.add(this.#labelObj);

        this.onWindowResize = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.onWindowResize);
    }


    /**
     * Callback to render label (called at each frame)
     */
    renderLabel() {
        this.#labelRenderer.render(this.#view.scene, this.#view.camera.camera3D);
    }

    /**
     * Update label content and position
     * @param {String} textContent the new text of the label
     * @param {Vector3} position the new position of the label
     */
    updateLabel(textContent, position) {
        // Update the posLabel div textContent
        this.#labelObj.element.childNodes[0].textContent = textContent;
        this.#labelObj.position.copy(position);
        this.#labelObj.updateMatrixWorld();
    }

    /**
     * Remove label stuff: Div holding the labels, the render label function callback and the threejs label object.
     * Also initialize label related class properties to null.
     */
    removeLabel() {
        document.body.removeChild(this.#labelRenderer.domElement);
        this.#labelRenderer = null;
        this.#view.removeFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, this.renderLabel);
        this.#view.scene.remove(this.#labelObj);
        this.#labelObj = null;

        this.#view.notifyChange();
    }

    /**
     * Resize label renderer size
     */
    onWindowResize() {
        this.#labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Remove points objects, geometries, materials and textures and reinitialize points.
     */
    removePoints() {
        if (this.#movePoint) {
            const movePointGeom = this.#movePoint.geometry;
            this.#view.scene.remove(this.#movePoint);
            this.#movePoint = null;
            movePointGeom.dispose();
            this.movePointMaterial.dispose();
        }

        if (this.#clickPoint) {
            const clickPointGeom = this.#clickPoint.geometry;
            this.#view.scene.remove(this.#clickPoint);
            this.#clickPoint = null;
            clickPointGeom.dispose();
            this.clickPointMaterial.dispose();
        }

        POINT_TEXTURE.dispose();
    }
}

export default ElevationMeasure;
