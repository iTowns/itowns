
uniform sampler2D texture;
uniform bool useTexture;

varying vec2 vUV;
varying vec4 vColor;
varying vec3 vPosition;

void main() {
    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

       gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

	vec4 c = vColor;

    if(useTexture) {
        c = texture2D( texture, vUV );
    }

    gl_FragColor = c;
}