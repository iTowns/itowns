import Layer from 'Layer/Layer';
import { updateLayeredMaterialNodeElevation, removeLayeredMaterialNodeLayer } from 'Process/LayeredMaterialNodeProcessing';
import textureConverter from 'Converter/textureConverter';
import { CACHE_POLICIES } from 'Core/Scheduler/Cache';

/**
 * @property {boolean} isElevationLayer - Used to checkout whether this layer is
 * an ElevationLayer. Default is true. You should not change this, as it is used
 * internally for optimisation.
 * @property {number} noDataValue - Used to specify a **null** or **no data value** in the elevation terrain.
 * @property {number} scale - Used to apply a scale on the elevation value. It
 * can be used for exageration of the elevation, like in [this
 * example](https://www.itowns-project.org/itowns/examples/#plugins_pyramidal_tiff).
 */
class ElevationLayer extends Layer {
    /**
     * A simple layer, managing an elevation texture to add some reliefs on the
     * plane or globe view for example.
     *
     * @constructor
     * @extends Layer
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} [config] - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name.
     * @param {Source} [config.source] - Description and options of the source.
     *
     * @example
     * // Create an ElevationLayer
     * const elevation = new ElevationLayer('IGN_MNT', {
     *      source: {
     *          url: 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL',
     *          protocol: 'wmts',
     *          format: 'image/x-bil;bits=32',
     *      },
     * });
     *
     * // Add the layer
     * view.addLayer(elevation);
     */
    constructor(id, config = {}) {
        config.cacheLifeTime = config.cacheLifeTime == undefined ? CACHE_POLICIES.TEXTURE : config.cacheLifeTime;
        super(id, config);
        this.isElevationLayer = true;

        // This is used to add a factor needed to color texture
        let baseScale = 1.0;
        if (this.useColorTextureElevation) {
            baseScale = this.colorTextureElevationMaxZ - this.colorTextureElevationMinZ;
        }

        this.defineLayerProperty('scale', this.scale || 1.0, (self) => {
            self.parent.object3d.traverse((obj) => {
                if (obj.layer == self.parent && obj.material) {
                    obj.material.setElevationScale(self.scale * baseScale);
                    obj.obb.updateScaleZ(self.scale);
                }
            });
        });
    }

    update(context, layer, node, parent) {
        return updateLayeredMaterialNodeElevation(context, this, node, parent);
    }

    convert(data, extentDestination) {
        return textureConverter.convert(data, extentDestination, this);
    }

    /**
    * All layer's textures are removed from scene and disposed from video device.
    */
    delete() {
        for (const root of this.parent.level0Nodes) {
            root.traverse(removeLayeredMaterialNodeLayer(this.id));
        }
    }
}

export default ElevationLayer;
