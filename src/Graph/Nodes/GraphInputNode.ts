import { Dependency, GraphNode, JunctionNode, Type } from '../Prelude.ts';

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
        return [this.inputNodeName, this.inputs.get(GraphNode.defaultIoName)!];
    }

    public set graphInput([name, node]: [string, Dependency]) {
        const [_oldValue, type] = this.inputs.get(GraphNode.defaultIoName)!;
        this.inputs.set(GraphNode.defaultIoName, [node, type]);
        this.inputNodeName = name;
    }
}
