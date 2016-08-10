vec2    pitUV(vec2 uvIn, vec4 pit)
{
    vec2  uv;
    uv.x = uvIn.x* pit.z + pit.x;
    uv.y = 1.0 -( (1.0 - uvIn.y) * pit.w + pit.y);

    return uv;
}

