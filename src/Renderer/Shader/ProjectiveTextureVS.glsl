#include <itowns/precision_qualifier>
#include <itowns/projective_texturing_pars_vertex>
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vNormal;

void main() {
    #include <begin_vertex>
    #include <project_vertex>
    vNormal = normal;
    #include <itowns/projective_texturing_vertex>
    #include <logdepthbuf_vertex>
}
