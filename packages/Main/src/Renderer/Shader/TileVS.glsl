#include <itowns/precision_qualifier>
#include <common>
#include <itowns/elevation_pars_vertex>
#include <logdepthbuf_pars_vertex>
#if NUM_CRS > 1
attribute float     uv_1;
#endif

uniform bool lightingEnabled;
varying vec2 vHighPrecisionZW;

#if MODE == MODE_FINAL
#include <fog_pars_vertex>
varying vec3        vUv;
varying vec3        vNormal;
#endif
void main() {
        #include <begin_vertex>
        #include <itowns/elevation_vertex>
        #include <itowns/geoid_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        vHighPrecisionZW = gl_Position.zw;
#if MODE == MODE_FINAL
        #include <fog_vertex>
        #if NUM_CRS > 1
        vUv = vec3(uv, (uv_1 > 0.) ? uv_1 : uv.y); // set uv_1 = uv if uv_1 is undefined
        #else
        vUv = vec3(uv, 0.0);
        #endif
        vNormal = normalize ( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
#endif
}
