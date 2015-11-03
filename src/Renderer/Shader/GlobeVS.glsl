uniform sampler2D  dTextures_00[1];

varying vec2 vUv;
varying vec3 vNormal;

void main() {

        vUv = uv;

        float dv = texture2D( dTextures_00[0], vUv ).w*0.000001;

        vNormal     = normalize( position );
                                                                                                                                                                                                                                                                                                                                      
        vec3 displacedPosition = position +  vNormal  * dv;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( displacedPosition ,1.0 );

}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           