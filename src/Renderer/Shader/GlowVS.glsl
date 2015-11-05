
uniform int atmoIN;
varying float intensity;
vec3 normalES;
vec3 normalCAMES;

void main() 
{
    normalES = normalize( normalMatrix * normal );
    normalCAMES = normalize( normalMatrix * cameraPosition );

    if(atmoIN == 0)
        intensity = pow( 0.55 - dot(normalES, normalCAMES), 4. ); 
      else
        intensity = pow( 1.  - dot(normalES, normalCAMES), 0.8 );

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}


