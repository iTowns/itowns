import * as THREE from 'three';
import { ELEVATION_MODES } from 'Renderer/LayeredMaterial';
import { checkNodeElevationTextureValidity, insertSignificantValuesFromParent, computeMinMaxElevation } from 'Parser/XbilParser';
import CRS from 'Core/Geographic/Crs';

export const EMPTY_TEXTURE_ZOOM = -1;

const pitch = new THREE.Vector4();


/**
 * A `RasterTile` is part of raster [`Layer`]{@link Layer} data.
 * This part is a spatial subdivision of the extent of a layer.
 * In the `RasterTile`, The data are converted on three.js textures.
 * This `RasterTile` textures are assigned to a `LayeredMaterial`.
 * This material is applied on terrain (TileMesh).
 * The color textures are mapped to color the terrain.
 * The elevation textures are used to displace vertex terrain.
 *
 * @class RasterTile
 */
class RasterTile extends THREE.EventDispatcher {
    constructor(material, layer) {
        super();
        this.layer = layer;
        this.crs = layer.parent.tileMatrixSets.indexOf(CRS.formatToTms(layer.crs));
        if (this.crs == -1) {
            console.error('Unknown crs:', layer.crs);
        }

        this.textures = [];
        this.offsetScales = [];
        this.level = EMPTY_TEXTURE_ZOOM;
        this.material = material;

        this._handlerCBEvent = () => { this.material.layersNeedUpdate = true; };
        layer.addEventListener('visible-property-changed', this._handlerCBEvent);
    }

    get id() {
        return this.layer.id;
    }

    get opacity() {
        return this.layer.opacity;
    }

    get visible() {
        return this.layer.visible;
    }

    initFromParent(parent, extents) {
        if (parent && parent.level > this.level) {
            let index = 0;
            for (const c of extents) {
                for (const texture of parent.textures) {
                    if (c.isInside(texture.extent)) {
                        this.setTexture(index++, texture, c.offsetToParent(texture.extent));
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

    dispose(removeEvent) {
        if (removeEvent) {
            this.layer.removeEventListener('visible-property-changed', this._handlerCBEvent);
            // dispose all events
            this._listeners = {};
        }
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
        this.level = (texture && (index == 0)) ? texture.extent.zoom : this.level;
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

export default RasterTile;

export class RasterColorTile extends RasterTile {
    get effect_type() {
        return this.layer.effect_type;
    }
    get effect_parameter() {
        return this.layer.effect_parameter;
    }
}

export class RasterElevationTile extends RasterTile {
    constructor(material, layer) {
        super(material, layer);
        const defaultEle = {
            bias: 0,
            mode: ELEVATION_MODES.DATA,
            zmin: 0,
            zmax: Infinity,
        };

        this.scaleFactor = 1.0;

        // Define elevation properties
        if (layer.useRgbaTextureElevation) {
            defaultEle.mode = ELEVATION_MODES.RGBA;
            defaultEle.zmax = 5000;
            throw new Error('Restore this feature');
        } else if (layer.useColorTextureElevation) {
            this.scaleFactor = layer.colorTextureElevationMaxZ - layer.colorTextureElevationMinZ;
            defaultEle.mode = ELEVATION_MODES.COLOR;
            defaultEle.bias = layer.colorTextureElevationMinZ;
            this.min = this.layer.colorTextureElevationMinZ;
            this.max = this.layer.colorTextureElevationMaxZ;
        } else {
            this.min = 0;
            this.max = 0;
        }

        this.bias = layer.bias || defaultEle.bias;
        this.mode = layer.mode || defaultEle.mode;
        this.zmin = layer.zmin || defaultEle.zmin;
        this.zmax = layer.zmax || defaultEle.zmax;

        layer.addEventListener('scale-property-changed', this._handlerCBEvent);
    }

    get scale() {
        return this.layer.scale * this.scaleFactor;
    }

    dispose(removeEvent) {
        super.dispose(removeEvent);
        if (removeEvent) {
            this.layer.removeEventListener('scale-property-changed', this._handlerCBEvent);
        }
    }

    initFromParent(parent, extents) {
        super.initFromParent(parent, extents);
        this.updateMinMaxElevation();
    }

    setTextures(textures, offsetScales) {
        this.replaceNoDataValueFromTexture(textures[0]);
        super.setTextures(textures, offsetScales);
        this.updateMinMaxElevation();
    }

    updateMinMaxElevation() {
        if (this.textures[0] && !this.layer.useColorTextureElevation) {
            const { min, max } = computeMinMaxElevation(this.textures[0], this.offsetScales[0], this.layer.noDataValue);
            if (this.min != min || this.max != max) {
                this.min = min;
                this.max = max;
                this.dispatchEvent({ type: 'updatedElevation', node: this });
            }
        }
    }

    replaceNoDataValueFromTexture(texture) {
        const nodatavalue = this.layer.noDataValue;
        if (nodatavalue == undefined) {
            return;
        }
        // replace no datat value with parent texture value.
        const parentTexture = this.textures[0];
        const parentDataElevation = parentTexture && parentTexture.image && parentTexture.image.data;
        const dataElevation = texture.image && texture.image.data;
        if (dataElevation && parentDataElevation && !checkNodeElevationTextureValidity(dataElevation, nodatavalue)) {
            texture.extent.offsetToParent(parentTexture.extent, pitch);
            insertSignificantValuesFromParent(dataElevation, parentDataElevation, nodatavalue, pitch);
        }
    }
}
