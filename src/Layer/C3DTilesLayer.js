import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import { init3dTilesLayer, pre3dTilesUpdate, process3dTilesNode } from 'Process/3dTilesProcessing';
import C3DTileset from 'Core/3DTiles/C3DTileset';
import C3DTExtensions from 'Core/3DTiles/C3DTExtensions';

const update = process3dTilesNode();

class C3DTilesLayer extends GeometryLayer {
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
     * @param {Function} [config.onTileContentLoaded] Callback executed when the content of a tile is loaded.
     * @param {Boolean|Material} [config.overrideMaterials='false'] option to override the materials of all the layer's
     * objects. If true, a threejs [MeshBasicMaterial](https://threejs.org/docs/index.html?q=meshbasic#api/en/materials/MeshBasicMaterial)
     * is set up. config.overrideMaterials can also be a threejs [Material](https://threejs.org/docs/index.html?q=material#api/en/materials/Material)
     * in which case it will be used as the material for all objects of the layer.
     * @param {C3DTExtensions} [config.registeredExtensions] 3D Tiles extensions managers registered for this tileset.
     * @param  {View}  view  The view
     */
    constructor(id, config, view) {
        super(id, new THREE.Group(), { source: config.source });
        this.isC3DTilesLayer = true;
        this.sseThreshold = config.sseThreshold || 16;
        this.cleanupDelay = config.cleanupDelay || 1000;
        this.onTileContentLoaded = config.onTileContentLoaded || (() => {});
        this.protocol = '3d-tiles';
        this.overrideMaterials = config.overrideMaterials ?? false;
        this.name = config.name;
        this.registeredExtensions = config.registeredExtensions || new C3DTExtensions();

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
     * Gets semantic information from batch table and batch table extensions
     * of an intersected feature.
     * @param {Array} intersects - @return An array containing all
     * targets picked under specified coordinates. Intersects can be
     * computed with view.pickObjectsAt(..). See fillHTMLWithPickingInfo()
     * in 3dTilesHelper.js for an example.
     * @returns {Object} - an object containing the batch id, the
     * information from the batch table and from the extension of the batch
     * table for an intersected feature.
     */
    getInfoFromIntersectObject(intersects) {
        const resultInfo = {};

        let batchID = -1;
        let batchTable = {};
        // First, we get the ID and the batch table of the intersected object.
        // (the semantic information about a feature is located in its batch
        // table (see 3D Tiles specification).
        for (let i = 0; i < intersects.length; i++) {
            // interAttributes are glTF attributes of b3dm tiles (i.e.
            // position, normal, batch id)
            const interAttributes = intersects[i].object.geometry.attributes;
            if (interAttributes && interAttributes._BATCHID) {
                // face is a Face3 object of THREE which is a
                // triangular face. face.a is its first vertex
                const vertex = intersects[i].face.a;
                // get batch id of the face
                batchID = interAttributes._BATCHID.array[vertex];
                batchTable = this.findBatchTable(intersects[i].object);
                break;
            }
        }

        if (batchID === -1) {
            return;
        }

        resultInfo.batchID = batchID;
        // get information from batch table (including from its extension)
        Object.assign(resultInfo, batchTable.getInfoById(batchID));

        return resultInfo;
    }
}

export default C3DTilesLayer;
