/**
 * Generated On: 2015-10-5
 * Class: TileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

import * as THREE from 'three';
import RendererConstant from '../Renderer/RendererConstant';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from '../Provider/OGCWebServiceHelper';
import { is4326 } from './Geographic/Coordinates';

function TileMesh(layer, geometry, material, extent, level) {
    // Constructor
    THREE.Mesh.call(this, geometry, material);

    this.layer = layer;

    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;

    this.level = level;
    this.extent = extent;

    this.geometry = geometry;

    this.obb = this.geometry.OBB.clone();

    this.boundingSphere = new THREE.Sphere();
    this.obb.box3D.getBoundingSphere(this.boundingSphere);

    this.frustumCulled = false;

    this.updateGeometricError();
    this.wmtsCoords = {};

    // Layer
    this.setDisplayed(false);

    this.layerUpdateState = {};

    this.material.setUuid(this.id);

    this._state = RendererConstant.FINAL;
}

TileMesh.prototype = Object.create(THREE.Mesh.prototype);
TileMesh.prototype.constructor = TileMesh;

TileMesh.prototype.updateMatrixWorld = function updateMatrixWorld(force) {
    THREE.Mesh.prototype.updateMatrixWorld.call(this, force);
    this.obb.update();
};

TileMesh.prototype.isVisible = function isVisible() {
    return this.visible;
};

TileMesh.prototype.setDisplayed = function setDisplayed(show) {
    this.material.visible = show;
    this.layer.info.update(this);
};

TileMesh.prototype.setVisibility = function setVisibility(show) {
    this.visible = show;
};

TileMesh.prototype.isDisplayed = function isDisplayed() {
    return this.material.visible;
};

// switch material in function of state
TileMesh.prototype.changeState = function changeState(state) {
    if (state == this._state) {
        return;
    }
    if (state == RendererConstant.DEPTH) {
        this.material.defines.DEPTH_MODE = 1;
        delete this.material.defines.MATTE_ID_MODE;
    } else if (state == RendererConstant.ID) {
        this.material.defines.MATTE_ID_MODE = 1;
        delete this.material.defines.DEPTH_MODE;
    } else {
        delete this.material.defines.MATTE_ID_MODE;
        delete this.material.defines.DEPTH_MODE;
    }

    this._state = state;

    this.material.needsUpdate = true;
};

function applyChangeState(n, s) {
    if (n.changeState) {
        n.changeState(s);
    }
}

TileMesh.prototype.pushRenderState = function pushRenderState(state) {
    if (this._state == state) {
        return () => { };
    }

    const oldState = this._state;
    this.traverse(n => applyChangeState(n, state));

    return () => {
        this.traverse(n => applyChangeState(n, oldState));
    };
};

TileMesh.prototype.setFog = function setFog(fog) {
    this.material.setFogDistance(fog);
};

TileMesh.prototype.setSelected = function setSelected(select) {
    this.material.setSelected(select);
};

TileMesh.prototype.setTextureElevation = function setTextureElevation(layer, elevation, offsetScale = new THREE.Vector4(0, 0, 1, 1)) {
    if (this.material === null) {
        return;
    }
    this.setBBoxZ(elevation.min, elevation.max);
    this.material.setLayerTextures(layer, elevation.texture, offsetScale);
};


TileMesh.prototype.setBBoxZ = function setBBoxZ(min, max) {
    if (min == undefined && max == undefined) {
        return;
    }
    if (Math.floor(min) !== Math.floor(this.obb.z.min) || Math.floor(max) !== Math.floor(this.obb.z.max)) {
        this.obb.updateZ(min, max);
        this.obb.box3D.getBoundingSphere(this.boundingSphere);
        this.updateGeometricError();
    }
};

TileMesh.prototype.updateGeometricError = function updateGeometricError() {
    // The geometric error is calculated to have a correct texture display.
    // For the projection of a texture's texel to be less than or equal to one pixel
    this.geometricError = this.boundingSphere.radius / SIZE_TEXTURE_TILE;
};

TileMesh.prototype.removeColorLayer = function removeColorLayer(idLayer) {
    if (this.layerUpdateState && this.layerUpdateState[idLayer]) {
        delete this.layerUpdateState[idLayer];
    }
    this.material.removeColorLayer(idLayer);
};

TileMesh.prototype.changeSequenceLayers = function changeSequenceLayers(sequence) {
    const layerCount = this.material.getColorLayersCount();

    // Quit if there is only one layer
    if (layerCount < 2) {
        return;
    }

    this.material.setSequence(sequence);
};

TileMesh.prototype.getCoordsForSource = function getCoordsForSource(source) {
    if (source.protocol.indexOf('wmts') == 0) {
        OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, source.tileMatrixSet);
        return this.wmtsCoords[source.tileMatrixSet];
    } else if (source.protocol == 'wms' && this.extent.crs() != source.projection) {
        if (source.projection == 'EPSG:3857') {
            const tilematrixset = 'PM';
            OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, tilematrixset);
            return this.wmtsCoords[tilematrixset];
        } else {
            throw new Error('unsupported projection wms for this viewer');
        }
    } else if (source.protocol == 'tms' || source.protocol == 'xyz') {
        // Special globe case: use the P(seudo)M(ercator) coordinates
        if (is4326(this.extent.crs()) &&
                (source.extent.crs() == 'EPSG:3857' || is4326(source.extent.crs()))) {
            OGCWebServiceHelper.computeTileMatrixSetCoordinates(this, 'PM');
            return this.wmtsCoords.PM;
        } else {
            return OGCWebServiceHelper.computeTMSCoordinates(this, source.extent, source.origin);
        }
    } else if (source.extent.crs() == this.extent.crs()) {
        // Currently extent.as() always clone the extent, even if the output
        // crs is the same.
        // So we avoid using it if both crs are the same.
        return [this.extent];
    } else {
        return [this.extent.as(source.extent.crs())];
    }
};

TileMesh.prototype.getZoomForLayer = function getZoomForLayer(layer) {
    return this.getCoordsForSource(layer.source)[0].zoom || this.level;
};

/**
 * Search for a common ancestor between this tile and another one. It goes
 * through parents on each side until one is found.
 *
 * @param {TileMesh} tile
 *
 * @return {TileMesh} the resulting common ancestor
 */
TileMesh.prototype.findCommonAncestor = function findCommonAncestor(tile) {
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
};

TileMesh.prototype.findAncestorFromLevel = function fnFindAncestorFromLevel(targetLevel) {
    let parentAtLevel = this;
    while (parentAtLevel && parentAtLevel.level > targetLevel) {
        parentAtLevel = parentAtLevel.parent;
    }
    if (!parentAtLevel) {
        return Promise.reject(`Invalid targetLevel requested ${targetLevel}`);
    }
    return parentAtLevel;
};

export default TileMesh;
