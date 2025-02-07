#include <common>
#include <logdepthbuf_pars_vertex>

uniform int atmoIN;
varying float intensity;

void main()
{
    vec3 normalES    = normalize( normalMatrix * normal );
    vec3 normalCAMES = normalize( normalMatrix * cameraPosition );

    if(atmoIN == 0) {
        intensity = pow(0.666 - dot(normalES, normalCAMES), 4. );
    } else {
        intensity = pow( 1.  - dot(normalES, normalCAMES), 0.8 );
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position,  1.0 );

    #include <logdepthbuf_vertex>
}


