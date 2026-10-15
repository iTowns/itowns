import * as THREE from 'three';
import TileMesh, { TileLayerLike } from 'Core/TileMesh';
import { LayeredMaterial } from 'Renderer/LayeredMaterial';
import { newTileGeometry } from 'Core/Prefab/TileBuilder';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import { geoidLayerIsVisible } from 'Layer/GeoidLayer';

import type { Extent } from '@itowns/geographic';

const dimensions = new THREE.Vector2();

function setTileFromTiledLayer(tile: TileMesh, tileLayer: TileLayerLike) {
    if (tileLayer.diffuse) {
        tile.material.setUniform('diffuse', tileLayer.diffuse);
    }

    if (__DEBUG__) {
        tile.material.setUniform('showOutline', tileLayer.showOutline || false);
    }

    if (tileLayer.isGlobeLayer) {
        // Computes a point used for horizon culling.
        // If the point is below the horizon,
        // the tile is guaranteed to be below the horizon as well.
        tile.horizonCullingPoint = tile.extent.center().as('EPSG:4978').toVector3();
        tile.extent.planarDimensions(dimensions).multiplyScalar(THREE.MathUtils.DEG2RAD);

        // alpha is maximum angle between two points of tile
        const alpha = dimensions.length();
        const h = Math.abs(1.0 / Math.cos(alpha * 0.5));
        tile.horizonCullingPoint.setLength(h * tile.horizonCullingPoint.length());
        tile.horizonCullingPointElevationScaled = tile.horizonCullingPoint.clone();
    }
}

export default {
    convert(requester: TileMesh, extent: Extent, layer: TileLayerLike) {
        const builder = layer.builder;
        const parent = requester;
        const level = (parent !== undefined) ? (parent.level + 1) : 0;

        const paramsGeometry = {
            extent,
            level,
            segments: layer.segments || 16,
            disableSkirt: layer.disableSkirt,
            hideSkirt: layer.hideSkirt,
        };

        const { geometry, quaternion, position } = newTileGeometry(builder, paramsGeometry);
        // build tile mesh
        geometry.increaseRefCount();
        const crsCount = layer.tileMatrixSets.length;
        const material = new LayeredMaterial(layer.materialOptions, crsCount);
        ReferLayerProperties(material, layer);

        const tile = new TileMesh(geometry, material, layer, extent, level);

        if (parent && parent.isTileMesh) {
            // get parent extent transformation
            const pTrans = builder.computeShareableExtent(parent.extent);
            // place relative to his parent
            position.sub(pTrans.position).applyQuaternion(pTrans.quaternion.invert());
            quaternion.premultiply(pTrans.quaternion);
        }

        tile.position.copy(position);
        tile.quaternion.copy(quaternion);
        tile.visible = false;
        tile.updateMatrix();

        setTileFromTiledLayer(tile, layer);

        if (parent) {
            tile.geoidHeight = parent.geoidHeight;
            const geoidHeight = geoidLayerIsVisible(layer) ? tile.geoidHeight : 0;
            tile.material.setUniform('geoidHeight', geoidHeight);

            const parent_uniforms = parent.material.uniforms;
            const child_uniforms = tile.material.uniforms;

            if (parent.material.uniforms.map.value) {
                const extentParent = parent_uniforms.map.value.extent;
                child_uniforms.map.value = parent_uniforms.map.value;
                tile.extent.transformToParent(extentParent, child_uniforms.mapTransform.value);
            }

            if (parent_uniforms.displacementMap.value) {
                const extentParent = parent_uniforms.displacementMap.value.extent.toExtent(tile.extent.crs);
                child_uniforms.displacementMap.value = parent_uniforms.displacementMap.value;
                tile.extent.transformToParent(extentParent, child_uniforms.displacementMapTransform.value);
                const rasterElevationNode = parent_uniforms.elevationLayer.value;
                child_uniforms.elevationLayer.value = rasterElevationNode;
                tile.setBBoxZ({ min: rasterElevationNode.min, max: rasterElevationNode.max, scale: rasterElevationNode.layer.scale, geoidHeight });
            } else {
                tile.setBBoxZ({ min: parent.obb.z.min, max: parent.obb.z.max, geoidHeight });
            }
        }


        return tile;
    },
};
