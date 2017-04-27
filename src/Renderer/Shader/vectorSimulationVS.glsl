
attribute float particleLife;
varying vec2 vUv;
varying float vParticleLife;


void main()
{


    vUv = vec2(uv.x, uv.y);
    vParticleLife = particleLife;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
 

}


