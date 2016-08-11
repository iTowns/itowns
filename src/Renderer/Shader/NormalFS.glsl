varying vec3 vNormal;

float NEAR = 1.0; // projection matrix's near plane
float FAR = 42000.0; // projection matrix's far plane
float linearizeDepth(float depth)
{
    float z = depth * 2.0 - 1.0; // Back to NDC
    return (2.0 * NEAR * FAR) / (FAR + NEAR - z * (FAR - NEAR));
}

void main() {
//
    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
    #endif

    gl_FragColor = vec4(vNormal * 0.5 + 0.5, (gl_FragCoord.z / gl_FragCoord.w) / 1000.0);
}
