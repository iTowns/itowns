import { GraphNode, DumpDotGlobalStyle, Type, getColor, JunctionNode, SubGraphNode, InputNode, BuiltinType, Dependency } from './Common.ts';

/** Represents a directed graph that guarantees the absence of cycles on use. */
export default class Graph {
    public nodes: Map<string, GraphNode>;
    public types: Set<Type>;
    private _valid: boolean;

    public constructor() {
        this.nodes = new Map();
        this.types = new Set();
        this._valid = false;
    }

    public get isValid(): boolean {
        return this._valid;
    }

    /**
     * Get the output of a node at a given frame.
     * @throws If the graph is invalid.
     * @throws If the node does not exist.
     * @returns The output of the node at the given frame.
     */
    public getOutput(frame: number, out: Dependency): any {
        this.validate();

        return out.node.getOutput(out.output, this, frame);
    }

    /**
     * Get a node by name.
     * @returns The node with the given name.
     */
    public get(name: string): GraphNode | undefined {
        return this.nodes.get(name);
    }

    /**
     * Add or update a node. If the node already exists, it will be updated.
     * @throws If the node is orphaned and the graph has at least one node already.
     * @returns True if the node was added or updated, false otherwise.
     */
    public set(name: string, node: GraphNode): boolean {
        if (!(node instanceof InputNode) && this.nodes.size > 0
            && (node instanceof SubGraphNode ? node.graph.inputs.size == 0 : node.inputs.size == 0)
        ) {
            throw new Error('Orphaned node');
        }

        this._valid = false;

        this.nodes.set(name, node);
        for (const [_name, [_, ty]] of node.inputs) {
            this.types.add(ty);
        }
        for (const [_name, [_, ty]] of node.outputs) {
            this.types.add(ty);
        }

        return true;
    }

    /**
     * Add or update multiple nodes at once. Check the documentation of {@link set}
     * for more details.
     * Using numerical object keys is not recommended, as they will be automatically sorted,
     * possibly leading to unexpected behavior.
     * @throws If any of the nodes are orphaned and the graph has at least one node already.
     * @returns A map of the results of the set operation.
     */
    public setGrouped(
        nodes: { [name: string]: GraphNode; },
    ): Map<string, boolean> {
        const results = new Map();
        for (const [name, node] of Object.entries(nodes)) {
            results.set(name, this.set(name, node));
        }
        return results;
    }

    /**
     * Determine if the graph is valid. A graph is considered valid if it does
     * not contain cycles nor dangling dependencies.
     * @throws If the graph is invalid.
     */
    public validate(): void {
        if (this._valid) {
            return;
        }

        const visited = new Set<string>();
        for (const [name, node] of this.nodes) {
            if (visited.has(name)) {
                continue;
            }

            this._validationDfs(node, new Set(), visited);
        }

        this._valid = true;
    }

    /**
     * Depth-first search for cycles and dangling dependencies.
     * Node argument is assumed to exist within the graph.
     * @throws If a cycle is detected or a dangling dependency is found.
     */
    private _validationDfs(
        node: GraphNode,
        path: Set<string>,
        visited: Set<string>,
    ): void {
        const nodeName = this.findNode(node)?.name;
        if (nodeName == undefined) {
            console.error(node);
            throw new Error(`Node not found in nodes or inputs after following this path: ${path}`);
        }

        if (visited.has(nodeName)) {
            return;
        }

        // Cycle detection
        if (path.has(nodeName)) {
            throw new Error(
                `Cycle detected: ${Array.from(path).join(' -> ')} -> ${nodeName}`,
            );
        }

        // Type checking
        for (const [name, [dep, type]] of node.inputs ?? []) {
            if (dep != null) {
                const output = dep.node.outputs.get(dep.output);
                if (output == undefined) {
                    throw new Error(`Dangling dependency: '${nodeName}.${name}'; `
                        + `${dep.node.nodeType} dependency does not have an output named '${dep.output}'`);
                }
                const [_outputValue, outputType] = output;

                if (outputType != type && type != BuiltinType.Any) {
                    throw new Error(`Invalid type for dependency ${nodeName}.${name}`
                        + `, got '${outputType}' expected '${type}'`);
                }
            }
        }

        // DFS
        path.add(nodeName);
        for (const [_name, [dep, _type]] of node.inputs ?? []) {
            if (dep != null) {
                this._validationDfs(dep.node, path, visited);
            }
        }
        path.delete(nodeName);
    }

    /** Find a node's entry in the graph. O(n) time complexity. */
    public findGraphNode(node: GraphNode): { name: string, node: GraphNode } | null {
        for (const [name, oNode] of this.nodes.entries()) {
            if (node == oNode) {
                return { name, node: oNode };
            }
        }
        return null;
    }

    /** Find a node in all available node storages. */
    public findNode(node: GraphNode): { name: string, node: GraphNode } | null {
        return this.findGraphNode(node);
    }

    public get dumpDotStyle(): DumpDotGlobalStyle {
        return {
            rankdir: 'LR',
            node: {
                shape: 'mbox',
                fontname: 'Arial',
                style: 'filled',
                fillcolor: 'whitesmoke',
            },
            edge: {
                fontname: 'Arial',
                arrowhead: 'dot',
                arrowtail: 'dot',
                dir: 'both',
            },
        };
    }

    /**
     * Dump the graph in the DOT format.
     * @throws If a node input is not part of the graph.
     * @returns The graph in the DOT format.
     */
    public dumpDot(graphName: string = 'G'): string {
        const dump: string[] = [];
        dump.push(`digraph ${graphName} {`);

        if (this.nodes.size > 0) {
            // Global style defaults
            Object.entries(this.dumpDotStyle).forEach(([attr, value]) => {
                if (typeof value == 'object') {
                    const formattedAttrs = Object.entries(value)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(' ');
                    dump.push(`\t${attr} [${formattedAttrs}]`);
                } else {
                    dump.push(`\t${attr} = ${value}`);
                }
            });

            // Declare nodes
            dump.push('\t{');
            for (const [name, node] of this.nodes) {
                dump.push(`\t\t${node.dumpDot(name)}`);
            }
            dump.push('\t}');

            // Delicious spaghetti :(
            // Declare edges
            for (const [nodeName, node] of this.nodes) {
                for (const [depName, [dep, depTy]] of node.inputs) {
                    if (dep == null) { continue; }

                    // Lookup the node in the graph nodes and inputs
                    // PERF: Inefficient but the alternative is duplicating the names
                    // inside the nodes and that makes the API much heavier so we'll
                    // have to live with it as it will likely never be an issue.
                    const nodeEntry = this.findNode(dep.node);
                    if (nodeEntry == undefined) {
                        throw new Error(
                            `Input "${depName}" of node "${nodeName}" is not part of the graph`,
                        );
                    }

                    const { name: entryName, node: _ } = nodeEntry;
                    const colorStyle = getColor(null, depTy);
                    const attrs = nodeEntry.node.dumpDotEdgeAttr(depTy, {
                        ...(node instanceof JunctionNode ? { arrowhead: 'none' } : {}),
                        ...colorStyle,
                    });
                    const port = node instanceof JunctionNode ? '' : `:${depName}`;

                    const sourcePort = `:"${dep.output}"`;
                    dump.push(`\t"${entryName}"${sourcePort} -> "${nodeName}"${port} ${attrs};`);
                }

                if (node instanceof SubGraphNode) {
                    for (const [iName, iNode] of node.graph.inputs) {
                        const [dep, depTy] = iNode.input;
                        if (dep != undefined) {
                            const nodeEntry = this.findGraphNode(dep.node);
                            if (nodeEntry == undefined) {
                                throw new Error(
                                    `Input "${iName}" of subgraph "${node.label}" is not part of the graph`,
                                );
                            }
                            const { name: entryName, node: _entryNode } = nodeEntry;
                            const colorStyle = getColor(null, depTy);
                            const attrs = nodeEntry.node.dumpDotEdgeAttr(depTy, {
                                arrowhead: 'none',
                                ...colorStyle,
                            });
                            dump.push(`\t"${entryName}":"${dep.output}" -> "${nodeName}.${iName}" ${attrs}`);
                        }
                    }
                }
            }
        }

        dump.push('}');

        return dump.join('\n');
    }

    /**
     * Dump the graph in the DOT format and convert it to a graphviz link.
     * @throws If a node input is not part of the graph.
     * @returns The GraphvizOnline URL to view the graph.
     */
    public dumpDotGraphvizLink(): string {
        const dot = this.dumpDot();
        const escaped = dot
            .replaceAll('\n', '%0A')
            .replaceAll('\t', '%20%20')
            .replaceAll(':', '%3A')
            .replaceAll(';', '%3B')
            .replaceAll('=', '%3D');
        return `https://dreampuf.github.io/GraphvizOnline/#${escaped}`;
    }
}
