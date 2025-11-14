/* eslint-disable quotes */
import * as itowns from "itowns";

export const Scene3 = {
    placement: {
        coord: { long: 3.05, lat: 48.97 },
        range: 30000,
        tilt: 90,
        heading: 0,
    },
    layers: [],
    onEnter: (view) => {
        const labelsLayer = view.getLayerById("cities-label");
        if (labelsLayer) {
            labelsLayer.visible = true;
        }
    },
    onExit: (view) => {
        const labelsLayer = view.getLayerById("cities-label");
        if (labelsLayer) {
            labelsLayer.visible = false;
        }
    },
};

const floodSource = new itowns.FileSource({
    url: "https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/multipolygon.geojson",
    crs: "EPSG:4326",
    format: "application/json",
});
const floodStyle = {
    fill: {
        color: "cyan",
        opacity: 0.5,
    },
    stroke: {
        color: "blue",
    },
};
const floodLayer = new itowns.ColorLayer("flood", {
    source: floodSource,
    style: floodStyle,
});

const citySource = new itowns.FileSource({
    url: "https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/cities.geojson",
    crs: "EPSG:4326",
    format: "application/json",
});
const cityStyle = {
    stroke: {
        color: "red",
    },
    point: {
        color: "white",
        line: "red",
        radius: 3,
    },
    text: {
        field: "{name}",
        anchor: "bottom-left",
        size: 18,
        haloColor: "white",
        haloWidth: 1,
        font: ["monospace"],
    },
};
const cityLayer = new itowns.ColorLayer("cities", {
    source: citySource,
    style: cityStyle,
    addLabelLayer: true,
});

Scene3.layers.push(floodLayer);
Scene3.layers.push(cityLayer);
