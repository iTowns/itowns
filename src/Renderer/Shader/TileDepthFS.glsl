const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );
const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );

vec4 pack1K ( float depth ) {
    depth /= 100000000.0;
    vec4 res = mod( depth * bitSh * vec4( 255 ), vec4( 256 ) ) / vec4( 255 );
    res -= res.xxyz * bitMsk;
    return res;
}

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
        float z = 1.0/ gl_FragCoord.w ;
        gl_FragColor = pack1K(z);
    #else
        float z = gl_FragCoord.z / gl_FragCoord.w;
        gl_FragColor = pack1K(z);
    #endif

}
