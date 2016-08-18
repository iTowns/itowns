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

#define USE_SIZEATTENUATION
void main() {
    int i = int(classification);
    if (classificationMask[i] == 0) {
        gl_Position = vec4(-100000, -100000, -100000, 1.0);
        return;
    }

    #include <color_vertex>
    #include <begin_vertex>
    #include <project_vertex>

    #ifdef USE_SIZEATTENUATION
        gl_PointSize = size * (1.0 + max(0.0, - mvPosition.z / scale));
    #else
        gl_PointSize = size;
    #endif



    cl.x = classification;
    cl.y = (transformed.z - 30.0)/ 90.0;

    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    #include <worldpos_vertex>
    #include <shadowmap_vertex>
}
