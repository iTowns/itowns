

uniform vec3 diffuse;
uniform float opacity;

varying vec2 cl;

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

    #include <clipping_planes_fragment>

    vec3 outgoingLight = vec3( 0.0 );
    vec4 diffuseColor = vec4( diffuse, opacity );

    #include <logdepthbuf_fragment>
    #include <map_particle_fragment>
    #include <color_fragment>
    #include <alphatest_fragment>

    outgoingLight = diffuseColor.rgb;


    vec4 color = vec4(0.3, 0.6, 0.6, 1.0);

    if (cl.x <=  0.0) color = vec4(0.5, 0.5,0.5, 1.0);
    else if (cl.x <=  1.0) color = vec4(0.5, 0.5,0.5, 1.0);
    else if (cl.x <=  2.0) color = vec4(0.63, 0.32, 0.18, 1.0);
    else if (cl.x <=  3.0) color = vec4(0.0, 1.0, 0.0, 1.0);
    else if (cl.x <=  4.0) color = vec4(0.0, 0.8, 0.0, 1.0);
    else if (cl.x <=  5.0) color = vec4(0.0, 0.6, 0.0, 1.0);
    else if (cl.x <=  6.0) color = vec4(1.0, 0.66, 0.0, 1.0);
    else if (cl.x <=  7.0) color = vec4(1.0, 0, 1.0, 1.0);
    else if (cl.x <=  8.0) color = vec4(1.0, 0, 0.0, 1.0);
    else if (cl.x <=  9.0) color = vec4(0.0, 0.0, 1.0, 1.0);
    else if (cl.x <=  12.0) color = vec4(1.0, 1.0, 0.0, 1.0);

    color.rgb *= cl.y;

    gl_FragColor = color;


    #include <premultiplied_alpha_fragment>
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>


}
