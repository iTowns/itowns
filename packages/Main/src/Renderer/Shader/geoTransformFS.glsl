precision highp float;

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform mat3 localUvToWorldTransform;
uniform mat3 mapToUvTransform;
uniform mat3 mapTransform;
uniform float opacity;

#ifdef EPSG_4326_EPSG_3857

// Precomputed constant for converting latitude to Y in Mercator projection
// The constant is derived from the formula for the Mercator projection:
// y = R * ln(tan(pi/4 + lat/2))
// where R is the Earth's radius (approximately 6378137 meters)
// and the factor 0.69314718 is ln(2) to convert from natural log to log base 2
// 20037508.34 is maximum extent size in Mercator projection
const float CTOYL = 20037508.34 / 3.141592653589793 * 0.69314718;

// world WGS84 to Mercator
vec3 worldToMapEPSG(vec3 world_coordinates) {
    vec3 mercatorCoordinates;

    float s = sin(world_coordinates.y);

    mercatorCoordinates.y = 0.5 * log2((1.0 + s) / (1.0 - s)) * CTOYL;

    mercatorCoordinates.z = 1.0;

    return mercatorCoordinates;
}

vec2 mapCoordinatesToUvTexture(mat3 mapTransform, vec2 uvMesh, vec3 mapCoordinates) {

    return vec2(uvMesh.x, (mapTransform * mapCoordinates).y);

}

vec2 optimized(mat3 mapTransform, vec2 uvMesh) {

    return ( mapTransform * vec3( uvMesh, 1 ) ).xy;

}

#endif

void main() {

    #ifdef OPTIMIZED

    vec2 vMapUv = optimized( mapTransform, vUv);

    #else

    // world view coordinates

    vec3 world_coordinates;

    // coordinates in input map EPSG
    vec3 mapCoordinates;

    // local uv mesh to world view EPSG

    world_coordinates = localUvToWorldTransform * vec3(vUv, 1.0);

    // world view EPSG to input map EPSG

    mapCoordinates = worldToMapEPSG(world_coordinates);

    // input raster EPSG to local texture

    vec2 vMapUv = mapCoordinatesToUvTexture(mapToUvTransform, vUv, mapCoordinates);

    #endif

    if (vMapUv.y < 0.0 || vMapUv.y > 1.0 || vMapUv.x < 0.0 || vMapUv.x > 1.0) {
        // break if out of texture
        discard;
    } else {
        gl_FragColor = texture2D(tDiffuse, vMapUv);
        gl_FragColor.a *= opacity;
    }
}