
uniform sampler2D particleTexture;
uniform sampler2D particleTextureOld;

varying vec2 vUv;

void main()
{


     vec3 currentColor = texture2D(particleTexture, vUv).rgb;
     vec3 oldColor     = texture2D(particleTextureOld, vUv).rgb;

     gl_FragColor = vec4(currentColor + oldColor * 0.99, 1.0);

}
