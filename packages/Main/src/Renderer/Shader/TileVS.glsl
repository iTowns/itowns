#include <itowns/precision_qualifier>
#include <common>
#include <uv_pars_vertex>
#include <itowns/elevation_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>

#include <lights_pars_begin>

varying vec2 vHighPrecisionZW;
varying vec3 vViewPosition;

#if MODE == MODE_FINAL
#include <fog_pars_vertex>
varying vec3        vUv;
varying vec3        vNormal;
#endif
void main() {
        vec2 DISPLACEMENTMAP_UV = vec2(uv);
        vec2 MAP_UV = vec2(uv);

        #include <beginnormal_vertex>
    	#include <defaultnormal_vertex>
        #include <begin_vertex>
        #include <uv_vertex>
        #include <itowns/elevation_vertex>
        #include <itowns/geoid_vertex>
        vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        vHighPrecisionZW = gl_Position.zw;
#if MODE == MODE_FINAL
    	#include <worldpos_vertex>
    	#include <shadowmap_vertex>
        #include <fog_vertex>
        vUv = vec3(uv, 0.0);
        vNormal = normalize ( mat3( normalMatrix[0].xyz, normalMatrix[1].xyz, normalMatrix[2].xyz ) * normal );
#endif
}
