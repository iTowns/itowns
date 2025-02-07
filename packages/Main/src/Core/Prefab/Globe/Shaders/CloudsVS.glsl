#include <common>
#include <logdepthbuf_pars_vertex>

uniform vec3  lightPosition;
varying vec2  vUv;
varying vec3 vNormal;
varying vec3 pos;
vec3 normalES;
vec3 normalCAMES;

void main() {

    vUv = uv;
    vNormal = normal;
    pos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position,  1.0 );
    #include <logdepthbuf_vertex>
}


