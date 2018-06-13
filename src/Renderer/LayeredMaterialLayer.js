import * as THREE from 'three';
import { CRS_DEFINES } from './LayeredMaterial';

const EMPTY_TEXTURE_ZOOM = -1;

function defineLayerProperty(layer, property, initValue, defaultValue) {
    let _value = initValue !== undefined ? initValue : defaultValue;
    Object.defineProperty(layer, property, {
        get: () => _value,
        set: (value) => {
            if (_value !== value) {
                layer.material.uniformsNeedUpdate = true;
                _value = value;
            }
        },
    });
}

class LayeredMaterialLayer {
    constructor(material, options) {
        this.id = options.id;
        this.textureOffset = 0; // will be updated in updateUniforms()
        this.crs = CRS_DEFINES.findIndex(crs => crs.includes(options.tileMT || 'WGS84'));
        if (this.crs == -1) {
            console.error('Unknown crs:', options.tileMT);
        }

        defineLayerProperty(this, 'opacity', options.opacity, 1);
        defineLayerProperty(this, 'visible', options.visible, true);
        defineLayerProperty(this, 'effect', options.effect, 0);
        defineLayerProperty(this, 'bias', options.bias, 0);
        defineLayerProperty(this, 'scale', options.scale, 1);
        defineLayerProperty(this, 'mode', options.mode, 0);
        defineLayerProperty(this, 'zmin', options.zmin, 0);
        defineLayerProperty(this, 'zmax', options.zmax, Infinity);

        this.textures = [];
        this.offsetScales = [];
        this.level = EMPTY_TEXTURE_ZOOM;
        this.needsUpdate = false;

        this.material = material;
    }

    setValues(values) {
        Object.assign(this, values);
    }

    updateUniforms() {
        if (this.needsUpdate) {
            this.material.updateUniforms();
        }
    }

    dispose(needsUpdate = true) {
        // TODO: WARNING  verify if textures to dispose aren't attached with ancestor
        for (const texture of this.textures) {
            if (texture instanceof THREE.Texture) {
                texture.dispose();
            }
        }
        this.level = EMPTY_TEXTURE_ZOOM;
        this.textures = [];
        this.offsetScales = [];
        this.needsUpdate = needsUpdate;
        this.updateUniforms();
    }

    setTexture(index, texture, offsetScale) {
        this.level = (texture && (index == 0)) ? texture.coords.zoom : this.level;
        this.textures[index] = texture || null;
        this.offsetScales[index] = offsetScale;
        this.needsUpdate = true;
        this.updateUniforms();
    }

    setTextures(textures, pitchs) {
        this.dispose(false);
        for (let i = 0, il = textures.length; i < il; i++) {
            if (textures[i]) {
                this.setTexture(i, textures[i], pitchs[i]);
            }
        }
    }
}

export default LayeredMaterialLayer;
