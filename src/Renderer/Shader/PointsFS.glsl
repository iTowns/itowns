#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>

varying vec4 vColor;
uniform bool picking;
uniform int shape;

void main() {
    #include <logdepthbuf_fragment>
    //square shape does not require any change.
    if (shape == PNTS_SHAPE_CIRCLE) {
        //circular rendering in glsl
        if ((length(gl_PointCoord - 0.5) > 0.5) || (vColor.a == 0.0)) {
            discard;
        }
    }

    gl_FragColor = vColor;
}
