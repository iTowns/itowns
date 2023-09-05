import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import { init3dTilesLayer, pre3dTilesUpdate, process3dTilesNode } from 'Process/3dTilesProcessing';
import C3DTileset from 'Core/3DTiles/C3DTileset';
import C3DTExtensions from 'Core/3DTiles/C3DTExtensions';
import { PNTS_MODE, PNTS_SHAPE, PNTS_SIZE_MODE } from 'Renderer/PointsMaterial';
// eslint-disable-next-line no-unused-vars
import Style from 'Core/Style';
import C3DTFeature from 'Core/3DTiles/C3DTFeature';
import { optimizeGeometryGroups } from 'Utils/ThreeUtils';

export const C3DTILES_LAYER_EVENTS = {
    /**
     * Fires when a tile content has been loaded
     * @event C3DTilesLayer#on-tile-content-loaded
     * @type {object}
     * @property {THREE.Object3D} tileContent - object3D of the tile
     */
    ON_TILE_CONTENT_LOADED: 'on-tile-content-loaded',
    /**
     * Fires when a tile is requested
     * @event C3DTilesLayer#on-tile-requested
     * @type {object}
     * @property {object} metadata - tile
     */
    ON_TILE_REQUESTED: 'on-tile-requested',
};

const update = process3dTilesNode();

class C3DTilesLayer extends GeometryLayer {
    #fillColorMaterialsBuffer;
    /**
     * Constructs a new instance of 3d tiles layer.
     * @constructor
     * @extends GeometryLayer
     *
     * @example
     * // Create a new 3d-tiles layer from a web server
     * const l3dt = new C3DTilesLayer('3dtiles', {
     *      name: '3dtl',
     *      source: new C3DTilesSource({
     *           url: 'https://tileset.json'
     *      })
     * }, view);
     * View.prototype.addLayer.call(view, l3dt);
     *
     * // Create a new 3d-tiles layer from a Cesium ion server
     * const l3dt = new C3DTilesLayer('3dtiles', {
     *      name: '3dtl',
     *      source: new C3DTilesIonSource({
     *              accessToken: 'myAccessToken',
                    assetId: 12
     *      })
     * }, view);
     * View.prototype.addLayer.call(view, l3dt);
     *
     * @param      {string}  id - The id of the layer, that should be unique.
     *     It is not mandatory, but an error will be emitted if this layer is
     *     added a
     * {@link View} that already has a layer going by that id.
     * @param      {object}  config   configuration, all elements in it
     * will be merged as is in the layer.
     * @param {C3TilesSource} config.source The source of 3d Tiles.
     *
     * name.
     * @param {Number} [config.sseThreshold=16] The [Screen Space Error](https://github.com/CesiumGS/3d-tiles/blob/main/specification/README.md#geometric-error)
     * threshold at which child nodes of the current node will be loaded and added to the scene.
     * @param {Number} [config.cleanupDelay=1000] The time (in ms) after which a tile content (and its children) are
     * removed from the scene.
     * @param {C3DTExtensions} [config.registeredExtensions] 3D Tiles extensions managers registered for this tileset.
     * @param {String} [config.pntsMode= PNTS_MODE.COLOR] {@link PointsMaterials} Point cloud coloring mode. Only 'COLOR' or 'CLASSIFICATION' are possible. COLOR uses RGB colors of the points, CLASSIFICATION uses a classification property of the batch table to color points.
     * @param {String} [config.pntsShape= PNTS_SHAPE.CIRCLE] Point cloud point shape. Only 'CIRCLE' or 'SQUARE' are possible.
     * @param {String} [config.pntsSizeMode= PNTS_SIZE_MODE.VALUE] {@link PointsMaterials} Point cloud size mode. Only 'VALUE' or 'ATTENUATED' are possible. VALUE use constant size, ATTENUATED compute size depending on distance from point to camera.
     * @param {Number} [config.pntsMinAttenuatedSize=3] Minimum scale used by 'ATTENUATED' size mode
     * @param {Number} [config.pntsMaxAttenuatedSize=10] Maximum scale used by 'ATTENUATED' size mode
     * @param {Style} [config.style=null] - style used for this layer
     * @param  {View}  view  The view
     */
    constructor(id, config, view) {
        super(id, new THREE.Group(), { source: config.source });
        this.isC3DTilesLayer = true;
        this.sseThreshold = config.sseThreshold || 16;
        this.cleanupDelay = config.cleanupDelay || 1000;
        this.protocol = '3d-tiles';
        this.name = config.name;
        this.registeredExtensions = config.registeredExtensions || new C3DTExtensions();

        this.pntsMode = PNTS_MODE.COLOR;
        this.pntsShape = PNTS_SHAPE.CIRCLE;
        this.classification = config.classification;
        this.pntsSizeMode = PNTS_SIZE_MODE.VALUE;
        this.pntsMinAttenuatedSize = config.pntsMinAttenuatedSize || 3;
        this.pntsMaxAttenuatedSize = config.pntsMaxAttenuatedSize || 10;

        if (config.pntsMode) {
            const exists = Object.values(PNTS_MODE).includes(config.pntsMode);
            if (!exists) {
                console.warn("The points cloud mode doesn't exist. Use 'COLOR' or 'CLASSIFICATION' instead.");
            } else {
                this.pntsMode = config.pntsMode;
            }
        }

        if (config.pntsShape) {
            const exists = Object.values(PNTS_SHAPE).includes(config.pntsShape);
            if (!exists) {
                console.warn("The points cloud point shape doesn't exist. Use 'CIRCLE' or 'SQUARE' instead.");
            } else {
                this.pntsShape = config.pntsShape;
            }
        }

        if (config.pntsSizeMode) {
            const exists = Object.values(PNTS_SIZE_MODE).includes(config.pntsSizeMode);
            if (!exists) { console.warn("The points cloud size mode doesn't exist. Use 'VALUE' or 'ATTENUATED' instead."); } else { this.pntsSizeMode = config.pntsSizeMode; }
        }

        /** @type {Style} */
        this._style = config.style || null;

        /** @type {Map<string, THREE.MeshStandardMaterial>} */
        this.#fillColorMaterialsBuffer = new Map();

        /**
         * Map all C3DTFeature of the layer according their tileId and their batchId
         * Map< tileId, Map< batchId, C3DTFeature>>
         *
         * @type {Map<number, Map<number,C3DTFeature>>}
         */
        this.tilesC3DTileFeatures = new Map();

        if (config.onTileContentLoaded) {
            console.warn('DEPRECATED onTileContentLoaded should not be passed at the contruction, use C3DTILES_LAYER_EVENTS.ON_TILE_CONTENT_LOADED event instead');
            this.addEventListener(C3DTILES_LAYER_EVENTS.ON_TILE_CONTENT_LOADED, config.onTileContentLoaded);
        }

        if (config.overrideMaterials) {
            console.warn('overrideMaterials is deprecated, use style API instead');
            this.overrideMaterials = config.overrideMaterials;
        }

        this._cleanableTiles = [];

        const resolve = this.addInitializationStep();

        this.source.whenReady.then((tileset) => {
            this.tileset = new C3DTileset(tileset, this.source.baseUrl, this.registeredExtensions);
            // Verify that extensions of the tileset have been registered in the layer
            if (this.tileset.extensionsUsed) {
                for (const extensionUsed of this.tileset.extensionsUsed) {
                    // if current extension is not registered
                    if (!this.registeredExtensions.isExtensionRegistered(extensionUsed)) {
                        // if it is required to load the tileset
                        if (this.tileset.extensionsRequired &&
                            this.tileset.extensionsRequired.includes(extensionUsed)) {
                            console.error(
                                `3D Tiles tileset required extension "${extensionUsed}" must be registered to the 3D Tiles layer of iTowns to be parsed and used.`);
                        } else {
                            console.warn(
                                `3D Tiles tileset used extension "${extensionUsed}" must be registered to the 3D Tiles layer of iTowns to be parsed and used.`);
                        }
                    }
                }
            }
            // TODO: Move all init3dTilesLayer code to constructor
            init3dTilesLayer(view, view.mainLoop.scheduler, this, tileset.root).then(resolve);
        });
    }

    preUpdate() {
        return pre3dTilesUpdate.bind(this)();
    }

    update(context, layer, node) {
        return update(context, layer, node);
    }

    getObjectToUpdateForAttachedLayers(meta) {
        if (meta.content) {
            const result = [];
            meta.content.traverse((obj) => {
                if (obj.isObject3D && obj.material && obj.layer == meta.layer) {
                    result.push(obj);
                }
            });
            const p = meta.parent;
            if (p && p.content) {
                return {
                    elements: result,
                    parent: p.content,
                };
            } else {
                return {
                    elements: result,
                };
            }
        }
    }

    /**
     * Finds the batch table of an object in a 3D Tiles layer. This is
     * for instance needed when picking because we pick the geometric
     * object which is not at the same level in the layer structure as
     * the batch table. More details here on itowns internal
     * organization of 3DTiles:
     *  https://github.com/MEPP-team/RICT/blob/master/Doc/iTowns/Doc.md#itowns-internal-organisation-of-3d-tiles-data
     * @param {THREE.Object3D} object - a 3D geometric object
     * @returns {C3DTBatchTable} - the batch table of the object
     */
    findBatchTable(object) {
        if (object.batchTable) {
            return object.batchTable;
        }
        if (object.parent) {
            return this.findBatchTable(object.parent);
        }
    }

    /**
     * Get the closest c3DTileFeature of an intersects array.
     * @param {Array} intersects - @return An array containing all
     * targets picked under specified coordinates. Intersects can be
     * computed with view.pickObjectsAt(..). See fillHTMLWithPickingInfo()
     * in 3dTilesHelper.js for an example.
     * @returns {C3DTileFeature} - the closest C3DTileFeature of the intersects array
     */
    getC3DTileFeatureFromIntersectsArray(intersects) {
        // find closest intersect with an attributes _BATCHID + face != undefined
        let closestIntersect = null;
        for (let index = 0; index < intersects.length; index++) {
            const i = intersects[index];
            if (i.object.geometry &&
                i.object.geometry.attributes._BATCHID &&
                i.face && // need face to get batch id
                i.layer == this // just to be sure that the right layer intersected
            ) {
                closestIntersect = i;
                break;
            }
        }

        if (!closestIntersect) {
            return null;
        }

        // function find the tile id from an object
        function findTileID(object) {
            let currentObject = object;
            let result = currentObject.tileId;
            while (isNaN(result) && currentObject.parent) {
                currentObject = currentObject.parent;
                result = currentObject.tileId;
            }

            return result;
        }

        const tileId = findTileID(closestIntersect.object);
        // face is a Face3 object of THREE which is a
        // triangular face. face.a is its first vertex
        const vertex = closestIntersect.face.a;
        const batchID = closestIntersect.object.geometry.attributes._BATCHID.array[vertex];

        return this.tilesC3DTileFeatures.get(tileId).get(batchID);
    }

    /**
     * Call by {@link 3dTilesProcessing} which handle load and unload of 3DTiles
     * @param {THREE.Object3D} tileContent - tile as THREE.Object3D
     */
    onTileContentLoaded(tileContent) {
        this.initC3DTileFeatures(tileContent);

        // notify observer
        this.dispatchEvent({ type: C3DTILES_LAYER_EVENTS.ON_TILE_CONTENT_LOADED, tileContent });
    }

    /**
     * Initialize C3DTileFeatures from tileContent
     *
     * @param {THREE.Object3D} tileContent - tile as THREE.Object3D
     */
    initC3DTileFeatures(tileContent) {
        tileContent.traverse((child) => {
            if (child.geometry && child.geometry.attributes._BATCHID) {
                this.tilesC3DTileFeatures.set(tileContent.tileId, new Map());// initialize
                const batchTable = this.findBatchTable(child);
                if (!batchTable) {
                    throw new Error('no batchTable');
                }

                const geometryAttributes = child.geometry.attributes;
                let currentBatchId = geometryAttributes._BATCHID.array[0];
                let start = 0;
                let count = 0;

                const registerBatchIdGroup = () => {
                    if (this.tilesC3DTileFeatures.get(tileContent.tileId).has(currentBatchId)) {
                        // already created
                        const c3DTileFeature = this.tilesC3DTileFeatures.get(tileContent.tileId).get(currentBatchId);
                        // add new group
                        c3DTileFeature.groups.push({
                            start,
                            count,
                        });
                    } else {
                        // first occurence
                        const c3DTileFeature = new C3DTFeature(
                            tileContent.tileId,
                            currentBatchId,
                            [{ start, count }], // initialize with current group
                            batchTable.getInfoById(currentBatchId),
                        );
                        this.tilesC3DTileFeatures.get(tileContent.tileId).set(currentBatchId, c3DTileFeature);
                    }
                };

                for (let index = 0; index < geometryAttributes.position.array.length; index += geometryAttributes.position.itemSize) {
                    const batchIndex = index / geometryAttributes.position.itemSize;
                    const batchId = geometryAttributes._BATCHID.array[batchIndex];

                    // check if batchId is currentBatchId
                    if (currentBatchId !== batchId) {
                        registerBatchIdGroup();

                        // reset
                        currentBatchId = batchId;
                        start = batchIndex;
                        count = 0;
                    }

                    // record this position in current C3DTileFeature
                    count++;

                    // check if end of the array
                    if (index + geometryAttributes.position.itemSize >= geometryAttributes.position.array.length) {
                        registerBatchIdGroup();
                    }
                }
            }
        });

        this.updateStyle([tileContent.tileId]);// only update tile batchelement
    }

    /**
     * Compute world box 3 of a c3DTFeature
     *
     * @param {C3DTFeature} c3DTFeature - feature to compute world box3
     * @param {THREE.Box3} [target] - result instance
     * @returns {THREE.Box3}
     */
    computeWorldBox3(c3DTFeature, target = new THREE.Box3()) {
        // reset
        target.max.x = -Infinity;
        target.max.y = -Infinity;
        target.max.z = -Infinity;
        target.min.x = Infinity;
        target.min.y = Infinity;
        target.min.z = Infinity;

        const tileContent = this.object3d.getObjectByProperty('tileId', c3DTFeature.tileId);
        tileContent.traverse((child) => {
            if (child.geometry && child.geometry.attributes._BATCHID) {
                c3DTFeature.groups.forEach((group) => {
                    const positionIndexStart = group.start * 3;
                    const positionIndexCount = (group.start + group.count) * 3;

                    for (let index = positionIndexStart; index < positionIndexCount; index += 3) {
                        const x = child.geometry.attributes.position.array[index];
                        const y = child.geometry.attributes.position.array[index + 1];
                        const z = child.geometry.attributes.position.array[index + 2];

                        target.max.x = Math.max(x, target.max.x);
                        target.max.y = Math.max(y, target.max.y);
                        target.max.z = Math.max(z, target.max.z);

                        target.min.x = Math.min(x, target.min.x);
                        target.min.y = Math.min(y, target.min.y);
                        target.min.z = Math.min(z, target.min.z);
                    }
                });

                target.applyMatrix4(child.matrixWorld);
            }
        });

        return target;
    }

    /**
     * Update style of the C3DTFeatures, an allowList of tile id can be passed to only update certain tile.
     * Note that this function only update THREE.Object3D materials, in order to see style changes you should call view.notifyChange()
     *
     * @param {Array<number>|null} [allowTileIdList] - tile ids to allow in updateStyle computation if null all tiles are updated
     * @returns {boolean} true if style updated false otherwise
     */
    updateStyle(allowTileIdList = null) {
        if (!this._style) {
            return false;
        }

        const currentMaterials = [];// list materials used for this update
        this.object3d.traverse((object) => {
            if (this.tilesC3DTileFeatures.has(object.tileId)) {
                // object is a tile content
                const c3DTileFeatures = this.tilesC3DTileFeatures.get(object.tileId);
                object.traverse((child) => {
                    if (child.geometry && child.geometry.attributes._BATCHID) {
                        // check if tile feature should be updated
                        if (!(allowTileIdList && !allowTileIdList.includes(object.tileId))) {
                            // clear
                            child.geometry.clearGroups();
                            child.material = [];

                            // eslint-disable-next-line no-unused-vars
                            for (const [batchId, c3DTileFeature] of c3DTileFeatures) {
                                /** @type {THREE.Color} */
                                let color = null;
                                if (typeof this._style.fill.color === 'function') {
                                    color = new THREE.Color(this._style.fill.color(c3DTileFeature));
                                } else {
                                    color = new THREE.Color(this._style.fill.color);
                                }

                                /** @type {number} */
                                let opacity = null;
                                if (typeof this._style.fill.opacity === 'function') {
                                    opacity = this._style.fill.opacity(c3DTileFeature);
                                } else {
                                    opacity = this._style.fill.opacity;
                                }

                                const materialId = color.getHexString() + opacity;

                                let material = null;
                                if (this.#fillColorMaterialsBuffer.has(materialId)) {
                                    material = this.#fillColorMaterialsBuffer.get(materialId);
                                } else {
                                    material = new THREE.MeshStandardMaterial({ color, opacity, transparent: opacity < 1, alphaTest: 0.09 });
                                    this.#fillColorMaterialsBuffer.set(materialId, material);// bufferize
                                }

                                // compute materialIndex
                                let materialIndex = -1;
                                for (let index = 0; index < child.material.length; index++) {
                                    const childMaterial = child.material[index];
                                    if (material.uuid === childMaterial.uuid) {
                                        materialIndex = index;
                                        break;
                                    }
                                }
                                if (materialIndex < 0) {
                                    // not in child.material add it
                                    child.material.push(material);
                                    materialIndex = child.material.length - 1;
                                }

                                // materialIndex groups is computed
                                c3DTileFeature.groups.forEach((group) => {
                                    child.geometry.addGroup(group.start, group.count, materialIndex);
                                });
                            }

                            optimizeGeometryGroups(child);
                        }

                        // record material(s) used in child
                        if (child.material instanceof Array) {
                            child.material.forEach((material) => {
                                if (!currentMaterials.includes(material)) {
                                    currentMaterials.push(material);
                                }
                            });
                        } else if (!currentMaterials.includes(child.material)) {
                            currentMaterials.push(child.material);
                        }
                    }
                });
            }
        });

        // remove buffered materials not in currentMaterials
        for (const [id, fillMaterial] of this.#fillColorMaterialsBuffer) {
            if (!currentMaterials.includes(fillMaterial)) {
                fillMaterial.dispose();
                this.#fillColorMaterialsBuffer.delete(id);
            }
        }

        return true;
    }

    get materialCount() {
        return this.#fillColorMaterialsBuffer.size;
    }

    set style(value) {
        this._style = value;
        this.updateStyle();
    }

    get style() {
        return this._style;
    }
}

export default C3DTilesLayer;
