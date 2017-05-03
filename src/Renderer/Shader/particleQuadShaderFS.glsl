
uniform sampler2D particleTexture;
uniform sampler2D particleTextureOld;

varying vec2 vUv;

void main()
{


     vec4 currentColor = texture2D(particleTexture, vUv);
     vec4 oldColor     = texture2D(particleTextureOld, vUv);

     float alpha = 1.; 	
     if(length(currentColor.rgb) + length(oldColor.rgb) < 0.2) alpha = 0.5 * length(currentColor.rgb) + length(oldColor.rgb); //0.;

     gl_FragColor = vec4(vec3(currentColor.rgb + oldColor.rgb * 0.98), alpha);

}