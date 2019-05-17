import * as THREE from 'three';
import OGCWebServiceHelper from 'Provider/OGCWebServiceHelper';
import Projection from 'Core/Geographic/Projection';

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
        this.level = level;
        // Set equivalent tiled extent zoom
        // Is used to set zoom for each texture fetched with no tiled extent
        // It's more simple to set zoom here instead of reverse ingeneer
        // Removable with a table pixel/extent.size
        if (!this.extent.zoom) {
            this.extent.zoom = level;
        }

        this.material.objectId = this.id;

        this.obb = this.geometry.OBB.clone();
        this.boundingSphere = new THREE.Sphere();
        this.obb.box3D.getBoundingSphere(this.boundingSphere);
        this.tilesetExtents = {};

        // Compute it one time only
        this.tilesetExtents.WGS84G = [Projection.extent_Epsg4326_To_WmtsWgs84g(this.extent)];
        this.tilesetExtents.PM = Projection.computeWmtsPm(this.tilesetExtents.WGS84G[0], this.extent);

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
     */
    setBBoxZ(min, max) {
        if (min == undefined && max == undefined) {
            return;
        }
        // FIXME: Why the floors ? This is not conservative : the obb may be too short by almost 1m !
        if (Math.floor(min) !== Math.floor(this.obb.z.min) || Math.floor(max) !== Math.floor(this.obb.z.max)) {
            this.obb.updateZ(min, max);
            this.obb.box3D.getBoundingSphere(this.boundingSphere);
        }
    }

    getExtentsForSource(source) {
        // TODO: The only case that needs a dependency on the source, an
        // alternative may be found to have only the CRS as a parameter
        if (source.isTMSSource && !this.layer.isGlobeLayer) {
            return OGCWebServiceHelper.computeTMSCoordinates(this, source.extent, source.isInverted);
        } else if (Array.isArray(this.tilesetExtents[source.tileMatrixSet])) {
            return this.tilesetExtents[source.tileMatrixSet];
        } else if (source.extent.crs == this.extent.crs) {
            return [this.extent];
        } else {
            return [this.extent.as(source.extent.crs)];
        }
    }

    getZoomForLayer(layer) {
        return this.getExtentsForSource(layer.source)[0].zoom || this.level;
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

    findAncestorFromLevel(targetLevel) {
        let parentAtLevel = this;
        while (parentAtLevel && parentAtLevel.level > targetLevel) {
            parentAtLevel = parentAtLevel.parent;
        }
        if (!parentAtLevel) {
            return Promise.reject(`Invalid targetLevel requested ${targetLevel}`);
        }
        return parentAtLevel;
    }

    onBeforeRender() {
        if (this.material.layersNeedUpdate) {
            this.material.updateLayersUniforms();
        }
    }
}

export default TileMesh;
