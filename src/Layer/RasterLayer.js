import Layer from 'Layer/Layer';
import { removeLayeredMaterialNodeLayer } from 'Process/LayeredMaterialNodeProcessing';
import textureConverter from 'Converter/textureConverter';
import { CACHE_POLICIES } from 'Core/Scheduler/Cache';

class RasterLayer extends Layer {
    constructor(id, config) {
        config.cacheLifeTime = config.cacheLifeTime ?? CACHE_POLICIES.TEXTURE;
        super(id, config);
    }

    convert(data, extentDestination) {
        return textureConverter.convert(data, extentDestination, this);
    }

    /**
    * All layer's textures are removed from scene and disposed from video device.
    */
    dispose() {
        for (const root of this.parent.level0Nodes) {
            root.traverse(removeLayeredMaterialNodeLayer(this.id));
        }
    }

    /**
     * Deprecated function. Use dispose()
     */
    delete() {
        console.warn('`RasterLayer.delete` method is deprecated. Please use `RasterLayer.dispose` instead.');
        this.dispose();
    }
}

export default RasterLayer;
