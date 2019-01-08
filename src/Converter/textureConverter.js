import * as THREE from 'three';
import Feature2Texture from 'Converter/Feature2Texture';

const textureLayer = (texture) => {
    texture.generateMipmaps = false;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
};

function textureColorLayer(texture, transparent) {
    texture.anisotropy = 16;
    texture.premultiplyAlpha = transparent;
    return textureLayer(texture);
}

export default {
    convert(data, extentDestination, layer) {
        let texture;
        if (data.isFeature) {
            const backgroundColor = (layer.backgroundLayer && layer.backgroundLayer.paint) ?
                new THREE.Color(layer.backgroundLayer.paint['background-color']) :
                undefined;

            const extentTexture = extentDestination.as(layer.projection);
            texture = Feature2Texture.createTextureFromFeature(data, extentTexture, 256, layer.style, backgroundColor);
            texture.parsedData = data;
            texture.coords = extentDestination;
        } else if (data.isTexture) {
            texture = data;
        } else {
            throw (new Error('Data type is not supported to convert into texture'));
        }

        if (layer.isColorLayer) {
            return textureColorLayer(texture, layer.transparent);
        } else if (layer.isElevationLayer) {
            if (texture.flipY) {
                // DataTexture default to false, so make sure other Texture types
                // do the same (eg image texture)
                // See UV construction for more details
                texture.flipY = false;
            }
            return textureLayer(texture);
        }
    },
};
