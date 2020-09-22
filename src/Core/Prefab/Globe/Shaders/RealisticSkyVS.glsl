varying vec3 vWorldPosition;
uniform float sizeDome;

void main() {
	vec4 worldPosition = modelMatrix *  vec4( cameraPosition + position * sizeDome, 1.0 );
	vWorldPosition = worldPosition.xyz;

	gl_Position = projectionMatrix * modelViewMatrix * vec4( cameraPosition + position * sizeDome, 1.0 );
}