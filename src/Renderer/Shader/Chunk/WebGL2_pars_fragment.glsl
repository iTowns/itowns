// Copy from GLSL 3.0 conversion for built-in materials and ShaderMaterial in THREE.WebGLProgram
// https://github.com/mrdoob/three.js/blob/696d7836d1fc56c4702a475e6991c4adef7357f4/src/renderers/webgl/WebGLProgram.js#L682
#if defined(WEBGL2)
#define varying in
out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
#define textureCube texture
#define texture2DProj textureProj
#define texture2DLodEXT textureLod
#define texture2DProjLodEXT textureProjLod
#define textureCubeLodEXT textureLod
#define texture2DGradEXT textureGrad
#define texture2DProjGradEXT textureProjGrad
#define textureCubeGradEXT textureGrad
#endif
