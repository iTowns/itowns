import { Dependency, DumpDotNodeStyle, Graph, GraphInputNode, GraphNode, GraphOutputNode, SubGraph, Type } from '../Prelude';

export default class SubGraphNode extends GraphNode {
    public graph: SubGraph;
    private graphOutputs: Map<string, [Dependency, Type]>;

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
            .map(([name, dep]): [string, [Dependency, Type]] => [name, [dep, dep.node.outputs.get(dep.output)!.type]]);

        const missingOutputDeps = outputs
            .filter(([_name, [dep, _ty]]) => graph.findGraphNode(dep.node) == undefined)
            .map(([name, [_dep, ty]]) => `Output "${name}" (type: ${ty}) points to a node not within the subgraph`);

        if (missingOutputDeps.length > 0) {
            throw new Error(missingOutputDeps.join('\n'));
        }

        const outputTypeMap = new Map(outputs.map(([name, [_, ty]]) => [name, ty]));
        super(new Map(), outputTypeMap);

        this.graph = graph;
        this.graphOutputs = new Map(outputs.map(([name, [dep, ty]]) => {
            const node = new GraphOutputNode(dep);
            this.graph.outputs.set(name, node);
            return [name, [{ node, output: SubGraphNode.defaultIoName }, ty]];
        }));

        for (const [_nodeName, node] of this.graph.nodes) {
            // Replace dependencies outside the graph with graph inputs
            for (const [depName, [dep, depType]] of node.inputs) {
                if (dep != undefined) {
                    dep.node.outputs.get(dep.output)!.dependants.delete({ node, input: depName });
                    if (Array.from(this.graph.nodes.values()).find(oNode => oNode == dep.node) == undefined) {
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
                        const newInput = new GraphInputNode([outerGraph.findGraphNode(dep.node)!.name, dep]);
                        const addedInput = this.graph.inputs.set(depName, newInput).get(depName)!;
                        node.inputs.set(depName, [{ node: addedInput, output: GraphNode.defaultIoName }, depType]);
                    }
                }
            }
        }
    }

    protected override _apply(_graph?: Graph, frame: number = 0): void {
        const updates = Array.from(this.graphOutputs.entries())
            .map(([name, [dep, _ty]]) => [name, dep.node.getOutput(dep.output, this.graph, frame)]);
        this.updateOutputs(Object.fromEntries(updates));
    }

    public get label(): string | undefined {
        return this.graph.name;
    }

    public override get nodeType(): string {
        return SubGraphNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                style: 'filled',
                fillcolor: 'whitesmoke',
                color: 'lightgrey',
            },
        };
    }

    public override dumpDot(name: string): string {
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
