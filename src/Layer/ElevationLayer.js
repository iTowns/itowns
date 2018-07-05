import Layer from './Layer';

class ElevationLayer extends Layer {
    constructor(id) {
        super(id, 'elevation');

        this.defineLayerProperty('frozen', false);
    }
}

export default ElevationLayer;
