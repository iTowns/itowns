import * as itowns from "itowns";

export const Default = {
    placement: {
        coord: { long: 80, lat: 50 },
        range: 25000000,
    },
    layers: [],
    onEnter: (view) => {
        // Set atmosphere layer
        const atmosphere = view.getLayerById("atmosphere");
        atmosphere.setRealisticOn(true);
    },
    onExit: (view) => {
        const atmosphere = view.getLayerById("atmosphere");
        atmosphere.setRealisticOn(false);
    }
};