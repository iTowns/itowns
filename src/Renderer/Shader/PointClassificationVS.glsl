uniform float size;
uniform float scale;

varying vec2 cl;
attribute float classification;
uniform int classificationMask[12];

#include <common>
#include <color_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>


void main() {

    #include <color_vertex>
    #include <begin_vertex>
    #include <project_vertex>

    #ifdef USE_SIZEATTENUATION
        gl_PointSize = size * ( scale / - mvPosition.z );
    #else
    #endif
    gl_PointSize = size;

    int i = int(classification);

    if (classificationMask[i] == 0) {
        gl_PointSize = 0.0;
    }

    cl.x = classification;
    cl.y = (transformed.z - 30.0)/ 90.0;

    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    #include <worldpos_vertex>
    #include <shadowmap_vertex>
}
