import { Dependency, GraphNode, JunctionNode, Type } from '../Prelude';

export default class GraphInputNode extends JunctionNode {
    private inputNodeName: string | undefined;

    public constructor([name, input]: [string, Dependency | Type]) {
        if (typeof input != 'string') {
            super(input);
            this.inputNodeName = name;
        } else {
            super(input);
        }
    }

    public get graphInput(): [string | undefined, [Dependency | null, Type]] {
        return [this.inputNodeName, this.inputs.get(GraphNode.defaultIoName)!];
    }

    public set graphInput([name, node]: [string, Dependency]) {
        const input = this.inputs.get(GraphNode.defaultIoName)!;
        input[0] = node;
        this.inputNodeName = name;
    }
}
