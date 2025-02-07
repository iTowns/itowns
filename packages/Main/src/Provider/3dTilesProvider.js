import * as THREE from 'three';
import B3dmParser from 'Parser/B3dmParser';
import PntsParser from 'Parser/PntsParser';
import Fetcher from 'Provider/Fetcher';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import PointsMaterial from 'Renderer/PointsMaterial';
// A bit weird but temporary until we remove this deprecated provider. Mainly to benefit from the enableDracoLoader and enableKtx2Loader
// methods.
import { itownsGLTFLoader } from 'Layer/OGC3DTilesLayer';

const utf8Decoder = new TextDecoder();

function b3dmToMesh(data, layer, url) {
    const urlBase = THREE.LoaderUtils.extractUrlBase(url);
    const options = {
        gltfUpAxis: layer.tileset.asset.gltfUpAxis,
        urlBase,
        overrideMaterials: layer.overrideMaterials,
        doNotPatchMaterial: layer.doNotPatchMaterial,
        registeredExtensions: layer.registeredExtensions,
        layer,
    };
    return B3dmParser.parse(data, options).then((result) => {
        const batchTable = result.batchTable;
        // object3d is actually a THREE.Scene
        const object3d = result.gltf.scene;
        return { batchTable, object3d };
    });
}

function gltfToMesh(data, layer, url) {
    const urlBase = THREE.LoaderUtils.extractUrlBase(url);
    return itownsGLTFLoader.parseAsync(data, urlBase).then(result => ({ object3d: result.scene }));
}

function pntsParse(data, layer) {
    return PntsParser.parse(data, layer.registeredExtensions).then((result) => {
        const material = layer.material ?
            layer.material.clone() :
            new PointsMaterial({
                size: 1,
                mode: layer.pntsMode,
                shape: layer.pntsShape,
                classificationScheme: layer.classification,
                sizeMode: layer.pntsSizeMode,
                minAttenuatedSize: layer.pntsMinAttenuatedSize,
                maxAttenuatedSize: layer.pntsMaxAttenuatedSize,
            });

        // refer material properties in the layer so when layers opacity and visibility is updated, the material is
        // automatically updated
        ReferLayerProperties(material, layer);

        // creation points with geometry and material
        const points = new THREE.Points(result.point.geometry, material);

        if (result.point.offset) {
            points.position.copy(result.point.offset);
        }

        return { object3d: points,
            batchTable: result.batchTable,
        };
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
        obj.userData.metadata = metadata;
        obj.layer = layer;
    };
    if (path) {
        // Check if we have relative or absolute url (with tileset's lopocs for example)
        let url = path.startsWith('http') ? path : metadata.baseURL + path;
        if (layer.source.isC3DTilesGoogleSource) {
            url = layer.source.getTileUrl(url);
        }
        const supportedFormats = {
            b3dm: b3dmToMesh,
            pnts: pntsParse,
            gltf: gltfToMesh,
        };
        return Fetcher.arrayBuffer(url, layer.source.networkOptions).then((result) => {
            if (result !== undefined) {
                let func;
                const magic = utf8Decoder.decode(new Uint8Array(result, 0, 4));
                if (magic[0] === '{') {
                    result = JSON.parse(utf8Decoder.decode(new Uint8Array(result)));
                    // Another specifics of 3D tiles from Google: tilesets in tilesets are required from the root base
                    // url and not from their parent base url
                    const newPrefix = layer.source.isC3DTilesGoogleSource ? layer.source.baseUrl : url.slice(0, url.lastIndexOf('/') + 1);
                    layer.tileset.extendTileset(result, metadata.tileId, newPrefix, layer.registeredExtensions);
                } else if (magic == 'b3dm') {
                    func = supportedFormats.b3dm;
                } else if (magic == 'pnts') {
                    layer.hasPnts = true;
                    func = supportedFormats.pnts;
                } else if (magic == 'glTF') {
                    func = supportedFormats.gltf;
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
