#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>
#include <itowns/projective_texturing_pars_fragment>

void main(void)
{
    #include <logdepthbuf_fragment>

    vec4 color  = vec4(0.);

    #pragma unroll_loop
    for ( int i = 0; i < NUM_TEXTURES; i ++ ) {
        color += projectiveTextureColor(projectiveTextureCoords[ i ], projectiveTextureDistortion[ i ], projectiveTexture[ i ]);
    }

    if (color.a > 0.0) color /= color.a;
    color.a = 1.;
    gl_FragColor = color;
}
