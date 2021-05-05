import * as THREE from 'three';
import Feature2Texture from 'Converter/Feature2Texture';
import Extent from 'Core/Geographic/Extent';
import CRS from 'Core/Geographic/Crs';

const extentTexture = new Extent('EPSG:4326', [0, 0, 0, 0]);

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
    convert(data, extentDestination, layer, view) {
        let promise;
        if (data.isFeatureCollection) {
            const backgroundLayer = layer.source.backgroundLayer;
            const backgroundColor = (backgroundLayer && backgroundLayer.paint) ?
                new THREE.Color(backgroundLayer.paint['background-color']) :
                undefined;

            extentDestination.as(CRS.formatToEPSG(layer.crs), extentTexture);
            promise = Feature2Texture.createTextureFromFeature(data, extentTexture, 256, layer.style, backgroundColor, view).then((texture) => {
                // texture.features = data;
                texture.extent = extentDestination;
                return texture;
            });
        } else if (data.isTexture) {
            promise =  Promise.resolve(data);
        } else {
            throw (new Error('Data type is not supported to convert into texture'));
        }

        return promise.then((texture) => {
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
        });
    },
};
