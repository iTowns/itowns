import * as THREE from 'three';
import Coordinates from '../Core/Geographic/Coordinates';
import Extent from '../Core/Geographic/Extent';
import RendererConstant from '../Renderer/RendererConstant';
import { l_ELEVATION } from '../Renderer/LayeredMaterial';

function tileAt(pt, tile) {
    if (tile.extent) {
        if (!tile.extent.pointIsInside(pt)) {
            return undefined;
        }

        for (const c of tile.children) {
            const t = tileAt(pt, c);
            if (t) {
                return t;
            }
        }
        if (tile.getLayerTextures(l_ELEVATION)[0].coords.zoom > -1) {
            return tile;
        }
        return undefined;
    }
}

let _canvas;
function _readTextureValueAt(layer, texture, x, y) {
    if (texture.image.data) {
        return texture.image.data[y * texture.image.width + x];
    } else {
        if (!_canvas) {
            _canvas = document.createElement('canvas');
            _canvas.width = 1;
            _canvas.height = 1;
        }
        const ctx = _canvas.getContext('2d');
        ctx.drawImage(texture.image, x, y, 1, 1, 0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1);
        return THREE.Math.lerp(
            layer.materialOptions.colorTextureElevationMinZ,
            layer.materialOptions.colorTextureElevationMaxZ,
            d.data[0] / 255);
    }
}

function _updateSinglePoint(referenceCrs, layer, nodes, crs, toModify, zOffset) {
    const pt = new Coordinates(referenceCrs, toModify).as(crs);
    pt._values[2] = 0;

    let tileWithValidElevationTexture = null;
    for (const n of nodes) {
        tileWithValidElevationTexture = tileAt(pt, n);
        if (tileWithValidElevationTexture) {
            break;
        }
    }

    if (tileWithValidElevationTexture) {
        const src = tileWithValidElevationTexture.getLayerTextures(l_ELEVATION)[0];
        const width = src.image.width;
        const height = src.image.height;

        const tmp = new Extent(pt.crs, pt, pt);

        // Assuming that tiles are split in 4 children, we lookup the parent that
        // really owns this texture
        const stepsUpInHierarchy = Math.log2(1.0 /
            tileWithValidElevationTexture.materials[RendererConstant.FINAL].offsetScale[l_ELEVATION][0].z);
        for (let i = 0; i < stepsUpInHierarchy; i++) {
            tileWithValidElevationTexture = tileWithValidElevationTexture.parent;
        }

        const offset = tmp.offsetToParent(tileWithValidElevationTexture.extent);

        const u = offset.x;
        const v = offset.y;

        // read elevation texture, using bi-linear filtering
        const up = Math.max(0, u * (width - 1) - 0.5);
        const vp = Math.max(0, v * (height - 1) - 0.5);

        const u1 = Math.floor(up);
        const u2 = Math.ceil(up);
        const v1 = Math.floor(vp);
        const v2 = Math.ceil(vp);

        const lu = up - u1;
        const lv = vp - v1;

        const z11 = _readTextureValueAt(layer, src, u1, v1);
        const z21 = _readTextureValueAt(layer, src, u2, v1);
        const z12 = _readTextureValueAt(layer, src, u1, v2);
        const z22 = _readTextureValueAt(layer, src, u2, v2);

        // horizontal filtering
        const zu1 = THREE.Math.lerp(z11, z21, lu);
        const zu2 = THREE.Math.lerp(z12, z22, lu);
        // then vertical filtering
        const z = THREE.Math.lerp(zu1, zu2, lv);

        pt._values[2] = z + zOffset;

        toModify.copy(pt.as(referenceCrs).xyz());
        return tileWithValidElevationTexture;
    }
}


export default function placeObjectOnGround(referenceCrs, layer, tiles, obj, options) {
    if (!tiles || tiles.length == 0) {
        return;
    }

    const crs = tiles[0].extent.crs();

    if (!options.modifyGeometry) {
        _updateSinglePoint(referenceCrs, layer, tiles, crs, obj.position, options.offset);
        obj.updateMatrix();
        obj.updateMatrixWorld(true);
    } else {
        const geometry = obj.geometry;
        if (geometry instanceof THREE.Geometry) {
            for (let i = 0; i < geometry.vertices.length; i++) {
                _updateSinglePoint(referenceCrs, layer, tiles, crs, geometry.vertices[i], options.offset);
            }
            geometry.verticesNeedUpdate = true;
        } else {
            // TODO: support BufferGeometry
        }
    }
}
