import * as THREE from 'three';
import CRS from 'Core/Geographic/Crs';
import Cache from 'Core/Scheduler/Cache';

/**
 * A TileMesh is a THREE.Mesh with a geometricError and an OBB
 * The objectId property of the material is the with the id of the TileMesh
 * @constructor
 * @param {TileGeometry} geometry - the tile geometry
 * @param {THREE.Material} material - a THREE.Material compatible with THREE.Mesh
 * @param {Layer} layer - the layer the tile is added to
 * @param {Extent} extent - the tile extent
 * @param {?number} level - the tile level (default = 0)
 */
class TileMesh extends THREE.Mesh {
    constructor(geometry, material, layer, extent, level = 0) {
        super(geometry, material);

        if (!extent) {
            throw new Error('extent is mandatory to build a TileMesh');
        }
        this.layer = layer;
        this.extent = extent;
        this.extent.zoom = level;

        this.level = level;

        this.material.objectId = this.id;

        this.obb = this.geometry.OBB.clone();
        this.boundingSphere = new THREE.Sphere();
        this.obb.box3D.getBoundingSphere(this.boundingSphere);
        this._tms = new Map();

        for (const tms of layer.tileMatrixSets) {
            this._tms.set(tms, this.extent.tiledCovering(tms));
        }

        this.frustumCulled = false;
        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;

        this.layerUpdateState = {};
        this.isTileMesh = true;
    }

    /**
     * If specified, update the min and max elevation of the OBB
     * and updates accordingly the bounding sphere and the geometric error
     *
     * @param {?number} min
     * @param {?number} max
     * @param {?number} scale
     */
    setBBoxZ(min, max, scale) {
        if (min == undefined && max == undefined) {
            return;
        }
        // FIXME: Why the floors ? This is not conservative : the obb may be too short by almost 1m !
        if (Math.floor(min) !== Math.floor(this.obb.z.min) || Math.floor(max) !== Math.floor(this.obb.z.max)) {
            this.obb.updateZ(min, max, scale);
            if (this.horizonCullingPointElevationScaled) {
                this.horizonCullingPointElevationScaled.setLength(this.obb.z.delta + this.horizonCullingPoint.length());
            }
            this.obb.box3D.getBoundingSphere(this.boundingSphere);
        }
    }

    getExtentsByProjection(projection) {
        return this._tms.get(CRS.formatToTms(projection));
    }

    /**
     * Search for a common ancestor between this tile and another one. It goes
     * through parents on each side until one is found.
     *
     * @param {TileMesh} tile
     *
     * @return {TileMesh} the resulting common ancestor
     */
    findCommonAncestor(tile) {
        if (!tile) {
            return undefined;
        }
        if (tile.level == this.level) {
            if (tile.id == this.id) {
                return tile;
            } else if (tile.level != 0) {
                return this.parent.findCommonAncestor(tile.parent);
            } else {
                return undefined;
            }
        } else if (tile.level < this.level) {
            return this.parent.findCommonAncestor(tile);
        } else {
            return this.findCommonAncestor(tile.parent);
        }
    }

    onBeforeRender() {
        if (this.material.layersNeedUpdate) {
            this.material.updateLayersUniforms();
        }
    }

    /**
     * Refresh a material of this tile, associated with a specific layer. Only
     * works with ColorLayer and ElevationLayer for now. It also can't work with
     * a layer containing images like `png` or `jpeg`, as there is no way to
     * specify the necessary flag to retrieve images again from a server. Once
     * this method called, you need to call `view.notifyChange(node)` if you
     * want the update to take place.
     *
     * @param {ColorLayer|ElevationLayer} layer - The layer associated to the
     * material.
     * @param {boolean} [traverse=false] - Refresh the children of the tile - if
     * any.
     */
    refreshMaterial(layer, traverse = false) {
        if (layer.isColorLayer || layer.isElevationLayer) {
            const materialLayer = this.material.getLayer(layer.id);
            if (materialLayer) {
                materialLayer.textures.forEach(t => Cache.delete(layer.source.uid, layer.id, t.extent.toString('-')));
            }

            this.material.removeLayer(layer.id);
            this.layerUpdateState[layer.id].forceUpdate();

            if (traverse) {
                this.traverse((c) => {
                    if (c.isTileMesh) {
                        c.refreshMaterial(layer);
                    }
                });
            }
        }
    }
}

export default TileMesh;
