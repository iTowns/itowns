#if NUM_VS_TEXTURES > 0
        float elevation = getElevation(uv, displacementMap, elevationOffsetScales, elevationLayer);
        transformed += elevation * normal;
#endif
