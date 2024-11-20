import * as THREE from 'three';
import Feature2Texture from 'Converter/Feature2Texture';
import Extent from 'Core/Geographic/Extent';

const extentTexture = new Extent('EPSG:4326', [0, 0, 0, 0]);

const textureLayer = (texture, layer) => {
    texture.generateMipmaps = false;
    texture.magFilter = layer.magFilter || THREE.LinearFilter;
    texture.minFilter = layer.minFilter || THREE.LinearFilter;
    return texture;
};

function textureColorLayer(texture, layer) {
    texture.anisotropy = 16;
    texture.premultiplyAlpha = layer.transparent;
    return textureLayer(texture, layer);
}

export default {
    convert(data, destinationTile, layer) {
        let texture;
        if (data.isFeatureCollection) {
            const backgroundLayer = layer.source.backgroundLayer;
            const backgroundColor = (backgroundLayer && backgroundLayer.paint) ?
                new THREE.Color(backgroundLayer.paint['background-color']) :
                undefined;

            destinationTile.toExtent(layer.crs, extentTexture);
            texture = Feature2Texture.createTextureFromFeature(data, extentTexture, layer.subdivisionThreshold, layer.style, backgroundColor);
            texture.features = data;
            texture.extent = destinationTile;
        } else if (data.isTexture) {
            texture = data;
        } else {
            throw (new Error('Data type is not supported to convert into texture'));
        }

        if (layer.isColorLayer) {
            return textureColorLayer(texture, layer);
        } else if (layer.isElevationLayer) {
            if (texture.flipY) {
                // DataTexture default to false, so make sure other Texture types
                // do the same (eg image texture)
                // See UV construction for more details
                texture.flipY = false;
            }
            return textureLayer(texture, layer);
        }
    },
};
