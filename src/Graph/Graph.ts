import {
    GraphNode,
    DumpDotGlobalStyle,
    Type,
    Mappings,
    JunctionNode,
    SubGraphNode,
    InputNode,
    BuiltinType,
    Dependency,
    Optimizer,
    GraphInputNode,
} from './Prelude';

/** Represents a directed graph that guarantees the absence of cycles on use. */
export default class Graph {
    public nodes: Map<string, GraphNode>;
    public types: Set<Type>;
    protected _state: unknown;
    protected _valid: boolean;

    public constructor(state: unknown) {
        this.nodes = new Map();
        this.types = new Set();
        this._valid = false;
        this._state = state;
    }

    public get isValid(): boolean {
        return this._valid;
    }

    // Encapsulated to prevent setting the state to a new reference
    public get state(): unknown {
        return this._state;
    }

    /**
     * Get the output of a node at a given frame.
     * @throws If the graph is invalid.
     * @throws If the node does not exist.
     * @returns The output of the node at the given frame.
     */
    public getOutput(frame: number, out: Dependency | [GraphNode, string] | [string, string] | GraphNode | string): unknown {
        this.validate();

        if (out instanceof GraphNode) {
            out = { node: out, output: GraphNode.defaultIoName };
        } else if (typeof out == 'string') {
            const node = this.nodes.get(out);
            if (node == undefined) {
                throw new Error(`Node "${out}" does not exist in the graph`);
            }
            out = { node, output: GraphNode.defaultIoName };
        } else if (Array.isArray(out)) {
            const [nodeName, output] = out;
            const node = nodeName instanceof GraphNode ? nodeName : this.nodes.get(nodeName);
            if (node == undefined) {
                throw new Error(`Node "${nodeName}" does not exist in the graph`);
            }
            out = { node, output };
        }

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
    private setSingle(name: string, node: GraphNode): boolean {
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
        for (const [_name, output] of node.outputs) {
            this.types.add(output.type);
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
    public set(
        nodes: { [name: string]: GraphNode; },
    ): Map<string, boolean> {
        const results = new Map();
        for (const [name, node] of Object.entries(nodes)) {
            results.set(name, this.setSingle(name, node));
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
        // GraphInputNodes are only used as entry points to subgraphs
        if (node instanceof GraphInputNode) {
            return;
        }

        const nodeName = this.findNode(node)?.name;
        if (nodeName == undefined) {
            console.error(node);
            throw new Error(`Node not found in graph after following this path: ${Array.from(path)}`);
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
                const outputType = output.type;

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

    /**
     * Remove a node from the graph.
     * @throws If the node does not exist.
     * @returns true if the node was removed, false otherwise.
     */
    public remove(name: string): void {
        const node = this.nodes.get(name);
        if (node == undefined) {
            throw new Error(`Node "${name}" does not exist in the graph`);
        }

        this._valid = false;

        Array.from(node.inputs).filter(([_input, [dep, _ty]]) => dep != null).forEach(([input, [dependency, _ty]]) => {
            const { node, output } = dependency!;
            const out = node.outputs.get(output);
            if (out == undefined) {
                throw new Error(`Dependency ${node.nodeType} (id: ${node.id}) does not have an output named '${output}'`);
            }
            out.dependants.delete({ node, input });
        });

        this.nodes.delete(name);
    }

    public findDependants(node: GraphNode): GraphNode[] {
        const dependants: GraphNode[] = [];
        for (const [_name, n] of this.nodes) {
            for (const [_name, [dep, _ty]] of n.inputs) {
                if (dep?.node == node) {
                    dependants.push(n);
                }
            }
        }
        return dependants;
    }

    public findBacklinks(dependency: Dependency): [string, [GraphNode, string]][] {
        const backlinks: [string, [GraphNode, string]][] = [];
        for (const [name, node] of this.nodes) {
            const inputs = node instanceof SubGraphNode ? new Map(Array.from(node.graph.inputs.entries()).map(([name, input]) => [name, input.input])) : node.inputs;

            for (const [depName, [dep, _depTy]] of inputs.entries()) {
                if (dep == null) {
                    continue;
                }

                if (dep.node == dependency.node && dep.output == dependency.output) {
                    backlinks.push([name, [node, depName]]);
                }
            }
        }
        return backlinks;
    }

    public optimize(start: GraphNode | string, debug: boolean = false): void {
        Optimizer.optimize(this, start, debug);
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

                    // Lookup the dependency node's name
                    const nodeEntry = this.findNode(dep.node);
                    if (nodeEntry == undefined) {
                        throw new Error(
                            `Input "${depName}" of node "${nodeName}" is not part of the graph`,
                        );
                    }

                    const { name: entryName, node: entryNode } = nodeEntry;
                    const colorStyle = Mappings.colorize(null, depTy);
                    const attrs = nodeEntry.node.dumpDotEdgeAttr(depTy, {
                        ...(entryNode instanceof SubGraphNode ? { arrowtail: 'none' } : {}),
                        ...(node instanceof JunctionNode ? { arrowhead: 'none' } : {}),
                        ...colorStyle,
                    });
                    const port = node instanceof JunctionNode ? '' : `:"${depName}"`;

                    const sourcePort = `:"${dep.output}"`;
                    if (dep.node instanceof SubGraphNode) {
                        dump.push(`\t"${entryName}->${dep.output}":e -> "${nodeName}"${port}:w ${attrs};`);
                    } else {
                        dump.push(`\t"${entryName}"${sourcePort}:e -> "${nodeName}"${port}:w ${attrs};`);
                    }
                }

                // Link the subgraph inputs while outside of it to force proper positioning of nodes with dot.
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
                            const colorStyle = Mappings.colorize(null, depTy);
                            const attrs = nodeEntry.node.dumpDotEdgeAttr(depTy, {
                                arrowhead: 'none',
                                ...colorStyle,
                            });
                            dump.push(`\t"${entryName}":"${dep.output}":e -> "${nodeName}.${iName}":w ${attrs}`);
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

    public dumpAdjacencyMatrix(dependants: boolean = false): string {
        const nodeCount = GraphNode.totalNodesCreated;

        type Cell = { dependencies: number, dependants: number };

        const matrix: Cell[][] = Array.from({ length: nodeCount }, () => Array.from({ length: nodeCount }, () => ({ dependencies: 0, dependants: 0 })));
        for (const node of this.nodes.values()) {
            const nodeIndex = node.id;

            // Dependencies
            for (const [dep, _ty] of node.inputs.values()) {
                if (dep != null) {
                    const depIndex = dep.node.id;
                    matrix[nodeIndex][depIndex].dependencies += 1;
                }
            }

            // Dependants
            for (const output of node.outputs.values()) {
                for (const dep of output.dependants) {
                    const depIndex = dep.node.id;
                    matrix[nodeIndex][depIndex].dependants += 1;
                }
            }
        }

        const dump: string[] = [];
        const padding = nodeCount > 0 ? Math.floor(Math.log10(nodeCount)) + 1 : 1;
        const cellPadding = nodeCount > 0 ? Math.floor(Math.log10(Math.max(nodeCount, ...matrix.map((row): number =>
            Math.max(...row.map((v): number =>
                Math.max(v.dependencies, v.dependants))))))) + 1 : 1;

        // Header
        dump.push(`${' '.repeat(padding + 2)}${Array.from({ length: nodeCount }, (_, i) => i.toString().padStart(cellPadding)).join(' ')}`);
        dump.push(`${' '.repeat(padding + 1)}┌${'─'.repeat((cellPadding + 1) * nodeCount - 1)}`);

        // Rows
        for (const [index, row] of matrix.entries()) {
            const provider = (v: Cell): number => (dependants ? v.dependants : v.dependencies);
            const strRow = row.map(provider).map(v => (v > 0 ? v.toString() : ' ').padStart(padding)).join(' ');

            dump.push(`${index.toString().padStart(padding)} │${strRow}`);
        }

        for (const [name, node] of this.nodes.entries()) {
            dump.push(`${node.id.toString().padStart(padding)}: ${name}`);
            if (node instanceof SubGraphNode) {
                dump.push(node.graph.dumpAdjacencyMatrix());
            }
        }

        return dump.join('\n');
    }
}
