// Copy from GLSL 3.0 conversion for built-in materials and ShaderMaterial in THREE.WebGLProgram
// https://github.com/mrdoob/three.js/blob/696d7836d1fc56c4702a475e6991c4adef7357f4/src/renderers/webgl/WebGLProgram.js#L682
#if defined(WEBGL2)
#define attribute in
#define varying out
#define texture2D texture
#endif
