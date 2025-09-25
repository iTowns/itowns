import * as THREE from 'three';
import TileMesh from 'Core/TileMesh';
import { LayeredMaterial } from 'Renderer/LayeredMaterial';
import { newTileGeometry, TileBuilder, TileBuilderParams } from 'Core/Prefab/TileBuilder';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import { geoidLayerIsVisible } from 'Layer/GeoidLayer';

import type { Extent } from '@itowns/geographic';
import type { LayeredMaterialParameters } from 'Renderer/LayeredMaterial';

const dimensions = new THREE.Vector2();

// A simplified interface for TiledGeometryLayer.
// It is used to avoid a dependency on the full TiledGeometryLayer type.
interface TileLayerLike {
    diffuse: THREE.Color;
    showOutline: boolean;
    isGlobeLayer: boolean;
    segments: number;
    disableSkirt: boolean;
    hideSkirt: boolean;
    tileMatrixSets: string[];
    materialOptions: LayeredMaterialParameters;
    builder: TileBuilder<TileBuilderParams>;
}

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

        return newTileGeometry(builder, paramsGeometry).then((result) => {
            // build tile mesh
            result.geometry.increaseRefCount();
            const crsCount = layer.tileMatrixSets.length;
            const material = new LayeredMaterial(layer.materialOptions, crsCount);
            ReferLayerProperties(material, layer);

            const tile = new TileMesh(result.geometry, material, layer, extent, level);

            if (parent && parent.isTileMesh) {
                // get parent extent transformation
                const pTrans = builder.computeShareableExtent(parent.extent);
                // place relative to his parent
                result.position.sub(pTrans.position).applyQuaternion(pTrans.quaternion.invert());
                result.quaternion.premultiply(pTrans.quaternion);
            }

            tile.position.copy(result.position);
            tile.quaternion.copy(result.quaternion);
            tile.visible = false;
            tile.updateMatrix();

            setTileFromTiledLayer(tile, layer);

            if (parent) {
                tile.geoidHeight = parent.geoidHeight;
                const geoidHeight = geoidLayerIsVisible(layer) ? tile.geoidHeight : 0;
                tile.setBBoxZ({ min: parent.obb.z.min, max: parent.obb.z.max, geoidHeight });
                tile.material.setUniform('geoidHeight', geoidHeight);
            }

            return tile;
        });
    },
};
