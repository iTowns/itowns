uniform int  uuid;
uniform vec3 diffuseColor;
varying float idx;

vec4 pack(float id) {
    vec4 color;
    color.b = floor(id / 256.0 / 256.0);
    color.g = floor((id - color.b * 256.0 * 256.0) / 256.0);
    color.r = floor(id - color.b * 256.0 * 256.0 - color.g * 256.0);
    color.a = 255.0;
    // now we have a vec3 with the 3 components in range [0..255]. Let's normalize it!
    return color / 255.0;
}

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    #if defined(MULTIPLE_GEOMETRIES)

    gl_FragColor = pack(float(uuid) + 256.0 * 256.0 * floor(idx + 0.5));

    #else

    gl_FragColor = pack(float(uuid));

    #endif

}
