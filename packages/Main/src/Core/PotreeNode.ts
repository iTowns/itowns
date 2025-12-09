import * as THREE from 'three';
import PotreeNodeBase, { computeChildBBox } from 'Core/PotreeNodeBase';
import type PotreeSource from 'Source/PotreeSource';
import type { BufferGeometry } from 'three';

class PotreeNode extends PotreeNodeBase {
    source: PotreeSource;

    constructor(
        depth: number,
        index: number,
        numPoints = 0,
        childrenBitField = 0,
        source: PotreeSource,
        crs: string,
    ) {
        super(depth, index, numPoints, childrenBitField, source, crs);
        this.source = source;
    }

    override get url(): string {
        return `${this.baseurl}/${this.hierarchyKey}.${this.source.extension}`;
    }

    override async load(networkOptions = this.source.networkOptions): Promise<BufferGeometry> {
        // Query octree/HRC if we don't have children yet.
        if (!this.octreeIsLoaded) {
            await this.loadOctree();
        }

        const file = await this.source.fetcher(this.url, networkOptions);
        return this.source.parser(file, { in: this });
    }

    override async loadOctree(): Promise<void> {
        this.offsetBBox = new THREE.Box3()
            .setFromArray(this.source.boundsConforming);// Only for Potree1
        const octreeUrl = `${this.baseurl}/${this.hierarchyKey}.${this.source.extensionOctree}`;
        const blob = await this.source.fetcher(octreeUrl, this.source.networkOptions);
        const view = new DataView(blob);
        const stack = [];
        let offset = 0;

        this.childrenBitField = view.getUint8(0); offset += 1;
        this.numPoints = view.getUint32(1, true); offset += 4;

        stack.push(this);

        while (stack.length && offset < blob.byteLength) {
            const snode = stack.shift() as PotreeNode;
            // look up 8 children
            for (let indexChild = 0; indexChild < 8; indexChild++) {
                // does snode have a #indexChild child ?
                if (snode.childrenBitField & (1 << indexChild) && (offset + 5) <= blob.byteLength) {
                    const childrenBitField = view.getUint8(offset); offset += 1;
                    const numPoints = view.getUint32(offset, true) || this.numPoints; offset += 4;
                    const child = new PotreeNode(
                        snode.depth + 1, indexChild,
                        numPoints, childrenBitField, this.source, this.crs);

                    snode.add(child, indexChild);
                    // For Potree1 Parser
                    child.offsetBBox = computeChildBBox(child.parent!.offsetBBox!, indexChild);
                    if ((child.depth % this.source.hierarchyStepSize) == 0) {
                        child.baseurl = `${this.baseurl}/${child.hierarchyKey.substring(1)}`;
                    } else {
                        child.baseurl = this.baseurl;
                    }
                    stack.push(child);
                }
            }
        }
    }
}

export default PotreeNode;
