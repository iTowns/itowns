import * as THREE from 'three';
import OGCWebServiceHelper from 'Provider/OGCWebServiceHelper';
import { is4326 } from 'Core/Geographic/Coordinates';

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
        this.material.objectId = this.id;

        this.obb = this.geometry.OBB.clone();
        this.boundingSphere = new THREE.Sphere();
        this.obb.box3D.getBoundingSphere(this.boundingSphere);
        this.wmtsCoords = {};

        this.frustumCulled = false;
        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;

        this.layerUpdateState = {};
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

    getCoordsForSource(source) {
        if (source.isWMTSSource) {
            OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, source.tileMatrixSet);
            return this.wmtsCoords[source.tileMatrixSet];
        } else if (source.isWMSSource && this.extent.crs() != source.projection) {
            if (source.projection == 'EPSG:3857') {
                const tilematrixset = 'PM';
                OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, tilematrixset);
                return this.wmtsCoords[tilematrixset];
            } else {
                throw new Error('unsupported projection wms for this viewer');
            }
        } else if (source.isTMSSource) {
            // Special globe case: use the P(seudo)M(ercator) coordinates
            if (is4326(this.extent.crs()) &&
                    (source.extent.crs() == 'EPSG:3857' || is4326(source.extent.crs()))) {
                OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, 'PM');
                return this.wmtsCoords.PM;
            } else {
                return OGCWebServiceHelper.computeTMSCoordinates(this, source.extent, source.isInverted);
            }
        } else if (source.extent.crs() == this.extent.crs()) {
            // Currently extent.as() always clone the extent, even if the output
            // crs is the same.
            // So we avoid using it if both crs are the same.
            return [this.extent];
        } else {
            return [this.extent.as(source.extent.crs())];
        }
    }

    getZoomForLayer(layer) {
        return this.getCoordsForSource(layer.source)[0].zoom || this.level;
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
