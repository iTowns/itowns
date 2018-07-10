import Layer from './Layer';

class ColorLayer extends Layer {
    constructor(id) {
        super(id, 'color');

        this.defineLayerProperty('frozen', false);
        this.defineLayerProperty('visible', true);
        this.defineLayerProperty('opacity', 1.0);
        this.defineLayerProperty('sequence', 0);
    }
}

export default ColorLayer;
