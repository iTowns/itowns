vec2    pitUV(vec2 uvIn, vec3 pit)
{
    vec2  uv;
    uv.x = uvIn.x* pit.z + pit.x;
    uv.y = 1.0 -( (1.0 - uvIn.y) * pit.z + pit.y);

    return uv;
}

