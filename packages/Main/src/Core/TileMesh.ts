import * as THREE from 'three';
import { geoidLayerIsVisible } from 'Layer/GeoidLayer';
import { tiledCovering } from 'Core/Tile/Tile';

import type { Extent } from '@itowns/geographic';
import type { TileGeometry } from 'Core/TileGeometry';
import type Tile from 'Core/Tile/Tile';
import OBB from 'Renderer/OBB';
import type { LayeredMaterial } from 'Renderer/LayeredMaterial';
import type LayerUpdateState from 'Layer/LayerUpdateState';

interface TileLayerLike {
    tileMatrixSets: string[];
}

/**
 * A TileMesh is a THREE.Mesh with a geometricError and an OBB.
 * The objectId property of the layered material is assigned to the id of the
 * TileMesh.
 * @param geometry - The tile geometry
 * @param material - A THREE.Material compatible with THREE.Mesh
 * @param layer - The layer the tile is added to
 * @param extent - The tile extent
 * @param level - The tile level (default = 0)
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

    private _tms = new Map<string, Tile[]>();

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
            this._tms.set(tms, tiledCovering(this.extent, tms));
        }

        this.frustumCulled = false;
        this.matrixAutoUpdate = false;

        this.layerUpdateState = {};
        this.isTileMesh = true;

        this.geoidHeight = 0;

        this.link = {};

        let _visible = true;
        Object.defineProperty(this, 'visible', {
            get() { return _visible; },
            set(v) {
                if (_visible != v) {
                    _visible = v;
                    this.dispatchEvent({ type: v ? 'shown' : 'hidden' });
                }
            },
        });
    }

    /**
     * If specified, updates the min and max elevation of the OBB
     * and updates accordingly the bounding sphere and the geometric error.
     *
     * @param elevation - Elevation parameters
     */
    setBBoxZ(elevation: { min?: number, max?: number, scale?: number, geoidHeight?: number }) {
        elevation.geoidHeight = geoidLayerIsVisible(this.layer) ? this.geoidHeight : 0;
        this.obb.updateZ(elevation);
        if (this.horizonCullingPointElevationScaled && this.horizonCullingPoint) {
            this.horizonCullingPointElevationScaled.setLength(
                this.obb.z.delta + this.horizonCullingPoint.length(),
            );
        }
        this.obb.box3D.getBoundingSphere(this.boundingSphere);
    }

    getExtentsByProjection(tms: string) {
        return this._tms.get(tms);
    }

    /**
     * Finds the common ancestor between this tile and another one. It goes
     * through parents on each side until one is found.
     *
     * @param tile - The tile to find common ancestor with
     * @returns The common ancestor between those two tiles, or undefined if
     * not found
     */
    findCommonAncestor(tile: TileMesh): TileMesh | undefined {
        if (!tile) {
            return undefined;
        }
        if (tile.level == this.level) {
            if (tile.id == this.id) {
                return tile;
            } else if (tile.level != 0) {
                return (this.parent as TileMesh)?.findCommonAncestor(tile.parent as TileMesh);
            } else {
                return undefined;
            }
        } else if (tile.level < this.level) {
            return (this.parent as TileMesh)?.findCommonAncestor(tile as TileMesh);
        } else {
            return this.findCommonAncestor(tile.parent as TileMesh);
        }
    }

    /**
     * An optional callback that is executed immediately before a 3D object
     * is rendered.
     *
     * @param renderer - The renderer used to render textures.
     */
    override onBeforeRender(renderer: THREE.WebGLRenderer) {
        // why remove if (this.material.layersNeedUpdate) {
        this.material.updateLayersUniforms(renderer);

        // Track actual usage every time this mesh is rendered
        // Use global current rendering view ID set by MainLoop
        this.material.markAsRendered();
    }
}

export default TileMesh;
