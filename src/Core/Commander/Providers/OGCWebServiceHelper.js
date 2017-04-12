import * as THREE from 'three';
import Fetcher from './Fetcher';
import CacheRessource from './CacheRessource';
import IoDriver_XBIL from './IoDriver_XBIL';
import Projection from '../../Geographic/Projection';


const SIZE_TEXTURE_TILE = 256;

// CacheRessource is necessary for neighboring PM textures
// The PM textures overlap several tiles WGS84, it is to avoid net requests
// Info : THREE.js have cache image https://github.com/mrdoob/three.js/blob/master/src/loaders/ImageLoader.js#L25
const cache = CacheRessource();
const ioDXBIL = new IoDriver_XBIL();
const projection = new Projection();


const cropXbilTexture = function _cropXbilTexture(texture, pitch) {
    const { min, max } = ioDXBIL.computeMinMaxElevation(
        texture.image.data,
        SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
        pitch);
    return Promise.resolve({ pitch, texture, min, max });
};

const getTextureFloat = function getTextureFloat(buffer) {
    const texture = new THREE.DataTexture(buffer, SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE, THREE.AlphaFormat, THREE.FloatType);
    texture.needsUpdate = true;
    return texture;
};

export default {
    cropXbilTexture,
    getColorTextureByUrl(url) {
        const cachedTexture = cache.getRessource(url);

        if (cachedTexture) {
            return Promise.resolve(cachedTexture);
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
            return cropXbilTexture(textureCache, pitch);
        }

        return ioDXBIL.read(url).then((result) => {
            // TODO  RGBA is needed for navigator with no support in texture float
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

        const tileMatrixSet = wmtsLayer.options.tileMatrixSet || 'WGS84G';
        if (!(tileMatrixSet in tile.wmtsCoords)) {
            const tileCoord = projection.WGS84toWMTS(tile.bbox);

            tile.wmtsCoords[tileMatrixSet] =
                projection.getCoordWMTS_WGS84(tileCoord, tile.bbox, tileMatrixSet);
        }
    },
};
