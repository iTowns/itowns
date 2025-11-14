/*
============
== POTREE ==
============

http://potree.org

Copyright (c) 2011-2020, Markus Schütz
All rights reserved.

    Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    The views and conclusions contained in the software and documentation are
    those of the authors and should not be interpreted as representing official
    policies, either expressed or implied, of the FreeBSD Project.
 */

import type Potree2Source from 'Source/Potree2Source';
import type { BufferGeometry } from 'three';
import PotreeNodeBase from 'Core/PotreeNodeBase';

const NODE_TYPE = {
    NORMAL: 0,
    LEAF: 1,
    PROXY: 2,
} as const;

type NodeType = typeof NODE_TYPE[keyof typeof NODE_TYPE];

class Potree2Node extends PotreeNodeBase {
    source: Potree2Source;

    loaded: boolean;
    loading: boolean;

    // Properties initialized after loading hierarchy
    byteOffset!: bigint;
    byteSize!: bigint;
    hierarchyByteOffset!: bigint;
    hierarchyByteSize!: bigint;
    nodeType!: NodeType;

    constructor(
        depth: number,
        index: number,
        numPoints = 0,
        childrenBitField = 0,
        source: Potree2Source,
        crs: string,
    ) {
        super(depth, index, numPoints, childrenBitField, source, crs);
        this.source = source;

        this.loaded = false;
        this.loading = false;
    }

    override get url(): string {
        return `${this.baseurl}/octree.bin`;
    }

    override get networkOptions(): RequestInit {
        let byteOffset = this.byteOffset;
        let byteSize = this.byteSize;
        if (this.nodeType === NODE_TYPE.PROXY) {
            byteOffset = this.hierarchyByteOffset;
            byteSize = this.hierarchyByteSize;
        }
        const first = byteOffset;
        const last = first + byteSize - 1n;

        const regex = /^https:\/\/(raw|media)\.githubusercontent\.com/;
        // When we specify 'multipart/byteranges' on headers request it triggers
        // a preflight request. Currently github doesn't support it https://github.com/orgs/community/discussions/24659
        // But if we omit header parameter, github seems to know it's a
        // 'multipart/byteranges' request (thanks to 'Range' parameter).
        const networkOptions = {
            ...this.source.networkOptions,
            headers: {
                ...this.source.networkOptions.headers,
                ...(regex.test(this.url) ? {} : { 'content-type': 'multipart/byteranges' }),
                Range: `bytes=${first}-${last}`,
            },
        };

        return networkOptions;
    }

    override async load(): Promise<BufferGeometry> {
        return super.load()
            .then((data) => {
                this.loaded = true;
                this.loading = false;
                return data;
            });
    }

    override loadOctree(): Promise<void> {
        if (this.loaded || this.loading) {
            return Promise.resolve();
        }
        this.loading = true;
        return (this.nodeType === NODE_TYPE.PROXY) ? this.loadHierarchy() : Promise.resolve();
    }

    async loadHierarchy(): Promise<void> {
        const hierarchyUrl = `${this.baseurl}/hierarchy.bin`;
        const buffer = await this.fetcher(hierarchyUrl, this.networkOptions);
        this.parseHierarchy(buffer);
    }

    parseHierarchy(buffer: ArrayBuffer): void {
        const view = new DataView(buffer);

        const bytesPerNode = 22;
        const numNodes = buffer.byteLength / bytesPerNode;

        const stack = [];
        stack.push(this);

        for (let indexNode = 0; indexNode < numNodes; indexNode++) {
            const current = stack.shift() as Potree2Node;
            const offset = indexNode * bytesPerNode;

            const type = view.getUint8(offset + 0) as NodeType;
            const childMask = view.getUint8(offset + 1);
            const numPoints = view.getUint32(offset + 2, true);
            const byteOffset = view.getBigInt64(offset + 6, true);
            const byteSize = view.getBigInt64(offset + 14, true);

            if (current.nodeType === NODE_TYPE.PROXY) {
                // replace proxy with real node
                current.byteOffset = byteOffset;
                current.byteSize = byteSize;
                current.numPoints = numPoints;
            } else if (type === NODE_TYPE.PROXY) {
                // load proxy
                current.hierarchyByteOffset = byteOffset;
                current.hierarchyByteSize = byteSize;
                current.numPoints = numPoints;
            } else {
                // load real node
                current.byteOffset = byteOffset;
                current.byteSize = byteSize;
                current.numPoints = numPoints;
            }

            if (current.byteSize === 0n) {
                // workaround for issue potree/potree#1125
                // some inner nodes erroneously report >0 points even though
                // have 0 points however, they still report a byteSize of 0,
                // so based on that we now set node.numPoints to 0.
                current.numPoints = 0;
            }

            current.nodeType = type;

            if (current.nodeType === NODE_TYPE.PROXY) {
                continue;
            }

            for (let childIndex = 0; childIndex < 8; childIndex++) {
                const childExists = ((1 << childIndex) & childMask) !== 0;

                if (!childExists) {
                    continue;
                }

                const child = new Potree2Node(
                    current.depth + 1, childIndex, numPoints, childMask, this.source, this.crs);
                current.add(child, childIndex);
                stack.push(child);
            }
        }
    }
}

export default Potree2Node;
