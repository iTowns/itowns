{
    vec3 paramsA = paramLayers[REPLACE_LAYER_INDEX];
    // if layer is visible & opacity > 0
    if(paramsA.x > 0.0 && paramsA.y > 0.0) {

        // empty textures are 0 width & height
        vec4 offsetScale = offsetScale_REPLACE_LAYER_NAME[0];
        if(offsetScale.z > 0.0 && offsetScale.w > 0.0) {
            vec2 uvIn = vUv_WGS84;

            vec2 uv = vec2(
                uvIn.x * offsetScale.z + offsetScale.x,
                1.0 - ((1.0 - uvIn.y) * offsetScale.w + offsetScale.y));
            vec4 layerColor = texture2D(atlasTextures[REPLACE_LAYER_INDEX], uv);

            if (layerColor.a > 0.0) {
                diffuseColor = mixLayerColor(diffuseColor, layerColor, paramsA);
            }
        }
    }
}
