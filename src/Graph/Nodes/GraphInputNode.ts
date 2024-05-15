import { Dependency, GraphNode, JunctionNode, Type } from '../Common.ts';

export default class GraphInputNode extends JunctionNode {
    private inputNodeName: string | undefined;

    public constructor(input: { [name: string]: GraphNode } | Type) {
        if (typeof input != 'string') {
            const [name, node] = Object.entries(input)[0]!;
            super(node);
            this.inputNodeName = name;
        } else {
            super(input);
        }
    }

    public get graphInput(): [string | undefined, [Dependency, Type]] {
        return [this.inputNodeName, this.inputs.get(JunctionNode.inputName)!];
    }

    public set graphInput([name, node]: [string, Dependency]) {
        const [_oldValue, type] = this.inputs.get(JunctionNode.inputName)!;
        this.inputs.set(JunctionNode.inputName, [node, type]);
        this.inputNodeName = name;
    }
}
