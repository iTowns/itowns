import * as THREE from 'three';
import { geoidLayerIsVisible } from 'Layer/GeoidLayer';
import { tiledCovering } from 'Core/Tile/Tile';

import type { Extent } from '@itowns/geographic';
import type { TileGeometry } from './TileGeometry';
import type Tile from 'Core/Tile/Tile';
import OBB from 'Renderer/OBB';
import type { LayeredMaterial } from 'Renderer/LayeredMaterial';
import type LayerUpdateState from 'Layer/LayerUpdateState';

interface TileLayerLike {
    tileMatrixSets: string[];
}

/**
 * A TileMesh is a THREE.Mesh with a geometricError and an OBB
 * The objectId property of the material is the with the id of the TileMesh
 * @param {TileGeometry} geometry - the tile geometry
 * @param {THREE.Material} material - a THREE.Material compatible with THREE.Mesh
 * @param {Layer} layer - the layer the tile is added to
 * @param {Extent} extent - the tile extent
 * @param {?number} level - the tile level (default = 0)
 */
class TileMesh extends THREE.Mesh<TileGeometry, LayeredMaterial> {
    readonly isTileMesh: true;

    layer: TileLayerLike;
    extent: Extent;
    level: number;
    obb: OBB;
    boundingSphere: THREE.Sphere;
    layerUpdateState: Record<string, LayerUpdateState>;
    geoidHeight: number;
    link: Record<string, unknown>;
    horizonCullingPoint: THREE.Vector3 | undefined;
    horizonCullingPointElevationScaled: THREE.Vector3 | undefined;

    #_tms = new Map<string, Tile[]>();
    #visible = true;

    constructor(
        geometry: TileGeometry,
        material: LayeredMaterial,
        layer: TileLayerLike,
        extent: Extent,
        level = 0,
    ) {
        super(geometry, material);

        if (!extent) {
            throw new Error('extent is mandatory to build a TileMesh');
        }
        this.layer = layer;
        this.extent = extent;

        this.level = level;

        this.material.setUniform('objectId', this.id);

        this.obb = this.geometry.OBB!.clone();
        this.boundingSphere = new THREE.Sphere();
        this.obb.box3D.getBoundingSphere(this.boundingSphere);

        for (const tms of layer.tileMatrixSets) {
            this.#_tms.set(tms, tiledCovering(this.extent, tms));
        }

        this.frustumCulled = false;
        this.matrixAutoUpdate = false;

        this.layerUpdateState = {};
        this.isTileMesh = true;

        this.geoidHeight = 0;

        this.link = {};

        Object.defineProperty(this, 'visible', {
            get() { return this.#visible; },
            set(v) {
                if (this.#visible != v) {
                    this.#visible = v;
                    this.dispatchEvent({ type: v ? 'shown' : 'hidden' });
                }
            },
        });
    }
    /**
     * If specified, update the min and max elevation of the OBB
     * and updates accordingly the bounding sphere and the geometric error
     *
     * @param {Object}  elevation
     * @param {number}  [elevation.min]
     * @param {number}  [elevation.max]
     * @param {number}  [elevation.scale]
     */
    setBBoxZ(elevation: { min?: number, max?: number, scale?: number, geoidHeight?: number }) {
        elevation.geoidHeight = geoidLayerIsVisible(this.layer) ? this.geoidHeight : 0;
        this.obb.updateZ(elevation);
        if (this.horizonCullingPointElevationScaled && this.horizonCullingPoint) {
            this.horizonCullingPointElevationScaled.setLength(this.obb.z.delta + this.horizonCullingPoint.length());
        }
        this.obb.box3D.getBoundingSphere(this.boundingSphere);
    }

    getExtentsByProjection(tms: string) {
        return this.#_tms.get(tms);
    }

    /**
     * Search for a common ancestor between this tile and another one. It goes
     * through parents on each side until one is found.
     *
     * @param {TileMesh} tile
     *
     * @return {TileMesh} the resulting common ancestor
     */
    findCommonAncestor(tile: TileMesh): TileMesh | undefined {
        if (!tile) {
            return undefined;
        }
        if (tile.level == this.level) {
            if (tile.id == this.id) {
                return tile;
            } else if (tile.level != 0) {
                // @ts-ignore By invariant, parent of a TileMesh is always a TileMesh
                return this.parent.findCommonAncestor(tile.parent);
            } else {
                return undefined;
            }
        } else if (tile.level < this.level) {
            // @ts-ignore By invariant, parent of a TileMesh is always a TileMesh
            return this.parent.findCommonAncestor(tile);
        } else {
            // @ts-ignore By invariant, parent of a TileMesh is always a TileMesh
            return this.findCommonAncestor(tile.parent);
        }
    }

    /**
     * An optional callback that is executed immediately before a 3D object
     * is rendered.
     *
     * @param renderer - The renderer used to render textures.
     */
    override onBeforeRender(renderer: THREE.WebGLRenderer) {
        if (this.material.layersNeedUpdate) {
            this.material.updateLayersUniforms(renderer);
        }
    }
}

export default TileMesh;
