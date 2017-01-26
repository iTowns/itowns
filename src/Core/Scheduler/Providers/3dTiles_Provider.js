import * as THREE from 'three';
import Provider from './Provider';
import B3dmLoader from '../../../Renderer/ThreeExtended/B3dmLoader';
import Fetcher from './Fetcher';
import BasicMaterial from '../../../Renderer/BasicMaterial';

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

function getBox(boundingVolume) {
    if (boundingVolume.region) {
        // TODO: unsupported
        return { region: boundingVolume.region };
    } else if (boundingVolume.box) {
        // TODO: only works for axis aligned boxes
        const box = boundingVolume.box;
        const center = new THREE.Vector3(box[0], box[1], box[2]);
        const w = center.x - box[3];
        const e = center.x + box[3];
        const s = center.y - box[7];
        const n = center.y + box[7];
        const b = center.z - box[11];
        const t = center.z + box[11];

        return { box: new THREE.Box3(new THREE.Vector3(w, s, b), new THREE.Vector3(e, n, t)) };
    } else if (boundingVolume.sphere) {
        // TODO
        return { sphere: undefined };
    }
}

$3dTiles_Provider.prototype.b3dmToMesh = function b3dmToMesh(data, layer) {
    return this.b3dmLoader.parse(data).then((result) => {
        const init = function f_init(mesh) {
            if (layer.overrideMaterials) {
                mesh.material = new BasicMaterial();
                mesh.material.uniforms.useRTC.value = false;
            }
            mesh.updateMatrix();
            mesh.updateMatrixWorld();
        };
        result.scene.traverse(init);
        return result.scene;
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
}

$3dTiles_Provider.prototype.executeCommand = function executeCommand(command) {
    const layer = command.layer;
    const metadata = command.metadata;

    const urlSuffix = metadata.content ? metadata.content.url : undefined;
    if (urlSuffix) {
        const url = layer.url + urlSuffix;

        const supportedFormats = {
            b3dm: this.b3dmToMesh.bind(this),
        };

        return Fetcher.arrayBuffer(url).then((result) => {
            if (result !== undefined) {
                let func;
                const magic = new TextDecoder('utf-8').decode(new Uint8Array(result, 0, 4));
                if (magic[0] === '{') {
                    // TODO: handle additional tileset
                } else if (magic == 'b3dm') {
                    func = supportedFormats.b3dm;
                }
                if (func) {
                    return func(result, layer).then((tile) => {
                        configureTile(tile, layer, metadata);
                        return tile;
                    });
                }
            }

            const tile = new THREE.Object3D();
            configureTile(tile, layer, metadata);
            return tile;
        });
    } else {
        return new Promise((resolve/* , reject*/) => {
            const tile = new THREE.Object3D();
            configureTile(tile, layer, metadata);
            resolve(tile);
        });
    }
};

export default $3dTiles_Provider;
