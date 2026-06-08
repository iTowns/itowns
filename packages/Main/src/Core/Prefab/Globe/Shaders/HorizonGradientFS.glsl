uniform vec3  fogColor;
uniform float sinHorizon;
uniform float bandHalfWidth;
uniform vec3  geodeticUp;

varying vec3 vWorldDirection;

vec3 linearToSRGB(vec3 c) {
    return pow(c, vec3(1.0 / 2.2));
}

void main() {
    gl_FragDepth = 1.0;
    // Use the world-space ray direction computed in the vertex shader
    vec3 worldRay = normalize(vWorldDirection);
    // Elevation of ray relative to geodetic up (surface normal)
    float sinElev = dot(worldRay, geodeticUp);
    // Gaussian fade above horizon, constant fog below
    float t = (sinElev - sinHorizon) / max(bandHalfWidth, 1e-4);
    float alpha = t <= 0.0 ? 1.0 : exp(-0.5 * t * t);
    if (alpha < 1e-3) discard;
    gl_FragColor = vec4(linearToSRGB(fogColor), alpha);
}
