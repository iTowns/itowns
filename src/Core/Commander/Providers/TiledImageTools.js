import * as THREE from 'three';
import Fetcher from './Fetcher';
import CacheRessource from './CacheRessource';
import IoDriver_XBIL from './IoDriver_XBIL';
import Projection from '../../Geographic/Projection';
import CoordWMTS from '../../Geographic/CoordWMTS';
import { UNIT } from '../../Geographic/Coordinates';

const SIZE_TEXTURE_TILE = 256;

// CacheRessource is necessary for neighboring PM textures
// Info : THREE.js have cache image https://github.com/mrdoob/three.js/blob/master/src/loaders/ImageLoader.js#L25
const cache = CacheRessource();
const ioDXBIL = new IoDriver_XBIL();
const projection = new Projection();

const _cropXbilTexture = function _cropXbilTexture(texture, pitch) {
    const minmax = ioDXBIL.computeMinMaxElevation(
        texture.image.data,
        SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
        pitch);
    return Promise.resolve(
        {
            pitch,
            texture,
            min: minmax.min,
            max: minmax.max,
        });
};

const getTextureFloat = function getTextureFloat(buffer) {
    // Start float to RGBA uint8
    // var bufferUint = new Uint8Array(buffer.buffer);
    // var texture = new THREE.DataTexture(bufferUint, 256, 256);
    const texture = new THREE.DataTexture(buffer, SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE, THREE.AlphaFormat, THREE.FloatType);
    texture.needsUpdate = true;
    return texture;
};

export default {
    cropXbilTexture(texture, pitch) {
        return _cropXbilTexture(texture, pitch);
    },
    getColorTextureByUrl(url) {
        const textureCached = cache.getRessource(url);

        if (textureCached !== undefined) {
            return Promise.resolve(textureCached);
        }

        const { texture, promise } = Fetcher.texture(url);

        texture.generateMipmaps = false;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.anisotropy = 16;

        return promise.then(() => {
            cache.addRessource(url, texture);
            return texture;
        });
    },
    getXBilTextureByUrl(url, pitch) {
        const textureCache = cache.getRessource(url);

        if (textureCache !== undefined) {
            return _cropXbilTexture(textureCache, pitch);
        }

        return ioDXBIL.read(url).then((result) => {
            // RGBA is needed for navigator with no support in texture float
            // In RGBA elevation texture LinearFilter give some errors with nodata value.
            // need to rewrite sample function in shader
            result.texture = getTextureFloat(result.floatArray);
            result.texture.generateMipmaps = false;
            result.texture.magFilter = THREE.LinearFilter;
            result.texture.minFilter = THREE.LinearFilter;
            result.pitch = pitch;

            cache.addRessource(url, result.texture);

            return result;
        });
    },
    computeTileWMTSCoordinates(tile, wmtsLayer) {
        // Are WMTS coordinates ready?
        if (!tile.wmtsCoords) {
            tile.wmtsCoords = {};
        }

        const tileMatrixSet = wmtsLayer.options.tileMatrixSet;
        if (!(tileMatrixSet in tile.wmtsCoords)) {
            const tileCoord = projection.WGS84toWMTS(tile.bbox);

            tile.wmtsCoords[tileMatrixSet] =
                projection.getCoordWMTS_WGS84(tileCoord, tile.bbox, tileMatrixSet);
        }
    },
    WMTS_WGS84Parent(cWMTS, levelParent, pitch) {
        const diffLevel = cWMTS.zoom - levelParent;
        const diff = Math.pow(2, diffLevel);
        const invDiff = 1 / diff;

        const r = (cWMTS.row - (cWMTS.row % diff)) * invDiff;
        const c = (cWMTS.col - (cWMTS.col % diff)) * invDiff;

        pitch.x = cWMTS.col * invDiff - c;
        pitch.y = cWMTS.row * invDiff - r;
        pitch.z = invDiff;

        return new CoordWMTS(levelParent, r, c);
    },
    WMS_WGS84Parent(bbox, bboxParent) {
        const dim = bbox.dimensions(UNIT.RADIAN);
        const dimParent = bboxParent.dimensions(UNIT.RADIAN);
        const scale = dim.x / dimParent.x;

        const x =
            Math.abs(bbox.west(UNIT.RADIAN) - bboxParent.west(UNIT.RADIAN)) /
            dimParent.x;
        const y =
            Math.abs(
                bbox.south(UNIT.RADIAN) + dim.y -
                (bboxParent.south(UNIT.RADIAN) + dimParent.y)) /
            dimParent.y;

        return new THREE.Vector3(x, y, scale);
    },
};
