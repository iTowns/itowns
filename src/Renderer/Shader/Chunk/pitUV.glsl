vec2 pitUV(vec2 uv, vec4 pit)
{
    return uv * pit.zw + vec2(pit.x, 1.0 - pit.w - pit.y);
}

