import * as THREE from 'three';
import Provider from './Provider';
import B3dmLoader from '../../../Renderer/ThreeExtended/B3dmLoader';
import PntsLoader from '../../../Renderer/ThreeExtended/PntsLoader';
import Fetcher from './Fetcher';
import OBB from '../../../Renderer/ThreeExtended/OBB';
import Extent from '../../Geographic/Extent';
import MathExtended from '../../Math/MathExtended';
import Capabilities from '../../System/Capabilities';
import PrecisionQualifier from '../../../Renderer/Shader/Chunk/PrecisionQualifier.glsl';
import { init3dTilesLayer } from '../../../Process/3dTilesProcessing';


function $3dTilesIndex(tileset, baseURL) {
    let counter = 0;
    this.index = {};
    const recurse = function recurse_f(node, baseURL) {
        this.index[counter] = node;
        node.tileId = counter;
        node.baseURL = baseURL;
        counter++;
        if (node.children) {
            for (const child of node.children) {
                recurse(child, baseURL);
            }
        }
    }.bind(this);
    recurse(tileset.root, baseURL);

    this.extendTileset = function extendTileset(tileset, nodeId, baseURL) {
        recurse(tileset.root, baseURL);
        this.index[nodeId].children = [tileset.root];
    };
}

function $3dTiles_Provider() {
    Provider.call(this);
    this.b3dmLoader = new B3dmLoader();
}

$3dTiles_Provider.prototype = Object.create(Provider.prototype);

$3dTiles_Provider.prototype.constructor = $3dTiles_Provider;

$3dTiles_Provider.prototype.removeLayer = function removeLayer() {

};

$3dTiles_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(layer, view, scheduler) {
    return Fetcher.json(layer.url, layer.networkOptions).then((tileset) => {
        layer.tileset = tileset;
        const urlPrefix = layer.url.slice(0, layer.url.lastIndexOf('/') + 1);
        layer.tileIndex = new $3dTilesIndex(tileset, urlPrefix);
        layer.asset = tileset.asset;
        return init3dTilesLayer(view, scheduler, layer, tileset.root);
    });
};

function getBox(volume, inverseTileTransform) {
    if (volume.region) {
        const region = volume.region;
        const extent = new Extent('EPSG:4326', MathExtended.radToDeg(region[0]), MathExtended.radToDeg(region[2]), MathExtended.radToDeg(region[1]), MathExtended.radToDeg(region[3]));
        const box = OBB.extentToOBB(extent, region[4], region[5]);
        // update position
        box.position.add(extent.center().as('EPSG:4978').xyz());
        // compute box.matrix from box.position/rotation.
        box.updateMatrix();
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

const rePosition = new RegExp('gl_Position.*(?![^]*gl_Position)');
const reMain = new RegExp('[^\\w]*main[^\\w]*(void)?[^\\w]*{');
export function patchMaterialForLogDepthSupport(material) {
    // Check if the shader does not already use the log depth buffer
    if (material.vertexShader.indexOf('USE_LOGDEPTHBUF') !== -1
        || material.vertexShader.indexOf('logdepthbuf_pars_vertex') !== -1) {
        return;
    }

    // Add vertex shader log depth buffer header
    material.vertexShader = `#include <logdepthbuf_pars_vertex>\n#define EPSILON 1e-6\n${material.vertexShader}`;
    // Add log depth buffer code snippet after last gl_Position modification
    let re = rePosition.exec(material.vertexShader);
    let idx = re[0].length + re.index;
    material.vertexShader = `${material.vertexShader.slice(0, idx)}\n#include <logdepthbuf_vertex>\n${material.vertexShader.slice(idx)}`;

    // Add fragment shader log depth buffer header
    material.fragmentShader = `${PrecisionQualifier}\n#include <logdepthbuf_pars_fragment>\n${material.fragmentShader}`;
    // Add log depth buffer code snippet at the first line of the main function
    re = reMain.exec(material.fragmentShader);
    idx = re[0].length + re.index;
    material.fragmentShader = `${material.fragmentShader.slice(0, idx)}\n#include <logdepthbuf_fragment>\n${material.fragmentShader.slice(idx)}`;

    material.defines = {
        USE_LOGDEPTHBUF: 1,
        USE_LOGDEPTHBUF_EXT: 1,
    };
}

$3dTiles_Provider.prototype.b3dmToMesh = function b3dmToMesh(data, layer) {
    return this.b3dmLoader.parse(data, layer.asset.gltfUpAxis).then((result) => {
        const init = function f_init(mesh) {
            mesh.frustumCulled = false;
            if (mesh.material) {
                if (layer.overrideMaterials) {
                    mesh.material = new THREE.MeshLambertMaterial(0xffffff);
                } else if (Capabilities.isLogDepthBufferSupported()
                            && mesh.material.isRawShaderMaterial
                            && !layer.doNotPatchMaterial) {
                    patchMaterialForLogDepthSupport(mesh.material);
                    // eslint-disable-next-line no-console
                    console.warn('b3dm shader has been patched to add log depth buffer support');
                }
            }
        };
        result.gltf.scene.traverse(init);
        const batchTable = result.batchTable;
        const object3d = result.gltf.scene;
        return { batchTable, object3d };
    });
};

$3dTiles_Provider.prototype.pntsParse = function pntsParse(data) {
    return new Promise((resolve) => {
        resolve({ object3d: PntsLoader.parse(data).point });
    });
};

function configureTile(tile, layer, metadata, parent) {
    tile.frustumCulled = false;
    tile.loaded = true;
    tile.layer = layer.id;

    // parse metadata
    tile.transform = metadata.transform ? (new THREE.Matrix4()).fromArray(metadata.transform) : new THREE.Matrix4();
    tile.applyMatrix(tile.transform);
    tile.geometricError = metadata.geometricError;
    tile.tileId = metadata.tileId;
    tile.additiveRefinement = (metadata.refine === 'add');
    tile.parentFromLocalTransform = tile.transform;
    tile.worldFromLocalTransform = new THREE.Matrix4().multiplyMatrices(parent ? parent.worldFromLocalTransform : new THREE.Matrix4(), tile.parentFromLocalTransform);
    const m = new THREE.Matrix4();
    m.getInverse(tile.worldFromLocalTransform);
    tile.viewerRequestVolume = metadata.viewerRequestVolume ? getBox(metadata.viewerRequestVolume, m) : undefined;
    tile.boundingVolume = getBox(metadata.boundingVolume, m);
    if (tile.boundingVolume.region) {
        tile.add(tile.boundingVolume.region);
    }
    tile.updateMatrixWorld();
}

const textDecoder = new TextDecoder('utf-8');
$3dTiles_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const metadata = command.metadata;
    const tile = new THREE.Object3D();
    configureTile(tile, layer, metadata, command.requester);
    const path = metadata.content ? metadata.content.url : undefined;
    const setLayer = (obj) => {
        obj.layers.set(layer.threejsLayer);
    };
    if (path) {
        // Check if we have relative or absolute url (with tileset's lopocs for example)
        const url = path.startsWith('http') ? path : metadata.baseURL + path;
        const supportedFormats = {
            b3dm: this.b3dmToMesh.bind(this),
            pnts: this.pntsParse.bind(this),
        };
        return Fetcher.arrayBuffer(url, layer.networkOptions).then((result) => {
            if (result !== undefined) {
                let func;
                const magic = textDecoder.decode(new Uint8Array(result, 0, 4));
                if (magic[0] === '{') {
                    result = JSON.parse(textDecoder.decode(new Uint8Array(result)));
                    const newPrefix = url.slice(0, url.lastIndexOf('/') + 1);
                    layer.tileIndex.extendTileset(result, metadata.tileId, newPrefix);
                } else if (magic == 'b3dm') {
                    func = supportedFormats.b3dm;
                } else if (magic == 'pnts') {
                    func = supportedFormats.pnts;
                } else {
                    Promise.reject(`Unsupported magic code ${magic}`);
                }
                if (func) {
                    // TODO: request should be delayed if there is a viewerRequestVolume
                    return func(result, layer).then((content) => {
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
        return new Promise((resolve) => {
            tile.traverse(setLayer);
            resolve(tile);
        });
    }
};

export default $3dTiles_Provider;
