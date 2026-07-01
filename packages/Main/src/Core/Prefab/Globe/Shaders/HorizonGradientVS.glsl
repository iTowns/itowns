uniform mat4 uProjectionMatrixInverse;

varying vec3 vWorldDirection;

void main() {
    vec4 clipPos = vec4(position.xy, 0.0, 1.0);
    vec4 viewRay = uProjectionMatrixInverse * clipPos;
    // viewMatrix is orthonormal, so inverse rotation = transpose
    vWorldDirection = transpose(mat3(viewMatrix)) * viewRay.xyz;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
