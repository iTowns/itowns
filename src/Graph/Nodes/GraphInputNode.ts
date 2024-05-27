import { Dependency, GraphNode, JunctionNode, Type } from '../Common.ts';

export default class GraphInputNode extends JunctionNode {
    private inputNodeName: string | undefined;

    public constructor(input: { [name: string]: [GraphNode, string] } | Type) {
        if (typeof input != 'string') {
            const [name, [node, output]] = Object.entries(input)[0]!;
            super({ node, output });
            this.inputNodeName = name;
        } else {
            super(input);
        }
    }

    public get graphInput(): [string | undefined, [Dependency | null, Type]] {
        return [this.inputNodeName, this.inputs.get(JunctionNode.ioName)!];
    }

    public set graphInput([name, node]: [string, Dependency]) {
        const [_oldValue, type] = this.inputs.get(JunctionNode.ioName)!;
        this.inputs.set(JunctionNode.ioName, [node, type]);
        this.inputNodeName = name;
    }

    public dumpDot(name: string): string {
        return super.dumpDot(`${name}`);
    }
}
