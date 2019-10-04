#include <logdepthbuf_pars_fragment>

uniform int atmoIN;
varying float intensity;

vec4 glowColor = vec4(0.45, 0.74, 1. ,1.0);

void main() {
    #include <logdepthbuf_fragment>
    gl_FragColor = glowColor * intensity;
}

