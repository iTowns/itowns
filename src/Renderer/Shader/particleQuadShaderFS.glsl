
uniform sampler2D particleTexture;
uniform sampler2D particleTextureOld;

varying vec2 vUv;

void main()
{


     vec3 currentColor = texture2D(particleTexture, vUv).rgb;
     vec3 oldColor     = texture2D(particleTextureOld, vUv).rgb;

     gl_FragColor = vec4(oldColor, 1.0);

     //vec4(max(currentColor.r,oldColor.r), max(currentColor.g,oldColor.g) , max(currentColor.b,oldColor.b) , 1.0);

     //vec4( texture2D(particleTexture, vUv).rgb + texture2D(particleTextureOld, vUv).rgb , 1.0);
     //vec4(vUv, 0.0, 1.0);//vec4( texture2D(particleTextureOld, vUv).rgb  , 1.0);

             //   vec4( texture2D(particleTexture, vUv).rgb + texture2D(particleTextureOld, vUv).rgb , 1.0);//vec4(vUv, 0.0, 1.0);

}
