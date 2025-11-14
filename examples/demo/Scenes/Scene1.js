import * as itowns from "itowns";

export const Scene1 = {
    placement: {
        coord: { long: 3, lat: 50 },
        range: 250000,
    },
    layers: [],
    onEnter: (view) => {
    },
    onExit: (view) => {
    }
};

function addElevationLayerFromConfig(config) {
    config.source = new itowns.WMTSSource(config.source);
    Scene1.layers.push(new itowns.ElevationLayer(config.id, config));
}
await itowns.Fetcher.json("../layers/JSONLayers/IGN_MNT_HIGHRES.json").then(
    addElevationLayerFromConfig
);
await itowns.Fetcher.json("../layers/JSONLayers/WORLD_DTM.json").then(
    addElevationLayerFromConfig
);
