import type { TileBuilder, TileBuilderParams } from 'Core/Prefab/TileBuilder';
import * as THREE from 'three';

export function getBufferIndexSize(segments: number, noSkirt: boolean): number {
    const triangles = (segments) * (segments) * 2
        + (noSkirt ? 0 : 4 * segments * 2);
    return triangles * 3;
}

type Option<T> = T | undefined;

type IndexArray = Option<Uint8Array | Uint16Array | Uint32Array>;

export type Buffers = {
    index: IndexArray,
    position: Float32Array,
    normal: Float32Array,
    uvs: [Option<Float32Array>, Option<Float32Array>],
};

type BuffersAndSkirt = Buffers & {
    skirt: IndexArray,
};

function getUintArrayConstructor(
    highestValue: number,
): Uint8ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor {
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

    return picked;
}

function allocateIndexBuffer(
    nVertex: number,
    nSeg: number,
    params: TileBuilderParams,
): Option<{ index: IndexArray, skirt: IndexArray }> {
    if (!params.buildIndexAndUv_0) {
        return undefined;
    }

    const indexBufferSize = getBufferIndexSize(nSeg, params.disableSkirt);
    const indexConstructor = getUintArrayConstructor(nVertex);

    const tileLen = indexBufferSize;
    const skirtLen = 4 * nSeg;
    const indexBuffer = new ArrayBuffer((
        // Tile
        tileLen
        // Skirt
        + (params.disableSkirt ? 0 : skirtLen)
    ) * indexConstructor!.BYTES_PER_ELEMENT);

    const index = new indexConstructor(indexBuffer);
    const skirt = !params.disableSkirt
        ? index.subarray(tileLen, tileLen + skirtLen)
        : undefined;

    return {
        index,
        skirt,
    };
}

function allocateBuffers(
    nVertex: number,
    nSeg: number,
    builder: TileBuilder<TileBuilderParams>,
    params: TileBuilderParams,
): BuffersAndSkirt {
    const {
        index,
        skirt,
    } = allocateIndexBuffer(nVertex, nSeg, params) ?? {};

    return {
        index,
        skirt,
        position: new Float32Array(nVertex * 3),
        normal: new Float32Array(nVertex * 3),
        // 2 UV set per tile: wgs84 (uv[0]) and pseudo-mercator (pm, uv[1])
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

/** Compute buffers describing a tile according to a builder and its params. */
// TODO: Split this even further into subfunctions
export function computeBuffers(
    builder: TileBuilder<TileBuilderParams>,
    params: TileBuilderParams,
): Buffers {
    //     n seg, n+1 vert    + <- skirt, n verts per side
    //    <---------------> / |
    //    +---+---+---+---+   |
    //    | / | / | / | / |   |  Vertices:
    //    +---+---+---+---+ - +     tile = (n + 1)^2
    //    | / | / | / | / |   |    skirt = 4n
    //    +---+---+---+---+ - +
    //    | / | / | / | / |   |  Segments:
    //    +---+---+---+---+ - +     tile = 2 * n * (n + 1) + n^2
    //    | / | / | / | / |   |    skirt = 2n * 4
    //    +---+---+---+---+   |
    const nSeg: number = Math.max(2, params.segments);
    const nVertex: number = nSeg + 1;
    const nTileVertex: number = nVertex ** 2;
    const nSkirtVertex: number = params.disableSkirt ? 0 : 4 * nSeg;
    const nTotalVertex: number = nTileVertex + nSkirtVertex;

    // Computer should combust before this happens
    if (nTotalVertex > 2 ** 32) {
        throw new Error('Tile segments count is too big');
    }

    const outBuffers: BuffersAndSkirt = allocateBuffers(
        nTotalVertex, nSeg,
        builder, params,
    );

    const computeUvs: ComputeUvs =
        [params.buildIndexAndUv_0 ? computeUv0 : () => { }];

    params = builder.prepare(params);

    for (let y = 0; y <= nSeg; y++) {
        const v = y / nSeg;

        params.coordinates.y = builder.vProject(v, params.extent);

        if (builder.computeExtraOffset !== undefined) {
            computeUvs[1] = initComputeUv1(
                builder.computeExtraOffset(params) as number,
            );
        }

        for (let x = 0; x <= nSeg; x++) {
            const u = x / nSeg;
            const id_m3 = (y * nVertex + x) * 3;

            params.coordinates.x = builder.uProject(u, params.extent);

            const vertex = builder.vertexPosition(params.coordinates);
            const normal = builder.vertexNormal();

            // move geometry to center world
            vertex.sub(params.center);

            // align normal to z axis
            // HACK: this check style is not great
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
                    computeUv(outBuffers.uvs[index]!, y * nVertex + x, u, v);
                }
            }
        }
    }

    // Fill skirt index buffer
    if (params.buildIndexAndUv_0 && !params.disableSkirt) {
        for (let x = 0; x < nVertex; x++) {
            //   -------->
            //   0---1---2
            //   | / | / |   [0-9] = assign order
            //   +---+---+
            //   | / | / |
            //   +---+---+
            outBuffers.skirt![x] = x;
            //   +---+---+
            //   | / | / |   [0-9] = assign order
            //   +---+---x   x = skipped for now
            //   | / | / |
            //   0---1---2
            //   <--------
            outBuffers.skirt![2 * nVertex - 2 + x] = nVertex ** 2 - (x + 1);
        }

        for (let y = 1; y < nVertex - 1; y++) {
            //   +---+---s |
            //   | / | / | | o = stored vertices
            //   +---+---o | s = already stored
            //   | / | / | |
            //   +---+---s v
            outBuffers.skirt![nVertex - 1 + y] = y * nVertex + (nVertex - 1);
            // ^ s---+---+
            // | | / | / |   o = stored vertices
            // | o---+---+   s = already stored
            // | | / | / |
            // | s---+---+
            outBuffers.skirt![3 * nVertex - 3 + y] =
                nVertex * (nVertex - 1 - y);
        }
    }

    /** Copy passed indices at the desired index of the output index buffer. */
    function bufferizeTri(id: number, va: number, vb: number, vc: number) {
        outBuffers.index![id + 0] = va;
        outBuffers.index![id + 1] = vb;
        outBuffers.index![id + 2] = vc;
    }

    if (params.buildIndexAndUv_0) {
        for (let y = 0; y < nSeg; y++) {
            for (let x = 0; x < nSeg; x++) {
                const v1 = y * nVertex + (x + 1);
                const v2 = y * nVertex + x;
                const v3 = (y + 1) * nVertex + x;
                const v4 = (y + 1) * nVertex + (x + 1);

                const id = (y * nSeg + x) * 6;
                bufferizeTri(id, /**/v4, v2, v1);
                bufferizeTri(id + 3, v4, v3, v2);
            }
        }
    }

    // PERF: Beware skirt's size influences performance
    // INFO: The size of the skirt is now a ratio of the size of the tile.
    // To be perfect it should depend on the real elevation delta but too heavy
    // to compute
    if (params.buildIndexAndUv_0 && !params.disableSkirt) {
        // We compute the actual size of tile segment to use later for
        // the skirt.
        const segmentSize = new THREE.Vector3()
            .fromArray(outBuffers.position)
            .distanceTo(new THREE.Vector3()
                .fromArray(outBuffers.position, 3));

        const buildSkirt = {
            index: (
                id: number,
                v1: number, v2: number, v3: number, v4: number,
            ) => {
                bufferizeTri(id, v1, v2, v3);
                bufferizeTri(id + 3, v1, v3, v4);
                return id + 6;
            },
            uv: (buf: Option<Float32Array>, idTo: number, idFrom: number) => {
                buf![idTo * 2 + 0] = buf![idFrom * 2 + 0];
                buf![idTo * 2 + 1] = buf![idFrom * 2 + 1];
            },
        };

        // Alias for readability
        const start = nTileVertex;
        const indexBufStart = 6 * nSeg ** 2;

        for (let i = 0; i < outBuffers.skirt!.length; i++) {
            const id = outBuffers.skirt![i];
            const id_m3 = (start + i) * 3;
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

            buildSkirt.uv(outBuffers.uvs[0], start + i, id);

            if (outBuffers.uvs[1] !== undefined) {
                outBuffers.uvs[1][start + i] = outBuffers.uvs[1][id];
            }

            const idf = (i + 1) % outBuffers.skirt!.length;

            const v1 = id;
            const v2 = start + i;
            const v3 = (idf === 0) ? start : start + i + 1;
            const v4 = outBuffers.skirt![idf];

            buildSkirt.index(indexBufStart + i * 6, v1, v2, v3, v4);
        }
    }

    // Dropping skirt view
    return {
        index: outBuffers.index,
        position: outBuffers.position,
        uvs: outBuffers.uvs,
        normal: outBuffers.normal,
    };
}
