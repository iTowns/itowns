#if NUM_VS_TEXTURES > 0
    if(elevationTextureCount > 0 && elevationLayers[0].visible) {
        float elevation = getElevation(uv, elevationTextures[0], elevationOffsetScales[0], elevationLayers[0]);
        transformed += elevation * normal;
    }
#endif
