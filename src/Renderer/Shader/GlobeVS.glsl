uniform sampler2D  dTextures_00[1];
uniform int        nbTextures_00;

varying vec2 vUv;
varying vec3 vNormal;

void main() {

        vUv = uv;

        if(nbTextures_00 > 0)
        {
            float dv = texture2D( dTextures_00[0], vUv ).w;

            vNormal  = normalize( position );

            vec3 displacedPosition = position +  vNormal  * dv;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( displacedPosition ,1.0 );
        }
        else
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position ,1.0 );

}