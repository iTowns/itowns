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
import { buildVoxelKey } from 'Core/PointCloudNode';
import PotreeNodeBase from 'Core/PotreeNodeBase';
import { getVoxelKey, type NodeKeyInfo } from 'Core/PotreeNode';

export type Potree2NodeHierarchy = {
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

    override url: string;

    hierarchy: Record<string, Potree2NodeHierarchy>;

    voxelKey: string;

    childrenBitField: number;

    private baseurl: string;

    private byteOffset: bigint;
    private byteSize: bigint;

    constructor(
        depth: number,
        x: number, y: number, z: number,
        source: Potree2Source,
        crs: string,
        hierarchy: Record<string, Potree2NodeHierarchy> = {},
    ) {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const numPoints = hierarchy[voxelKey]?.numPoints ?? -1;
        super(depth, x, y, z, numPoints, crs);

        this.source = source;

        this.voxelKey = voxelKey;

        this.baseurl = this.source.baseurl;

        this.hierarchy = hierarchy;

        this.childrenBitField = this.hierarchy[voxelKey]?.childrenBitField ?? 255;

        // potree v2.x
        this.url = `${this.baseurl}/octree.bin`;
        this.byteOffset = this.hierarchy[voxelKey]?.byteOffset ?? 0n;
        this.byteSize = this.hierarchy[voxelKey]?.byteSize ??
            BigInt(this.source.metadata.hierarchy.firstChunkSize);
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

    async loadHierarchy(): Promise<Record<string, Potree2NodeHierarchy>> {
        if (this.hierarchyIsLoaded) {
            return this.hierarchy;
        }

        const hierarchyUrl = `${this.baseurl}/hierarchy.bin`;
        const buffer = await this.fetcher(hierarchyUrl);
        const view = new DataView(buffer);

        // update current node from the newly fetched hierarchy buffer
        this.childrenBitField = view.getUint8(1);
        this.numPoints = view.getUint32(2, true);
        // update byteOffset/byteSize from page Info to node Info
        this.byteOffset = view.getBigInt64(6, true);
        this.byteSize = view.getBigInt64(14, true);

        // parse and create Hierarchy
        const stack = [];

        const hierarchy: Record<string, Potree2NodeHierarchy> = {
        };

        const bytesPerNode = 22;
        const numNodes = buffer.byteLength / bytesPerNode;

        let parentInfo: NodeKeyInfo = {
            depth: 0,
            x: 0,
            y: 0,
            z: 0,
        };

        if (this.hierarchy[this.voxelKey]) {
            parentInfo = {
                depth: this.depth,
                x: this.x,
                y: this.y,
                z: this.z,
            };
        }

        stack.push(parentInfo);

        for (let indexNode = 0; indexNode < numNodes; indexNode++) {
            const nodeInfo = stack.shift() as NodeKeyInfo;
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

            const voxelKey = buildVoxelKey(nodeInfo.depth, nodeInfo.x, nodeInfo.y, nodeInfo.z);
            hierarchy[voxelKey] = {
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

                const { depth, x, y, z } = getVoxelKey(nodeInfo, childIndex);
                stack.push({
                    depth,
                    x,
                    y,
                    z,
                });
            }
        }
        this.hierarchy = hierarchy;
        return hierarchy;
    }

    findAndCreateChild(
        depth: number, x: number, y: number, z: number,
    ): void {
        const childVoxelKey = buildVoxelKey(depth, x, y, z);

        if (!this.hierarchy[childVoxelKey]) { return; }

        const child = new Potree2Node(
            depth, x, y, z,
            this.source,
            this.crs,
            this.hierarchy,
        );

        this.add(child as this);
    }
}

export default Potree2Node;
