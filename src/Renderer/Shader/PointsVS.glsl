precision highp float;
precision highp int;

#include <logdepthbuf_pars_vertex>
#define EPSILON 1e-6

attribute vec3 position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float size;

uniform int mode;
uniform float opacity;
uniform vec4 overlayColor;
attribute vec3 color;
attribute vec4 unique_id;
attribute float intensity;

varying vec4 vColor;

#include <itowns_normal_pars_vertex>

void main() {
    if (mode == MODE_PICKING) {
        vColor = unique_id;
    } else if (mode == MODE_INTENSITY) {
        vColor = vec4(intensity, intensity, intensity, opacity);
    } else if (mode == MODE_NORMAL) {
        #include <itowns_normal_vertex>
        vColor = vec4(abs(normal), opacity);
    } else {
        // default to color mode
        vColor = vec4(mix(color, overlayColor.rgb, overlayColor.a), opacity);
    }

    gl_Position = projectionMatrix * (modelViewMatrix * vec4( position, 1.0 ));

    if (size > 0.) {
        gl_PointSize = size;
    } else {
        gl_PointSize = clamp(-size / gl_Position.w, 3.0, 10.0);
    }

    #include <logdepthbuf_vertex>
}
