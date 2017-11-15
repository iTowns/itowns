precision highp float;
precision highp int;

#include <logdepthbuf_pars_fragment>

varying vec4 vColor;
uniform bool pickingMode;
uniform float opacity;

uniform bool useCustomColor;
uniform vec3 customColor;

void main() {
    // circular point rendering
    float u = 2.0 * gl_PointCoord.x - 1.0;
    float v = 2.0 * gl_PointCoord.y - 1.0;
    float cc = u*u + v*v;
    if(cc > 1.0){
        discard;
    }

    if (useCustomColor && !pickingMode) {
        gl_FragColor = mix(vColor, vec4(customColor, 1.0), 0.5);
    } else {
        gl_FragColor = vColor;
    }

    if (!pickingMode) {
        gl_FragColor.a = opacity;
    }

    #include <logdepthbuf_fragment>
}
