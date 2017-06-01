import * as THREE from 'three';
import Provider from './Provider';
import B3dmLoader from '../../../Renderer/ThreeExtended/B3dmLoader';
import PntsLoader from '../../../Renderer/ThreeExtended/PntsLoader';
import Fetcher from './Fetcher';
import BasicMaterial from '../../../Renderer/BasicMaterial';
import OBB from '../../../Renderer/ThreeExtended/OBB';
import Extent from '../../Geographic/Extent';
import MathExtended from '../../Math/MathExtended';


export function $3dTilesIndex(tileset, urlPrefix) {
    let counter = 0;
    this.index = {};
    const recurse = function recurse_f(node, urlPrefix) {
        this.index[counter] = node;
        node.tileId = counter;
        node.urlPrefix = urlPrefix;
        counter++;
        if (node.children) {
            for (const child of node.children) {
                recurse(child, urlPrefix);
            }
        }
    }.bind(this);
    recurse(tileset.root, urlPrefix);

    this.extendTileset = function extendTileset(tileset, nodeId, urlPrefix) {
        recurse(tileset.root, urlPrefix);
        this.index[nodeId].children = [tileset.root];
    };
}

function $3dTiles_Provider(/* options*/) {
    // Constructor

    Provider.call(this);
    this.b3dmLoader = new B3dmLoader();
}

$3dTiles_Provider.prototype = Object.create(Provider.prototype);

$3dTiles_Provider.prototype.constructor = $3dTiles_Provider;

$3dTiles_Provider.prototype.removeLayer = function removeLayer(/* idLayer*/) {

};

$3dTiles_Provider.prototype.preprocessDataLayer = function preprocessDataLayer(/* layer*/) {

};

function getBox(volume) {
    if (volume.region) {
        const region = volume.region;
        const extent = new Extent('EPSG:4326', MathExtended.radToDeg(region[0]), MathExtended.radToDeg(region[2]), MathExtended.radToDeg(region[1]), MathExtended.radToDeg(region[3]));
        const box = OBB.extentToOBB(extent, region[4], region[5]);
        box.position.copy(box.centerWorld);
        box.updateMatrix();
        box.updateMatrixWorld();
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

$3dTiles_Provider.prototype.b3dmToMesh = function b3dmToMesh(data, layer) {
    return this.b3dmLoader.parse(data).then((result) => {
        const init = function f_init(mesh) {
            if (layer.overrideMaterials) {
                mesh.material = new BasicMaterial();
                mesh.material.uniforms.useRTC.value = false;
            }
        };
        result.scene.applyMatrix(layer.glTFRotation);
        result.scene.traverse(init);
        return result.scene;
    });
};

$3dTiles_Provider.prototype.pntsParse = function pntsParse(data) {
    return new Promise((resolve) => {
        resolve(PntsLoader.parse(data));
    });
};

function configureTile(tile, layer, metadata) {
    tile.frustumCulled = false;
    tile.loaded = true;
    tile.layer = layer.id;

    // parse metadata
    tile.transform = metadata.transform ? (new THREE.Matrix4()).fromArray(metadata.transform) : new THREE.Matrix4();
    tile.applyMatrix(tile.transform);
    tile.geometricError = metadata.geometricError;
    tile.tileId = metadata.tileId;
    tile.additiveRefinement = (metadata.refine === 'add');
    tile.boundingVolume = getBox(metadata.boundingVolume);
    tile.viewerRequestVolume = metadata.viewerRequestVolume ? getBox(metadata.viewerRequestVolume) : undefined;
}

const textDecoder = new TextDecoder('utf-8');
$3dTiles_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const metadata = command.metadata;

    const tile = new THREE.Object3D();
    configureTile(tile, layer, metadata);
    const urlSuffix = metadata.content ? metadata.content.url : undefined;
    const setLayer = (obj) => {
        obj.layers.set(layer.threejsLayer);
    };
    if (urlSuffix) {
        const url = metadata.urlPrefix + urlSuffix;

        const supportedFormats = {
            b3dm: this.b3dmToMesh.bind(this),
            pnts: this.pntsParse.bind(this),
        };

        return Fetcher.arrayBuffer(url).then((result) => {
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
                        tile.add(content);
                        tile.traverse(setLayer);
                        return tile;
                    });
                }
            }

            tile.traverse(setLayer);
            return tile;
        });
    } else {
        return new Promise((resolve/* , reject*/) => {
            tile.traverse(setLayer);
            resolve(tile);
        });
    }
};

export default $3dTiles_Provider;
