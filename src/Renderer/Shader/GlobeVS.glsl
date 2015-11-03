uniform sampler2D  dTextures_00[1];

varying vec2 vUv;
varying vec3 vNormal;

void main() {

        vUv = uv;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
        vec3 dv = texture2D( dTextures_00[0], vUv ).xyz;

        // TODO calculer la vrai normal...
        vNormal     = normalize( position );

        float df    = dv.x;
                                                                                                                                                                                                                                                                                                                                                
        vec3 displacedPosition = position +  vNormal  * df;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( displacedPosition ,1.0 );

}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           