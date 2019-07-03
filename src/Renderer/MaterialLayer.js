import * as THREE from 'three';
import { ELEVATION_MODES } from 'Renderer/LayeredMaterial';
import { checkNodeElevationTextureValidity, insertSignificantValuesFromParent } from 'Parser/XbilParser';
import CRS from 'Core/Geographic/Crs';

export const EMPTY_TEXTURE_ZOOM = -1;

const pitch = new THREE.Vector4();

function defineLayerProperty(layer, property, initValue, defaultValue) {
    let _value = initValue !== undefined ? initValue : defaultValue;
    Object.defineProperty(layer, property, {
        get: () => _value,
        set: (value) => {
            if (_value !== value) {
                _value = value;
            }
        },
    });
}

class MaterialLayer {
    constructor(material, layer) {
        this.id = layer.id;
        this.textureOffset = 0; // will be updated in updateUniforms()
        this.crs = layer.parent.tileMatrixSets.indexOf(CRS.formatToTms(layer.projection));
        if (this.crs == -1) {
            console.error('Unknown crs:', layer.projection);
        }

        // Define color properties
        let _valueOpacity = layer.opacity !== undefined ? layer.opacity : true;
        Object.defineProperty(this, 'opacity', {
            get: () => _valueOpacity,
            set: (value) => {
                if (_valueOpacity !== value) {
                    if (value === 0 || _valueOpacity === 0) {
                        this.material.layersNeedUpdate = true;
                    }
                    _valueOpacity = value;
                }
            },
        });

        let _valueVisibility = layer.visible !== undefined ? layer.visible : true;
        Object.defineProperty(this, 'visible', {
            get: () => _valueVisibility,
            set: (value) => {
                if (_valueVisibility !== value) {
                    this.material.layersNeedUpdate = true;
                    _valueVisibility = value;
                }
            },
        });

        defineLayerProperty(this, 'effect', layer.fx, 0);

        const defaultEle = {
            bias: 0,
            scale: 1,
            mode: ELEVATION_MODES.DATA,
            zmin: 0,
            zmax: Infinity,
        };

        let scaleFactor = 1.0;

        // Define elevation properties
        if (layer.useRgbaTextureElevation) {
            defaultEle.mode = ELEVATION_MODES.RGBA;
            defaultEle.zmax = 5000;
            throw new Error('Restore this feature');
        } else if (layer.useColorTextureElevation) {
            scaleFactor = layer.colorTextureElevationMaxZ - layer.colorTextureElevationMinZ;
            defaultEle.mode = ELEVATION_MODES.COLOR;
            defaultEle.bias = layer.colorTextureElevationMinZ;
        }

        defineLayerProperty(this, 'bias', layer.bias, defaultEle.bias);
        defineLayerProperty(this, 'scale', layer.scale * scaleFactor, defaultEle.scale * scaleFactor);
        defineLayerProperty(this, 'mode', layer.mode, defaultEle.mode);
        defineLayerProperty(this, 'zmin', layer.zmin, defaultEle.zmin);
        defineLayerProperty(this, 'zmax', layer.zmax, defaultEle.zmax);

        this.textures = [];
        this.offsetScales = [];
        this.level = EMPTY_TEXTURE_ZOOM;
        this.material = material;
    }

    initFromParent(parent, extents) {
        if (parent && parent.level > this.level) {
            let index = 0;
            for (const c of extents) {
                for (const texture of parent.textures) {
                    if (c.isInside(texture.coords)) {
                        this.setTexture(index++, texture, c.offsetToParent(texture.coords));
                        break;
                    }
                }
            }

            if (__DEBUG__) {
                if (index != extents.length) {
                    console.error(`non-coherent result ${index} vs ${extents.length}.`, extents);
                }
            }
        }
    }

    replaceNoDataValueFromParent(parent, nodatavalue) {
        const dataElevation = this.textures[0].image.data;
        const parentTexture = parent && parent.textures[0];
        if (dataElevation && parentTexture && !checkNodeElevationTextureValidity(dataElevation, nodatavalue)) {
            const coords = this.textures[0].coords;
            coords.offsetToParent(parentTexture.coords, pitch);
            insertSignificantValuesFromParent(dataElevation, parentTexture.image.data, nodatavalue, pitch);
        }
    }

    dispose() {
        // TODO: WARNING  verify if textures to dispose aren't attached with ancestor
        for (const texture of this.textures) {
            if (texture.isTexture) {
                texture.dispose();
            }
        }
        this.level = EMPTY_TEXTURE_ZOOM;
        this.textures = [];
        this.offsetScales = [];
        this.material.layersNeedUpdate = true;
    }

    setTexture(index, texture, offsetScale) {
        this.level = (texture && (index == 0)) ? texture.coords.zoom : this.level;
        this.textures[index] = texture || null;
        this.offsetScales[index] = offsetScale;
        this.material.layersNeedUpdate = true;
    }

    setTextures(textures, pitchs) {
        this.dispose(false);
        for (let i = 0, il = textures.length; i < il; ++i) {
            this.setTexture(i, textures[i], pitchs[i]);
        }
    }
}

export default MaterialLayer;
