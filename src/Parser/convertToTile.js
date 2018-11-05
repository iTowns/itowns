/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
import * as THREE from 'three';
import TileGeometry from '../Core/TileGeometry';
import TileMesh from '../Core/TileMesh';
import LayeredMaterial from '../Renderer/LayeredMaterial';
import Cache from '../Core/Scheduler/Cache';

export default {
    convert(requester, extent, layer) {
        const builder = layer.builder;
        const parent = requester;
        const level = (parent !== undefined) ? (parent.level + 1) : 0;

        const { sharableExtent, quaternion, position } = builder.computeSharableExtent(extent);
        const south = sharableExtent.south().toFixed(6);
        const segment = layer.options.segments || 16;
        const key = `${builder.type}_${layer.disableSkirt ? 0 : 1}_${segment}_${level}_${south}`;

        let geometry = Cache.get(key);
        // build geometry if doesn't exist
        if (!geometry) {
            const paramsGeometry = {
                extent: sharableExtent,
                level,
                segment,
                disableSkirt: layer.disableSkirt,
            };

            geometry = new TileGeometry(paramsGeometry, builder);
            Cache.set(key, geometry);

            geometry._count = 0;
            geometry.dispose = () => {
                geometry._count--;
                if (geometry._count == 0) {
                    THREE.BufferGeometry.prototype.dispose.call(geometry);
                    Cache.delete(key);
                }
            };
        }

        // build tile
        geometry._count++;
        const materialOptions = Object.assign({}, layer.materialOptions);
        const material = new LayeredMaterial(materialOptions);
        const tile = new TileMesh(geometry, material, layer, extent, level);
        // TODO semble ne pas etre necessaire
        tile.layers.set(layer.threejsLayer);

        if (parent && parent instanceof TileMesh) {
            // get parent extent transformation
            const pTrans = builder.computeSharableExtent(parent.extent);
            // place relative to his parent
            position.sub(pTrans.position).applyQuaternion(pTrans.quaternion.inverse());
            quaternion.premultiply(pTrans.quaternion);
        }

        tile.position.copy(position);
        tile.quaternion.copy(quaternion);

        tile.material.transparent = layer.opacity < 1.0;
        tile.material.opacity = layer.opacity;
        tile.visible = false;
        tile.updateMatrix();

        if (parent) {
            tile.setBBoxZ(parent.obb.z.min, parent.obb.z.max);
        } else if (layer.materialOptions && layer.materialOptions.useColorTextureElevation) {
            tile.setBBoxZ(layer.materialOptions.colorTextureElevationMinZ, layer.materialOptions.colorTextureElevationMaxZ);
        }

        tile.add(tile.obb);

        tile.material.lightingEnable = layer.lighting.enable;
        tile.material.lightPosition = layer.lighting.position;

        if (layer.diffuse) {
            tile.material.diffuse = layer.diffuse;
        }

        if (__DEBUG__) {
            tile.material.showOutline = layer.showOutline || false;
            tile.material.wireframe = layer.wireframe || false;
        }

        return Promise.resolve(tile);
    },
};
