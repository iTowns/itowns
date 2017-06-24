precision highp float;
precision highp int;

#include <logdepthbuf_pars_fragment>

varying vec4 vColor;
uniform bool pickingMode;

#ifdef DEBUG
uniform bool useDebugColor;
uniform vec3 debugColor;
#endif

void main() {
    // circular point rendering
    float u = 2.0 * gl_PointCoord.x - 1.0;
    float v = 2.0 * gl_PointCoord.y - 1.0;
    float cc = u*u + v*v;
    if(cc > 1.0){
        discard;
    }

    gl_FragColor = vColor;
#ifdef DEBUG
    if (useDebugColor && !pickingMode) {
        gl_FragColor = mix(vColor, vec4(debugColor, 1.0), 0.5);
    }
#endif

    #include <logdepthbuf_fragment>
}
