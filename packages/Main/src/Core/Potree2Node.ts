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
import PotreeNodeBase from 'Core/PotreeNodeBase';

type NodeInfo = {
    childrenBitField: number, // 0 <= integer <= 255
    numPoints: number, // integer >= 0
    byteOffset: bigint,
    byteSize: bigint,
}

const NODE_TYPE = {
    NORMAL: 0,
    LEAF: 1,
    PROXY: 2,
} as const;

type NodeType = typeof NODE_TYPE[keyof typeof NODE_TYPE];

class Potree2Node extends PotreeNodeBase {
    source: Potree2Source;

    hierarchy: Record<string, NodeInfo>;

    // Properties initialized after loading hierarchy
    byteOffset!: bigint;
    byteSize!: bigint;

    constructor(
        depth: number,
        index: number,
        numPoints: number,
        childrenBitField: number,
        source: Potree2Source,
        crs: string,
    ) {
        super(depth, index, numPoints, childrenBitField, source, crs);
        this.source = source;

        this.hierarchy = {};
    }

    override get baseurl(): string {
        return this.source.baseurl;
    }

    override get url(): string {
        return `${this.baseurl}/octree.bin`;
    }

    override get networkOptions(): RequestInit {
        const first = this.byteOffset;
        const last = first + this.byteSize - 1n;

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

    async loadHierarchy(): Promise<Record<string, NodeInfo>> {
        if (this.hierarchyIsLoaded) {
            return this.hierarchy;
        }
        console.log('loadHierarchy', this.hierarchyKey);
        const hierarchyUrl = `${this.baseurl}/hierarchy.bin`;
        const buffer = await this.fetcher(hierarchyUrl);
        const view = new DataView(buffer);

        // parseHierarchy
        this.childrenBitField = view.getUint8(1);
        this.numPoints = view.getUint32(2, true);
        // update byteOffset/byteSize from page Info to node Info
        this.byteOffset = view.getBigInt64(6, true);
        this.byteSize = view.getBigInt64(14, true);

        const stack = [];
        stack.push(this.hierarchyKey);

        const hierarchy: Record<string, NodeInfo> = {
        };

        const bytesPerNode = 22;
        const numNodes = buffer.byteLength / bytesPerNode;

        for (let indexNode = 0; indexNode < numNodes; indexNode++) {
            const hierarchyKey: string = stack.shift() as string;
            const offset = indexNode * bytesPerNode;

            const type = view.getUint8(offset + 0) as NodeType;
            let childrenBitField = view.getUint8(offset + 1);
            let numPoints = view.getUint32(offset + 2, true);
            const byteOffset = view.getBigInt64(offset + 6, true);
            const byteSize = view.getBigInt64(offset + 14, true);


            if (type === NODE_TYPE.PROXY) {
                // load proxy
                numPoints = -1;
                childrenBitField = 255;
            }

            if (byteSize === 0n) {
                // workaround for issue potree/potree/issues/1125
                // some inner nodes erroneously report >0 points even though
                // have 0 points however, they still report a byteSize of 0,
                // so based on that we now set node.numPoints to 0.
                numPoints = 0;
            }

            hierarchy[hierarchyKey] = {
                childrenBitField,
                numPoints,
                byteOffset,
                byteSize,

            };

            if (type === NODE_TYPE.PROXY) {
                continue;
            }

            for (let childIndex = 0; childIndex < 8; childIndex++) {
                const childExists = ((1 << childIndex) & childrenBitField) !== 0;

                if (!childExists) {
                    continue;
                }
                stack.push(`${hierarchyKey}${childIndex}`);
            }
        }
        this.hierarchy = hierarchy;
        return hierarchy;
    }

    override async createChildren(): Promise<void> {
        await this.loadHierarchy();

        const childMask = this.hierarchy[this.hierarchyKey].childrenBitField;

        for (let childIndex = 0; childIndex < 8; childIndex++) {
            const childExists = ((1 << childIndex) & childMask) !== 0;

            if (!childExists) {
                continue;
            }

            const childHierarchyKey = `${this.hierarchyKey}${childIndex}`;

            const childrenBitField = this.hierarchy[childHierarchyKey].childrenBitField;
            const numPoints = this.hierarchy[childHierarchyKey].numPoints;

            const child = new Potree2Node(
                this.depth + 1, childIndex,
                numPoints, childrenBitField,
                this.source, this.crs);

            this.add(child as this, childIndex);
            child.hierarchy = this.hierarchy;
            // Specific Potree2
            child.byteOffset = this.hierarchy[childHierarchyKey].byteOffset;
            child.byteSize = this.hierarchy[childHierarchyKey].byteSize;
        }
    }
}

export default Potree2Node;
