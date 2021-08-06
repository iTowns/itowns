// Variables for the buildings layer
var meshes = [];
var color = new itowns.THREE.Color();

function acceptFeature(properties) {
    return !!properties.hauteur;
}

function colorBuildings(properties) {
    if (properties.geojson.id.indexOf('bati_remarquable') === 0) {
        return color.set(0x5555ff);
    } else if (properties.geojson.id.indexOf('bati_industriel') === 0) {
        return color.set(0xff5555);
    }
    return color.set(0xeeeeee);
}

function altitudeBuildings(properties) {
    return properties.z_min - properties.hauteur;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}
