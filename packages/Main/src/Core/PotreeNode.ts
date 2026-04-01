import type PotreeSource from 'Source/PotreeSource';
import { buildVoxelKey } from 'Core/PointCloudNode';
import PotreeNodeBase from 'Core/PotreeNodeBase';

export type PotreeNodeHierarchy = {
    hierarchyKey: string,
    childrenBitField: number, // 0 <= integer <= 255
    numPoints: number, // integer >= 0
}

export type NodeKeyInfo = {
    depth: number,
    x: number, y: number, z: number,
}

type NodeInfo  = NodeKeyInfo  & {
    hierarchyKey: string,
}

export function getVoxelKey(nodeInfo: NodeKeyInfo, childIndex: number) {
    const depth = nodeInfo.depth + 1;
    let x = 2 * nodeInfo.x;
    let y = 2 * nodeInfo.y;
    let z = 2 * nodeInfo.z;

    if (childIndex === 1) {
        z += 1;
    } else if (childIndex === 3) {
        y += 1;
        z += 1;
    } else if (childIndex === 0) {
        //
    } else if (childIndex === 2) {
        y += 1;
    } else if (childIndex === 5) {
        x += 1;
        z += 1;
    } else if (childIndex === 7) {
        x += 1;
        y += 1;
        z += 1;
    } else if (childIndex === 4) {
        x += 1;
    } else if (childIndex === 6) {
        x += 1;
        y += 1;
    }
    return {
        depth,
        x,
        y,
        z,
    };
}

class PotreeNode extends PotreeNodeBase {
    source: PotreeSource;

    override url: string;

    hierarchy: Record<string, PotreeNodeHierarchy>;

    voxelKey: string;

    childrenBitField: number;

    private baseurl: string;

    private hierarchyKey: string;

    constructor(
        depth: number,
        x: number, y: number, z: number,
        source: PotreeSource,
        crs: string,
        hierarchy: Record<string, PotreeNodeHierarchy> = {},
    ) {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const numPoints = hierarchy[voxelKey]?.numPoints ?? -1;
        super(depth, x, y, z, numPoints, crs);

        this.source = source;

        this.voxelKey = voxelKey;

        this.baseurl = this.source.baseurl;

        this.hierarchy = hierarchy;

        this.childrenBitField = this.hierarchy[voxelKey]?.childrenBitField ?? 255;

        // potree 1.X
        this.hierarchyKey = hierarchy[voxelKey]?.hierarchyKey || 'r';
        const hierarchyStepSize = this.source.hierarchyStepSize;
        if (depth >= hierarchyStepSize) {
            this.baseurl =
                `${this.baseurl}/${this.hierarchyKey.substring(1, hierarchyStepSize + 1)}`;
        }
        this.url = `${this.baseurl}/${this.hierarchyKey}.bin`;
    }

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }

    async loadHierarchy(): Promise<Record<string, PotreeNodeHierarchy>> {
        if (this.hierarchyIsLoaded) {
            return this.hierarchy;
        }
        const hierarchyUrl = `${this.baseurl}/${this.hierarchyKey}.${this.source.extensionOctree}`;
        const buffer = await this.fetcher(hierarchyUrl);
        const view = new DataView(buffer);

        // update current node from the newly fetched hierarchy buffer
        this.childrenBitField = view.getUint8(0);
        this.numPoints = view.getUint32(1, true);

        // parse and create Hierarchy
        const stack = [];

        const hierarchy: Record<string, PotreeNodeHierarchy> = {};

        let offset = 0;
        const byteLength = view.byteLength;

        let parentInfo: NodeInfo = {
            depth: 0,
            x: 0,
            y: 0,
            z: 0,
            hierarchyKey: 'r',
        };

        if (this.hierarchy[this.voxelKey]) {
            parentInfo = {
                depth: this.depth,
                x: this.x,
                y: this.y,
                z: this.z,
                hierarchyKey: this.hierarchy[this.voxelKey].hierarchyKey,
            };
        }

        stack.push(parentInfo);

        while (stack.length && offset < byteLength) {
            const nodeInfo = stack.shift() as NodeInfo;
            let childrenBitField = view.getUint8(offset);
            let numPoints = view.getUint32(offset + 1, true);

            // In potree 1.7 there is a bug with the numPoints
            // (set to 0 even if there is point in the associated bin)
            // of the last level when we reach source.hierarchyStepSize.
            // It can be the last level of the hierarchy, or in the
            // sub-hierarchy if there is children or grand-children (and
            // only these will be impacted)

            if (nodeInfo.depth - parentInfo.depth === this.source.hierarchyStepSize) {
                numPoints = -1;// to load the subHierarchy when needed
                childrenBitField = childrenBitField || 255; // for bug v1.7
            }

            if (nodeInfo.depth > this.source.hierarchyStepSize) {
                // for bug v1.7
                numPoints = numPoints || 9999;
            }

            const voxelKey = buildVoxelKey(nodeInfo.depth, nodeInfo.x, nodeInfo.y, nodeInfo.z);
            hierarchy[voxelKey] = {
                hierarchyKey: nodeInfo.hierarchyKey,
                childrenBitField,
                numPoints,
            };

            // look up 8 children
            for (let childIndex = 0; childIndex < 8; childIndex++) {
                // does snode have a #childIndex child ?
                if (childrenBitField & (1 << childIndex)) {
                    const { depth, x, y, z } = getVoxelKey(nodeInfo, childIndex);

                    stack.push({
                        depth,
                        x,
                        y,
                        z,
                        hierarchyKey: `${nodeInfo.hierarchyKey}${childIndex}`,
                    });
                }
            }
            offset += 5;
        }
        this.hierarchy = hierarchy;
        return hierarchy;
    }

    findAndCreateChild(
        depth: number, x: number, y: number, z: number,
    ): void {
        const childVoxelKey = buildVoxelKey(depth, x, y, z);

        if (!this.hierarchy[childVoxelKey]) { return; }

        const child = new PotreeNode(
            depth, x, y, z,
            this.source,
            this.crs,
            this.hierarchy,
        );

        this.add(child as this);
    }
}

export default PotreeNode;
