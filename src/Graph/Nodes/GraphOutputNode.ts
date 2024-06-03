import { Dependency, GraphNode, JunctionNode, Type } from '../Prelude.ts';

export default class GraphOutputNode extends JunctionNode {
    public constructor(input: Dependency | [GraphNode, string]) {
        if (Array.isArray(input)) {
            const [node, output] = input;
            super({ node, output });
        } else {
            super(input);
        }
    }

    public get graphOutput(): [Dependency, Type] {
        const [dep, ty] = this.inputs.get(GraphNode.defaultIoName)!;
        return [dep!, ty];
    }

    public set graphOutput(dependency: Dependency | [GraphNode, string]) {
        const [node, output] = Array.isArray(dependency) ? dependency : [dependency.node, dependency.output];
        const socket = node.outputs.get(output);
        if (socket == undefined) {
            throw new Error(`Provided ${node.nodeType} node does not have an output named '${output}'`);
        }
        this.inputs.set(GraphNode.defaultIoName, [{ node, output }, socket[1]]);
    }

    public dumpDot(name: string): string {
        return super.dumpDot(`${name}`);
    }
}
