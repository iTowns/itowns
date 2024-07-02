import { Graph, GraphInputNode, GraphNode, GraphOutputNode, JunctionNode, SubGraphNode, Mappings } from './Prelude';

export default class SubGraph extends Graph {
    public inputs: Map<string, GraphInputNode> = new Map();
    public outputs: Map<string, GraphOutputNode> = new Map();
    public name: string;

    private constructor(name: string, state: unknown) {
        super(state);
        this.name = name;
    }

    public static from(graph: Graph, name: string): SubGraph {
        // State is shared between subgraphs and parent graphs
        const subGraph = new SubGraph(name, graph.state);
        subGraph.nodes = graph.nodes;
        subGraph.types = graph.types;
        return subGraph;
    }

    /** Find a node's entry in the inputs. O(n) time complexity. */
    public findInputNode(node: GraphNode): { name: string, node: GraphInputNode } | null {
        for (const [name, oNode] of this.inputs.entries()) {
            if (node == oNode) {
                return { name, node: oNode };
            }
        }
        return null;
    }

    public findOutputNode(node: GraphNode): { name: string, node: GraphOutputNode } | null {
        for (const [name, oNode] of this.outputs.entries()) {
            if (node == oNode) {
                return { name, node: oNode };
            }
        }
        return null;
    }

    public override findNode(node: GraphNode): { name: string, node: GraphNode } | null {
        return super.findNode(node) ?? this.findInputNode(node);
    }

    public override dumpDot(subGraphName: string): string {
        const dump: string[] = [];

        if (this.nodes.size > 0) {
            // Declare nodes
            dump.push('\t{');
            for (const [name, node] of this.nodes) {
                dump.push(`\t\t${node.dumpDot(name)}`);
            }
            for (const [name, input] of this.inputs) {
                dump.push(`\t\t${input.dumpDot(`${subGraphName}.${name}`)}`);
            }
            for (const [name, input] of this.outputs) {
                dump.push(`\t\t${input.dumpDot(`${subGraphName}->${name}`)}`);
            }
            dump.push('\t}');

            // Declare edges
            for (const [nodeName, destNode] of this.nodes) {
                for (const [depName, [dep, depTy]] of destNode.inputs) {
                    if (dep == null) { continue; }

                    // Lookup the node in the graph nodes and inputs
                    const nodeEntry = this.findNode(dep.node);
                    if (nodeEntry == undefined) {
                        throw new Error(
                            `Input "${depName}" of node "${nodeName}" is not part of the subgraph "${this.name}"`,
                        );
                    }

                    const { name: srcName, node: srcNode } = nodeEntry;
                    const colorStyle = Mappings.colorize(null, depTy);
                    const attrs = nodeEntry.node.dumpDotEdgeAttr(depTy, {
                        ...(srcNode instanceof JunctionNode ? { arrowtail: 'none' } : {}),
                        ...(destNode instanceof JunctionNode ? { arrowhead: 'none' } : {}),
                        ...colorStyle,
                    });
                    const port = destNode instanceof JunctionNode ? '' : `:${depName}`;

                    const sourceName = srcNode instanceof GraphInputNode ? `${subGraphName}.${srcName}` : srcName;
                    const sourcePort = srcNode instanceof GraphInputNode ? '' : `:"${dep.output}"`;

                    if (dep.node instanceof SubGraphNode) {
                        dump.push(`\t"${sourceName}->${dep.output}":e -> "${nodeName}"${port}:w ${attrs};`);
                    } else {
                        dump.push(`\t"${sourceName}"${sourcePort}:e -> "${nodeName}"${port}:w ${attrs};`);
                    }
                }

                if (destNode instanceof SubGraphNode) {
                    for (const [iName, iNode] of destNode.graph.inputs) {
                        const [dep, depTy] = iNode.input;
                        if (dep != undefined) {
                            const nodeEntry = this.findGraphNode(dep.node);
                            if (nodeEntry == undefined) {
                                throw new Error(
                                    `Input "${iName}" of subgraph "${destNode.label}" is not part of the graph`,
                                );
                            }
                            const { name: entryName, node: _entryNode } = nodeEntry;
                            const colorStyle = Mappings.colorize(null, depTy);
                            const attrs = nodeEntry.node.dumpDotEdgeAttr(depTy, {
                                arrowhead: 'none',
                                ...colorStyle,
                            });
                            dump.push(`\t"${entryName}":e -> "${nodeName}.${iName}":w ${attrs}`);
                        }
                    }
                }
            }

            for (const [name, node] of this.outputs) {
                const dep = node.input[0]!;
                const { name: gName, node: gNode } = this.findGraphNode(dep.node)!;
                const ty = gNode.outputs.get(dep.output)!.type;

                const colorStyle = Mappings.colorize(null, ty);
                const attrs = gNode.dumpDotEdgeAttr(ty, {
                    arrowhead: 'none',
                    ...colorStyle,
                });

                dump.push(`\t"${gName}":"${dep.output}":e -> "${subGraphName}->${name}":w ${attrs};`);
            }
        }

        return dump.join('\n');
    }

    override dumpAdjacencyMatrix(): string {
        const dump = [super.dumpAdjacencyMatrix()];

        const nodeCount = GraphNode.totalNodesCreated;
        const padding = nodeCount > 0 ? Math.floor(Math.log10(nodeCount)) + 1 : 1;

        for (const [name, node] of this.inputs.entries()) {
            dump.push(`${node.id.toString().padStart(padding)}:  (in) ${name}`);
        }

        for (const [name, node] of this.outputs.entries()) {
            dump.push(`${node.id.toString().padStart(padding)}: (out) ${name}`);
        }

        return dump.join('\n');
    }
}
