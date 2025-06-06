/*
============
== POTREE ==
============

http://potree.org

Copyright (c) 2011-2020, Markus Schütz
All rights reserved.

    Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies,
    either expressed or implied, of the FreeBSD Project.
 */

import PotreeNode from 'Core/PotreeNode';

const NODE_TYPE = {
    NORMAL: 0,
    LEAF: 1,
    PROXY: 2,
};

class Potree2Node extends PotreeNode {
    constructor(numPoints = 0, childrenBitField = 0, layer) {
        super(numPoints, childrenBitField, layer);
    }

    get url() {
        return `${this.baseurl}/octree.bin`;
    }

    networkOptions(byteOffset, byteSize) {
        const first = byteOffset;
        const last = first + byteSize - 1n;

        // When we specify 'multipart/byteranges' on headers request it trigger a preflight request
        // Actually github doesn't support it https://github.com/orgs/community/discussions/24659
        // But if we omit header parameter, github seems to know it's a 'multipart/byteranges' request (thanks to 'Range' parameter)
        const networkOptions = {
            ...this.layer.source.networkOptions,
            headers: {
                ...this.layer.source.networkOptions.headers,
                ...(this.url.startsWith('https://raw.githubusercontent.com') ? {} : { 'content-type': 'multipart/byteranges' }),
                Range: `bytes=${first}-${last}`,
            },
        };

        return networkOptions;
    }

    async load() {
        // Query octree if we don't have children potreeNode yet.
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        return this.layer.source.fetcher(this.url, this.networkOptions(this.byteOffset, this.byteSize))
            .then(file => this.layer.source.parser(file, {
                in: {
                    source: this.layer.source,
                    bbox: this.bbox,
                    numPoints: this.numPoints,
                },
                out: this.layer,
            }))
            .then((data) => {
                this.loaded = true;
                this.loading = false;
                return data.geometry;
            });
    }

    async loadOctree() {
        if (this.loaded || this.loading) {
            return;
        }
        this.loading = true;
        return (this.nodeType === NODE_TYPE.PROXY) ? this.loadHierarchy() : Promise.resolve();
    }

    async loadHierarchy() {
        const hierarchyUrl = `${this.baseurl}/hierarchy.bin`;
        const buffer = await this.layer.source.fetcher(hierarchyUrl, this.networkOptions(this.hierarchyByteOffset, this.hierarchyByteSize));
        this.parseHierarchy(buffer);
    }

    parseHierarchy(buffer) {
        const view = new DataView(buffer);

        const bytesPerNode = 22;
        const numNodes = buffer.byteLength / bytesPerNode;

        const stack = [];
        stack.push(this);

        for (let indexNode = 0; indexNode < numNodes; indexNode++) {
            const current = stack.shift();
            const offset = indexNode * bytesPerNode;

            const type = view.getUint8(offset + 0);
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
                // some inner nodes erroneously report >0 points even though have 0 points
                // however, they still report a byteSize of 0, so based on that we now set node.numPoints to 0
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

                const child = new Potree2Node(numPoints, childMask, this.layer);
                child.spacing = current.spacing / 2;

                current.add(child, childIndex);
                stack.push(child);
            }
        }
    }
}

export default Potree2Node;
