import type { TileBuilder, TileBuilderParams } from 'Core/Prefab/TileBuilder';
import * as THREE from 'three';

export function getBufferIndexSize(segments: number, noSkirt: boolean): number {
    const triangles = (segments) * (segments) * 2
        + (noSkirt ? 0 : 4 * segments * 2);
    return triangles * 3;
}

type Option<T> = T | undefined;

export type Buffers = {
    index: Option<Uint8Array | Uint16Array | Uint32Array>,
    position: Float32Array,
    normal: Float32Array,
    uvs: [Option<Float32Array>, Option<Float32Array>],
};

function pickUintArraySize(
    highestValue: number,
    length: number,
): Uint8Array | Uint16Array | Uint32Array {
    let picked = null;

    if (highestValue < 2 ** 8) {
        picked = Uint8Array;
    } else if (highestValue < 2 ** 16) {
        picked = Uint16Array;
    } else if (highestValue < 2 ** 32) {
        picked = Uint32Array;
    } else {
        throw new Error('Value is too high');
    }

    // @ts-expect-error: this actually works, the linter is tripping
    return new picked.prototype.constructor(length);
}

function allocateBuffers(
    nVertex: number,
    nSeg: number,
    builder: TileBuilder<TileBuilderParams>,
    params: TileBuilderParams,
): Buffers {
    let index: Uint8Array | Uint16Array | Uint32Array | undefined;
    const bufferIndexSize = getBufferIndexSize(nSeg, params.disableSkirt);
    if (params.buildIndexAndUv_0) {
        // if (nVertex < 2 ** 8) {
        //     index = new Uint8Array(bufferIndexSize);
        // } else if (nVertex < 2 ** 16) {
        //     index = new Uint16Array(bufferIndexSize);
        // } else if (nVertex < 2 ** 32) {
        //     index = new Uint32Array(bufferIndexSize);
        // }
        index = pickUintArraySize(nVertex, bufferIndexSize);
    }

    return {
        index,
        position: new Float32Array(nVertex * 3),
        normal: new Float32Array(nVertex * 3),
        // 2 UV set per tile: wgs84 (uv[0]) and pm (uv[1])
        //    - wgs84: 1 texture per tile because tiles are using wgs84
        //          projection
        //    - pm: use multiple textures per tile.
        //      +-------------------------+
        //      |                         |
        //      |     Texture 0           |
        //      +-------------------------+
        //      |                         |
        //      |     Texture 1           |
        //      +-------------------------+
        //      |                         |
        //      |     Texture 2           |
        //      +-------------------------+
        //        * u = wgs84.u
        //        * v = textureid + v in builder texture
        uvs: [
            params.buildIndexAndUv_0
                ? new Float32Array(nVertex * 2)
                : undefined,
            builder.computeExtraOffset !== undefined
                ? new Float32Array(nVertex)
                : undefined,
        ],
    };
}

function computeUv0(uv: Float32Array, id: number, u: number, v: number): void {
    uv[id * 2 + 0] = u;
    uv[id * 2 + 1] = v;
}

function initComputeUv1(value: number): (uv: Float32Array, id: number) => void {
    return (uv: Float32Array, id: number): void => { uv[id] = value; };
}

type ComputeUvs =
    [typeof computeUv0 | (() => void), ReturnType<typeof initComputeUv1>?];

export default function computeBuffers(
    builder: TileBuilder<TileBuilderParams>,
    params: TileBuilderParams,
) {
    const nSeg = params.segments;

    // segments count :
    // Tile : (nSeg + 1) * (nSeg + 1)
    // Skirt : 8 * (nSeg - 1)
    const nVertex: number =
        (nSeg + 1) ** 2 + (params.disableSkirt ? 0 : 4 * nSeg);
    if (nVertex > 2 ** 32) {
        throw new Error('Tile segments count is too big (> 2^32)');
    }

    const outBuffers: Buffers = allocateBuffers(nVertex, nSeg, builder, params);
    const computeUvs: ComputeUvs =
        [params.buildIndexAndUv_0 ? computeUv0 : () => { }];

    params = builder.prepare(params);

    const widthSegments: number = Math.max(2, Math.floor(nSeg) || 2);
    const heightSegments: number = Math.max(2, Math.floor(nSeg) || 2);

    let idVertex: number = 0;
    const vertices: number[][] = [];

    let skirt: number[] = [];
    const skirtEnd: number[] = [];

    // TODO: Optimize by using a single arraybuffer.
    // const byteLen = outBuffers.index.BYTES_PER_ELEMENT;
    // const verticesBuf =
    //     new ArrayBuffer(widthSegments * heightSegments * byteLen);
    // const verticesRow = new Uint8Array(verticesBuf, 0, widthSegments);

    for (let y = 0; y <= heightSegments; y++) {
        const verticesRow = [];
        const v = y / heightSegments;

        params.projected.y = builder.vProject(v, params.extent);

        if (builder.computeExtraOffset !== undefined) {
            computeUvs[1] = initComputeUv1(
                builder.computeExtraOffset(params) as number,
            );
        }

        for (let x = 0; x <= widthSegments; x++) {
            const u = x / widthSegments;
            const id_m3 = idVertex * 3;

            params.projected.x = builder.uProject(u, params.extent);

            const vertex = builder.vertexPosition(params.projected);
            const normal = builder.vertexNormal();

            // move geometry to center world
            vertex.sub(params.center);

            // align normal to z axis
            // HACK: this is dumb
            if ('quatNormalToZ' in params) {
                const quat =
                    params.quatNormalToZ as THREE.Quaternion;
                vertex.applyQuaternion(quat);
                normal.applyQuaternion(quat);
            }

            vertex.toArray(outBuffers.position, id_m3);
            normal.toArray(outBuffers.normal, id_m3);

            for (const [index, computeUv] of computeUvs.entries()) {
                if (computeUv !== undefined) {
                    computeUv(outBuffers.uvs[index]!, idVertex, u, v);
                }
            }

            if (!params.disableSkirt) {
                if (y !== 0 && y !== heightSegments) {
                    if (x === widthSegments) {
                        skirt.push(idVertex);
                    } else if (x === 0) {
                        skirtEnd.push(idVertex);
                    }
                }
            }

            verticesRow.push(idVertex);

            idVertex++;
        }

        vertices.push(verticesRow);

        if (y === 0) {
            skirt = skirt.concat(verticesRow);
        } else if (y === heightSegments) {
            skirt = skirt.concat(verticesRow.slice().reverse());
        }
    }

    if (!params.disableSkirt) {
        skirt = skirt.concat(skirtEnd.reverse());
    }

    let idVertex2 = 0;

    // TODO: Maybe allocate vertex arr on the same host buffer as index?
    function bufferizeTri(id: number, va: number, vb: number, vc: number) {
        outBuffers.index![id + 0] = va;
        outBuffers.index![id + 1] = vb;
        outBuffers.index![id + 2] = vc;
    }

    if (params.buildIndexAndUv_0) {
        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const v1 = vertices[y][x + 1];
                const v2 = vertices[y][x];
                const v3 = vertices[y + 1][x];
                const v4 = vertices[y + 1][x + 1];

                bufferizeTri(idVertex2, /**/v4, v2, v1);
                bufferizeTri(idVertex2 + 3, v4, v3, v2);
                idVertex2 += 6;
            }
        }
    }

    const iStart = idVertex;

    // PERF: Beware skirt's size influences performance
    // TODO: The size of the skirt is now a ratio of the size of the tile.
    // To be perfect it should depend on the real elevation delta but too heavy
    // to compute
    if (!params.disableSkirt) {
        // We compute the actual size of tile segment to use later for
        // the skirt.
        const segmentSize = new THREE.Vector3()
            .fromArray(outBuffers.position)
            .distanceTo(new THREE.Vector3()
                .fromArray(outBuffers.position, 3));

        const buildSkirt = params.buildIndexAndUv_0 ? {
            index: (
                id: number,
                v1: number, v2: number, v3: number, v4: number,
            ) => {
                bufferizeTri(id, v1, v2, v3);
                bufferizeTri(id, v1, v3, v4);
                return id + 6;
            },
            uv: (buf: Option<Float32Array>, id: number) => {
                buf![idVertex * 2 + 0] = buf![id * 2 + 0];
                buf![idVertex * 2 + 1] = buf![id * 2 + 1];
            },
        } : { index: () => { }, uv: () => { } };

        for (let i = 0; i < skirt.length; i++) {
            const id = skirt[i];
            const id_m3 = idVertex * 3;
            const id2_m3 = id * 3;

            outBuffers.position[id_m3 + 0] = outBuffers.position[id2_m3 + 0]
                - outBuffers.normal[id2_m3 + 0] * segmentSize;
            outBuffers.position[id_m3 + 1] = outBuffers.position[id2_m3 + 1]
                - outBuffers.normal[id2_m3 + 1] * segmentSize;
            outBuffers.position[id_m3 + 2] = outBuffers.position[id2_m3 + 2]
                - outBuffers.normal[id2_m3 + 2] * segmentSize;

            outBuffers.normal[id_m3 + 0] = outBuffers.normal[id2_m3 + 0];
            outBuffers.normal[id_m3 + 1] = outBuffers.normal[id2_m3 + 1];
            outBuffers.normal[id_m3 + 2] = outBuffers.normal[id2_m3 + 2];

            buildSkirt.uv(outBuffers.uvs[0], id);

            if (outBuffers.uvs[1] !== undefined) {
                outBuffers.uvs[1][idVertex] = outBuffers.uvs[1][id];
            }

            const idf = (i + 1) % skirt.length;

            const v1 = id;
            const v2 = idVertex;
            const v3 = (idf === 0) ? iStart : idVertex + 1;
            const v4 = skirt[idf];

            idVertex2 = buildSkirt.index(idVertex2, v1, v2, v3, v4)
                ?? idVertex2;

            idVertex++;
        }
    }

    return outBuffers;
}
