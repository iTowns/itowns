precision highp float;
precision highp int;

#include <logdepthbuf_pars_fragment>

varying vec4 vColor;

void main() {
    // circular point rendering
    if(length(gl_PointCoord - 0.5) > 0.5){
        discard;
    }

    gl_FragColor = vColor;

    #include <logdepthbuf_fragment>
}
