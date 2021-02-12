import Layer from 'Layer/Layer';
import { removeLayeredMaterialNodeLayer, updateRasterNode } from 'Process/LayeredMaterialNodeProcessing';

import textureConverter from 'Converter/textureConverter';
import { CACHE_POLICIES } from 'Core/Scheduler/Cache';

class RasterLayer extends Layer {
    constructor(id, config) {
        config.cacheLifeTime = config.cacheLifeTime == undefined ? CACHE_POLICIES.TEXTURE : config.cacheLifeTime;
        super(id, config);
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

    update(context, layer, node, parent) {
        return updateRasterNode(context, this, node, parent);
    }
}

export default RasterLayer;
