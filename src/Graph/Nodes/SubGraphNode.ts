import { BuiltinType, Dependency, DumpDotNodeStyle, Graph, GraphInputNode, GraphNode, GraphOutputNode, SubGraph, Type } from '../Common.ts';

export default class SubGraphNode extends GraphNode {
    public graph: SubGraph;
    private graphOutputs: Map<string, [Dependency, Type]>;

    // We replace every outside dependency by a junction (graph input) and create output junctions for every single
    // node output, pruning them when optimising the graph if they're unused.
    // TODO: Allow for multiple outputs
    public constructor(
        outerGraph: Graph,
        graph: SubGraph,
        out: { [name: string]: Dependency | [GraphNode, string] | [string, string] | GraphNode | string },
    ) {
        const outputs = Object.entries(out)
            .map(([name, dep]): [string, Dependency] => {
                if (Array.isArray(dep)) {
                    const [nodeName, output] = dep;
                    const node = nodeName instanceof GraphNode ? nodeName : graph.get(nodeName);
                    if (node == undefined) {
                        throw new Error(`Node "${nodeName}" selected as output does not exist within the subgraph`);
                    }

                    return [name, { node, output }];
                } else if (dep instanceof GraphNode) {
                    return [name, { node: dep, output: GraphNode.defaultIoName }];
                } else if (typeof dep == 'string') {
                    const node = graph.get(dep);
                    if (node == undefined) {
                        throw new Error(`Node "${dep}" selected as output does not exist within the subgraph`);
                    }
                    return [name, { node, output: GraphNode.defaultIoName }];
                } else {
                    return [name, dep];
                }
            })
            .map(([name, dep]): [string, [Dependency, Type]] => [name, [dep, dep.node.outputs.get(dep.output)![1]]]);

        super(new Map(), new Map(outputs.map(([name, [_, ty]]) => [name, ty])));

        this.graph = graph;
        this.graphOutputs = new Map(outputs.map(([name, [dep, ty]]) =>
            [name, [{ node: new GraphOutputNode(dep), output: SubGraphNode.defaultIoName }, ty]]));

        for (const [_nodeName, node] of this.graph.nodes) {
            // Replace dependencies outside the graph with graph inputs
            for (const [depName, [dep, depType]] of node.inputs) {
                if (dep != undefined && Array.from(this.graph.nodes.values()).find(oNode => oNode == dep.node) == undefined) {
                    // Try to find an already created graph input for this dependency
                    const inputs = Array.from(this.graph.inputs);
                    const findInput = inputs.find(([name, _input]) => name == depName);
                    if (findInput != undefined) {
                        const [_name, input] = findInput;
                        node.inputs.set(depName, [{ node: input, output: GraphNode.defaultIoName }, depType]);
                        continue;
                    }

                    // NOTE: only works for one level of nesting, we might need a resolve function but
                    // I'm not sure the case where it'd be needed will ever occur.
                    const newInput = new GraphInputNode(Object.fromEntries([[outerGraph.findGraphNode(dep.node)!.name, [dep.node, dep.output]]]));
                    const addedInput = this.graph.inputs.set(depName, newInput).get(depName)!;
                    node.inputs.set(depName, [{ node: addedInput, output: GraphNode.defaultIoName }, depType]);
                }
            }
        }
    }

    protected _apply(graph?: Graph, frame: number = 0): void {
        for (const [name, [dep, _ty]] of this.graphOutputs) {
            this.outputs.set(name, dep.node.getOutput(dep.output, graph, frame));
        }
        // this._out.outputs.set(GraphNode.defaultIoName, this._outNode.node.getOutput(this._outNode.output, graph, frame));
    }

    public get label(): string | undefined {
        return this.graph.name;
    }

    public get nodeType(): string {
        return SubGraphNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                style: 'filled',
                fillcolor: 'whitesmoke',
                color: 'lightgrey',
            },
        };
    }

    public dumpDot(name: string): string {
        const { label, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs).map(([name, value]: [string, string | object]) => {
            if (typeof value == 'string') {
                return `${name}=${value}`;
            } else {
                return `${name} [${Object.entries(value).map(([name, value]) => `${name}=${value}`).join(' ')}]`;
            }
        });
        const graphLabel = `\t\tlabel="${label(this.graph.name)}"`;
        return [
            `subgraph "cluster_${label(name)}" {`,
            graphLabel,
            ...formattedAttrs,
            this.graph.dumpDot(name),
            '}',
        ].join('\n');
    }
}
