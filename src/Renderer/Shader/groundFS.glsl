
//uniform float fNightScale;
//uniform vec3 v3LightPosition;
//uniform sampler2D tDiffuse;
//uniform sampler2D tDiffuseNight;

varying vec3 c0;
varying vec3 c1;
// varying vec3 vNormal;
// varying vec2 vUv;

void main (void)
{

	//vec3 diffuseTex = texture2D( tDiffuse, vUv ).xyz;
	//vec3 diffuseNightTex = texture2D( tDiffuseNight, vUv ).xyz;

	//vec3 day = diffuseTex * c0;
	//vec3 night = fNightScale * diffuseNightTex * diffuseNightTex * diffuseNightTex * (1.0 - c0);

	gl_FragColor = vec4(c1, 1.0 - c0/4.) ;//+ vec4(day + night, 1.0); //vec4(1.,0.,0.,0.5);//

}