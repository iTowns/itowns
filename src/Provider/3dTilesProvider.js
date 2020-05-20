import * as THREE from 'three';
import B3dmParser from 'Parser/B3dmParser';
import PntsParser from 'Parser/PntsParser';
import Fetcher from 'Provider/Fetcher';
import utf8Decoder from 'Utils/Utf8Decoder';

function b3dmToMesh(data, layer, url) {
    const urlBase = THREE.LoaderUtils.extractUrlBase(url);
    const options = {
        gltfUpAxis: layer.tileset.asset.gltfUpAxis,
        urlBase,
        overrideMaterials: layer.overrideMaterials,
        doNotPatchMaterial: layer.doNotPatchMaterial,
        opacity: layer.opacity,
        registeredExtensions: layer.registeredExtensions,
    };
    return B3dmParser.parse(data, options).then((result) => {
        const batchTable = result.batchTable;
        // object3d is actually a THREE.Scene
        const object3d = result.gltf.scene;
        return { batchTable, object3d };
    });
}

function pntsParse(data, layer) {
    return PntsParser.parse(data, layer.registeredExtensions).then((result) => {
        const material = layer.material ?
            layer.material.clone() :
            new THREE.PointsMaterial({ size: 0.05, vertexColors: true });

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
        tile.applyMatrix4(metadata.transform);
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
        return Fetcher.arrayBuffer(url, layer.source.networkOptions).then((result) => {
            if (result !== undefined) {
                let func;
                const magic = utf8Decoder.decode(new Uint8Array(result, 0, 4));
                if (magic[0] === '{') {
                    result = JSON.parse(utf8Decoder.decode(new Uint8Array(result)));
                    const newPrefix = url.slice(0, url.lastIndexOf('/') + 1);
                    layer.tileset.extendTileset(result, metadata.tileId, newPrefix, layer.registeredExtensions);
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
    executeCommand,
};
