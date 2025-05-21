import type Layer from 'Layer/Layer';

/**
 * Capabilities are behaviour that can be defined by sources to be used by
 * iTowns' internal code. Users should jusst prefer adding regular methods to
 * their custom sources if they are meant to be called from outside code.
 */
export interface SourceCapabilities {
    layerEventHandler?: LayerEventHandler,
}

export interface LayerEventHandler {
    onLayerAdded(layer: Layer): void;
    onLayerRemoved(layer: Layer): void;
}
