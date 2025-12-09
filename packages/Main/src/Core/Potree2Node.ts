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

import PointCloudNode from 'Core/PointCloudNode';
import type Potree2Source from 'Source/Potree2Source';
import { computeChildBBox } from 'Core/PotreeNode';
import type { BufferGeometry } from 'three';

const NODE_TYPE = {
    NORMAL: 0,
    LEAF: 1,
    PROXY: 2,
} as const;

type NodeType = typeof NODE_TYPE[keyof typeof NODE_TYPE];

class Potree2Node extends PointCloudNode {
    source: Potree2Source;

    index: number;

    childrenBitField: number;
    hierarchyKey: string;
    baseurl: string;
    crs: string;

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
        super(depth, numPoints);
        this.source = source;

        this.depth = 0;

        this.index = index;

        this.hierarchyKey = 'r';

        this.childrenBitField = childrenBitField;

        this.baseurl = source.baseurl;

        this.crs = crs;

        this.loaded = false;
        this.loading = false;
    }

    override get octreeIsLoaded(): boolean {
        return !(this.childrenBitField && this.children.length === 0);
    }

    override get url(): string {
        return `${this.baseurl}/octree.bin`;
    }

    // Beware: you should call this method after the hierarchy is loaded
    override get id(): string {
        return this.hierarchyKey;
    }

    override add(node: this, indexChild: number): void {
        node.hierarchyKey = this.hierarchyKey + indexChild;
        node.depth = this.depth + 1;
        super.add(node, indexChild);
    }

    override createChildAABB(childNode: Potree2Node, childIndex: number): void {
        childNode.voxelOBB.copy(this.voxelOBB);
        childNode.voxelOBB.box3D = computeChildBBox(this.voxelOBB.box3D, childIndex);

        childNode.clampOBB.copy(childNode.voxelOBB);
        const childClampBBox = childNode.clampOBB.box3D;

        if (childClampBBox.min.z < this.source.zmax) {
            childClampBBox.max.z = Math.min(childClampBBox.max.z, this.source.zmax);
        }
        if (childClampBBox.max.z > this.source.zmin) {
            childClampBBox.min.z = Math.max(childClampBBox.min.z, this.source.zmin);
        }

        childNode.voxelOBB.matrixWorldInverse = this.voxelOBB.matrixWorldInverse;
        childNode.clampOBB.matrixWorldInverse = this.clampOBB.matrixWorldInverse;
    }

    networkOptions(byteOffset = this.byteOffset, byteSize = this.byteSize): RequestInit {
        const first = byteOffset;
        const last = first + byteSize - 1n;

        // When we specify 'multipart/byteranges' on headers request it triggers
        // a preflight request. Currently github doesn't support it https://github.com/orgs/community/discussions/24659
        // But if we omit header parameter, github seems to know it's a
        // 'multipart/byteranges' request (thanks to 'Range' parameter).
        const networkOptions = {
            ...this.source.networkOptions,
            headers: {
                ...this.source.networkOptions.headers,
                ...(this.url.startsWith('https://raw.githubusercontent.com') ? {} : { 'content-type': 'multipart/byteranges' }),
                Range: `bytes=${first}-${last}`,
            },
        };

        return networkOptions;
    }

    override async load(): Promise<BufferGeometry> {
        // Query octree/HRC if we don't have children yet.
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const file = await this.source.fetcher(this.url, this.networkOptions());
        const data = await this.source.parser(file, { in: this });
        this.loaded = true;
        this.loading = false;
        return data.geometry;
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
        const buffer = await this.source.fetcher(
            hierarchyUrl, this.networkOptions(this.hierarchyByteOffset, this.hierarchyByteSize));
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
