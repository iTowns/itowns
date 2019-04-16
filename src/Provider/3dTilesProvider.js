import * as THREE from 'three';
import B3dmParser from 'Parser/B3dmParser';
import PntsParser from 'Parser/PntsParser';
import Fetcher from 'Provider/Fetcher';
import OBB from 'Renderer/OBB';
import Extent from 'Core/Geographic/Extent';
import { pre3dTilesUpdate, process3dTilesNode, init3dTilesLayer } from 'Process/3dTilesProcessing';
import utf8Decoder from 'Utils/Utf8Decoder';


/** @classdesc
 * Class mapping 3D Tiles extensions names to their associated parsing methods.
 */
class $3DTilesExtensions {
    constructor() {
        this.extensionsMap = new Map();
    }

    /**
     * Register a 3D Tiles extension: Maps an extension name to its parser
     * @param {String} extensionName - Name of the extension
     * @param {Function} parser - The function for parsing the extension
     */
    registerExtension(extensionName, parser) {
        this.extensionsMap.set(extensionName, parser);
    }

    /**
     * Get the parser of a given extension
     * @param {String} extensionName - Name of the extension
     * @returns {Function} - The function for parsing the extension
     */
    getParser(extensionName) {
        return this.extensionsMap.get(extensionName);
    }

    /**
     * Test if an extension is registered
     * @param {String} extensionName - Name of the extension
     * @returns {boolean} - true if the extension is registered and false
     * otherwise
     */
    isExtensionRegistered(extensionName) {
        return this.extensionsMap.has(extensionName);
    }
}

/**
 * Global object holding 3D Tiles extensions. Extensions must be registered
 * with their parser by the client.
 * @type {$3DTilesExtensions}
 */
export const $3dTilesExtensions = new $3DTilesExtensions();

/** @classdesc
 * Abstract class for 3DTiles Extensions. Extensions implemented by the user
 * must inherit from this class. Example of extension extending this class:
 *  [BatchTableHierarchyExtension]{@link BatchTableHierarchyExtension}
 */
export class $3dTilesAbstractExtension {
    constructor() {
        if (this.constructor === $3dTilesAbstractExtension) {
            throw new TypeError('Abstract class "AbstractExtension" ' +
                'cannot be instantiated directly');
        }
    }

    /**
     * Method to get the displayable information related to a given feature
     * from an extension. All extensions must implement it (event if it
     * returns an empty object).
     * @param {integer} featureId - id of the feature
     */
    // disable warning saying that we don't use 'this' in this method
    // eslint-disable-next-line
    getPickingInfo(featureId) {
        throw new Error('You must implement getPickingInfo function ' +
            'in your extension');
    }
}

export function $3dTilesIndex(tileset, baseURL) {
    let counter = 1;
    this.index = {};
    const inverseTileTransform = new THREE.Matrix4();
    const recurse = function recurse_f(node, baseURL, parent) {
        // compute transform (will become Object3D.matrix when the object is downloaded)
        node.transform = node.transform ? (new THREE.Matrix4()).fromArray(node.transform) : undefined;

        // The only reason to store _worldFromLocalTransform is because of extendTileset where we need the
        // transform chain for one node.
        node._worldFromLocalTransform = node.transform;
        if (parent && parent._worldFromLocalTransform) {
            if (node.transform) {
                node._worldFromLocalTransform = new THREE.Matrix4().multiplyMatrices(
                    parent._worldFromLocalTransform, node.transform);
            } else {
                node._worldFromLocalTransform = parent._worldFromLocalTransform;
            }
        }

        // getBox only use inverseTileTransform for volume.region so let's not
        // compute the inverse matrix each time
        // Assumes that node.boundingVolume is defined if node.viewerRequestVolume is undefined
        if ((node.viewerRequestVolume && node.viewerRequestVolume.region)
            || node.boundingVolume.region) {
            if (node._worldFromLocalTransform) {
                inverseTileTransform.getInverse(node._worldFromLocalTransform);
            } else {
                inverseTileTransform.identity();
            }
        }

        node.viewerRequestVolume = node.viewerRequestVolume ? getBox(node.viewerRequestVolume, inverseTileTransform) : undefined;
        node.boundingVolume = getBox(node.boundingVolume, inverseTileTransform);

        this.index[counter] = node;
        node.tileId = counter;
        node.baseURL = baseURL;
        counter++;
        if (node.children) {
            for (const child of node.children) {
                recurse(child, baseURL, node);
            }
        }
    }.bind(this);
    recurse(tileset.root, baseURL);

    this.extendTileset = function extendTileset(tileset, nodeId, baseURL) {
        recurse(tileset.root, baseURL, this.index[nodeId]);
        this.index[nodeId].children = [tileset.root];
        this.index[nodeId].isTileset = true;
    };
}

export function getObjectToUpdateForAttachedLayers(meta) {
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

function preprocessDataLayer(layer, view, scheduler) {
    layer.preUpdate = layer.preUpdate || pre3dTilesUpdate;
    layer.update = layer.update || process3dTilesNode();
    layer.sseThreshold = layer.sseThreshold || 16;
    layer.cleanupDelay = layer.cleanupDelay || 1000;
    // override the default method, since updated objects are metadata in this case
    layer.getObjectToUpdateForAttachedLayers = getObjectToUpdateForAttachedLayers;

    layer._cleanableTiles = [];
    return Fetcher.json(layer.url, layer.networkOptions).then((tileset) => {
        layer.tileset = tileset;
        // Verify that extensions of the tileset have been registered to
        // $3dTilesExtensions
        if (tileset.extensionsUsed) {
            for (const extensionUsed of tileset.extensionsUsed) {
                // if current extension is not registered
                if (!$3dTilesExtensions.isExtensionRegistered(extensionUsed)) {
                    if (tileset.extensionsRequired &&
                        tileset.extensionsRequired.includes(extensionUsed)) {
                        console.error(
                            `3D Tiles tileset required extension "${extensionUsed}" must be registered to $3dTilesExtensions global object of iTowns to be parsed and used.`);
                    } else {
                        console.warn(
                            `3D Tiles tileset used extension "${extensionUsed}" must be registered to $3dTilesExtensions global object of iTowns to be parsed and used.`);
                    }
                }
            }
        }
        const urlPrefix = layer.url.slice(0, layer.url.lastIndexOf('/') + 1);
        layer.tileIndex = new $3dTilesIndex(tileset, urlPrefix);
        layer.asset = tileset.asset;
        return init3dTilesLayer(view, scheduler, layer, tileset.root);
    });
}
const extent = new Extent('EPSG:4326', 0, 0, 0, 0);
function getBox(volume, inverseTileTransform) {
    if (volume.region) {
        const region = volume.region;
        extent.set(
            THREE.Math.radToDeg(region[0]),
            THREE.Math.radToDeg(region[2]),
            THREE.Math.radToDeg(region[1]),
            THREE.Math.radToDeg(region[3]));
        const box = new OBB().setFromExtent(extent);
        // at this point box.matrix = box.epsg4978_from_local, so
        // we transform it in parent_from_local by using parent's epsg4978_from_local
        // which from our point of view is epsg4978_from_parent.
        // box.matrix = (epsg4978_from_parent ^ -1) * epsg4978_from_local
        //            =  parent_from_epsg4978 * epsg4978_from_local
        //            =  parent_from_local
        box.matrix.premultiply(inverseTileTransform);
        // update position, rotation and scale
        box.matrix.decompose(box.position, box.quaternion, box.scale);
        return { region: box };
    } else if (volume.box) {
        // TODO: only works for axis aligned boxes
        const box = volume.box;
        // box[0], box[1], box[2] = center of the box
        // box[3], box[4], box[5] = x axis direction and half-length
        // box[6], box[7], box[8] = y axis direction and half-length
        // box[9], box[10], box[11] = z axis direction and half-length
        const center = new THREE.Vector3(box[0], box[1], box[2]);
        const w = center.x - box[3];
        const e = center.x + box[3];
        const s = center.y - box[7];
        const n = center.y + box[7];
        const b = center.z - box[11];
        const t = center.z + box[11];

        return { box: new THREE.Box3(new THREE.Vector3(w, s, b), new THREE.Vector3(e, n, t)) };
    } else if (volume.sphere) {
        const sphere = new THREE.Sphere(new THREE.Vector3(volume.sphere[0], volume.sphere[1], volume.sphere[2]), volume.sphere[3]);
        return { sphere };
    }
}

function b3dmToMesh(data, layer, url) {
    const urlBase = THREE.LoaderUtils.extractUrlBase(url);
    const options = {
        gltfUpAxis: layer.asset.gltfUpAxis,
        urlBase,
        overrideMaterials: layer.overrideMaterials,
        doNotPatchMaterial: layer.doNotPatchMaterial,
        opacity: layer.opacity,
    };
    return B3dmParser.parse(data, options).then((result) => {
        const batchTable = result.batchTable;
        const object3d = result.gltf.scene;
        return { batchTable, object3d };
    });
}

function pntsParse(data, layer) {
    return PntsParser.parse(data).then((result) => {
        const material = layer.material ?
            layer.material.clone() :
            new THREE.PointsMaterial({ size: 0.05, vertexColors: THREE.VertexColors });

        // creation points with geometry and material
        const points = new THREE.Points(result.point.geometry, material);

        if (result.point.offset) {
            points.position.copy(result.point.offset);
        }

        return { object3d: points };
    });
}

export function configureTile(tile, layer, metadata, parent) {
    tile.frustumCulled = false;
    tile.layer = layer;

    // parse metadata
    if (metadata.transform) {
        tile.applyMatrix(metadata.transform);
    }
    tile.geometricError = metadata.geometricError;
    tile.tileId = metadata.tileId;
    if (metadata.refine) {
        tile.additiveRefinement = (metadata.refine.toUpperCase() === 'ADD');
    } else {
        tile.additiveRefinement = parent ? (parent.additiveRefinement) : false;
    }
    tile.viewerRequestVolume = metadata.viewerRequestVolume;
    tile.boundingVolume = metadata.boundingVolume;
    if (tile.boundingVolume.region) {
        tile.add(tile.boundingVolume.region);
    }
    tile.updateMatrixWorld();
}

function executeCommand(command) {
    const layer = command.layer;
    const metadata = command.metadata;
    const tile = new THREE.Object3D();
    configureTile(tile, layer, metadata, command.requester);
    // Patch for supporting 3D Tiles pre 1.0 (metadata.content.url) and 1.0
    // (metadata.content.uri)
    const path = metadata.content && (metadata.content.url || metadata.content.uri);

    const setLayer = (obj) => {
        obj.layers.set(layer.threejsLayer);
        obj.userData.metadata = metadata;
        obj.layer = layer;
        if (obj.material) {
            obj.material.transparent = layer.opacity < 1.0;
            obj.material.opacity = layer.opacity;
            obj.material.wireframe = layer.wireframe;
        }
    };
    if (path) {
        // Check if we have relative or absolute url (with tileset's lopocs for example)
        const url = path.startsWith('http') ? path : metadata.baseURL + path;
        const supportedFormats = {
            b3dm: b3dmToMesh,
            pnts: pntsParse,
        };
        return Fetcher.arrayBuffer(url, layer.networkOptions).then((result) => {
            if (result !== undefined) {
                let func;
                const magic = utf8Decoder.decode(new Uint8Array(result, 0, 4));
                if (magic[0] === '{') {
                    result = JSON.parse(utf8Decoder.decode(new Uint8Array(result)));
                    const newPrefix = url.slice(0, url.lastIndexOf('/') + 1);
                    layer.tileIndex.extendTileset(result, metadata.tileId, newPrefix);
                } else if (magic == 'b3dm') {
                    func = supportedFormats.b3dm;
                } else if (magic == 'pnts') {
                    func = supportedFormats.pnts;
                } else {
                    return Promise.reject(`Unsupported magic code ${magic}`);
                }
                if (func) {
                    // TODO: request should be delayed if there is a viewerRequestVolume
                    return func(result, layer, url).then((content) => {
                        tile.content = content.object3d;
                        if (content.batchTable) {
                            tile.batchTable = content.batchTable;
                        }
                        tile.add(content.object3d);
                        tile.traverse(setLayer);
                        return tile;
                    });
                }
            }
            tile.traverse(setLayer);
            return tile;
        });
    } else {
        tile.traverse(setLayer);
        return Promise.resolve(tile);
    }
}

export default {
    preprocessDataLayer,
    executeCommand,
};
