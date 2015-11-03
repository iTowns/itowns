
varying vec3 vNormal;
void main() 
{
    float intensity = pow( 0.7 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0 ); 
    gl_FragColor = vec4( 0.2, 0.70, 1.0, 1.0 ) * intensity;

}

