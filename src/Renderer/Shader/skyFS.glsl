
uniform vec3 v3LightPos;
uniform float g;
uniform float g2;

varying vec3 v3Direction;
varying vec3 c0;
varying vec3 c1;

// Calculates the Mie phase function
float getMiePhase(float fCos, float fCos2, float g, float g2)
{
	return 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + fCos2) / pow(1.0 + g2 - 2.0 * g * fCos, 1.5);
}

// Calculates the Rayleigh phase function
float getRayleighPhase(float fCos2)
{
	return 0.75 + 0.75 * fCos2;
}

void main (void)
{
	float fCos = dot(v3LightPos, v3Direction) / length(v3Direction);
	float fCos2 = fCos * fCos;

	vec3 color =getRayleighPhase(fCos2) * c0 + getMiePhase(fCos, fCos2, g, g2) * c1;

 	gl_FragColor = vec4(color, 1.0);
	gl_FragColor.a = gl_FragColor.b;
}