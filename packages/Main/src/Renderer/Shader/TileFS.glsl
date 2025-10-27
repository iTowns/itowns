#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>
#include <itowns/pitUV>
#include <itowns/color_layers_pars_fragment>
#if MODE == MODE_FINAL
#include <fog_pars_fragment>
#include <itowns/overlay_pars_fragment>
#include <itowns/lighting_pars_fragment>
#endif
#include <itowns/mode_pars_fragment>

uniform vec3        diffuse;
uniform float       opacity;
varying vec3        vUv; // uv.x/uv_1.x, uv.y, uv_1.y
varying vec2        vHighPrecisionZW;

void main() {
    #include <logdepthbuf_fragment>

#if MODE == MODE_ID

    #include <itowns/mode_id_fragment>

#elif MODE == MODE_DEPTH

    #include <itowns/mode_depth_fragment>

#else

  gl_FragColor = vec4(diffuse, opacity);

  vec4 color = texture(map, pitUV(vUv.xy, colorOffsetScales));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);

  #if DEBUG == 1
    if (showOutline) {
        color = getOutlineColor( outlineColors[ 0 ], vUv.xy);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);
    }
    #endif

    #include <fog_fragment>
    #include <itowns/lighting_fragment>
    #include <itowns/overlay_fragment>

#endif
}
