import PotreeNodeBase from 'Core/PotreeNodeBase';
import type PotreeSource from 'Source/PotreeSource';

type NodeInfo = {
    hierarchyKey: string,
    childrenBitField: number, // 0 <= integer <= 255
    numPoints: number, // integer >= 0
}

class PotreeNode extends PotreeNodeBase {
    source: PotreeSource;

    hierarchyKey: string;
    hierarchy: Record<string, NodeInfo>;

    childrenBitField: number;

    private baseurl: string;

    constructor(
        hierarchyKey: string,
        source: PotreeSource,
        crs: string,
        hierarchy: Record<string, NodeInfo> = {},
    ) {
        const depth = hierarchyKey.length - 1;
        const numPoints = hierarchy[hierarchyKey]?.numPoints ?? -1;
        super(depth, numPoints, crs);
        this.source = source;

        this.baseurl = this.source.baseurl;
        const hierarchyStepSize = this.source.hierarchyStepSize;
        if (depth >= hierarchyStepSize) {
            this.baseurl = `${this.baseurl}/${hierarchyKey.substring(1, hierarchyStepSize + 1)}`;
        }

        this.hierarchyKey = hierarchyKey;
        this.hierarchy = hierarchy;

        this.childrenBitField = this.hierarchy[this.hierarchyKey]?.childrenBitField ?? 255;
    }

    override get url(): string {
        return `${this.baseurl}/${this.hierarchyKey}.bin`;
    }

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }

    async loadHierarchy(): Promise<Record<string, NodeInfo>> {
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
        const stack: NodeInfo[] = [];
        const root = {
            hierarchyKey: 'r',
            childrenBitField: this.childrenBitField,
            numPoints: this.numPoints,
        };
        stack.push(root);
        const byteLength = view.byteLength;

        const hierarchy: Record<string, NodeInfo> = {
            r: { ...root },
        };

        let offset = 5;

        while (stack.length && offset < byteLength) {
            const snode = stack.shift() as NodeInfo;
            // look up 8 children
            for (let childIndex = 0; childIndex < 8; childIndex++) {
                // does snode have a #childIndex child ?
                if ((snode.childrenBitField as number) &
                        (1 << childIndex) && (offset + 5) <= byteLength) {
                    const child: NodeInfo = {
                        hierarchyKey: `${snode.hierarchyKey}${childIndex}`,
                        childrenBitField: view.getUint8(offset),
                        numPoints: view.getUint32(offset + 1, true),
                    };

                    stack.push(child);
                    hierarchy[child.hierarchyKey] = { ...child };
                    offset += 5;
                }
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

            const child = new PotreeNode(
                childHierarchyKey,
                this.source,
                this.crs,
                this.hierarchy,
            );

            this.add(child as this, childIndex);
        }
    }
}

export default PotreeNode;
