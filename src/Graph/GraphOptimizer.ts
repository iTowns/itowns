import { Graph, GraphInputNode, GraphNode, GraphOptimization, opti } from './Prelude.ts';

export default class GraphOptimizer {
    public static patterns: Map<string, GraphOptimization> = new Map(Object.entries(opti));

    public static optimize(graph: Graph, start: GraphNode | string, debug: boolean = false): Graph {
        graph.validate();

        const node = start instanceof GraphNode ? start : graph.nodes.get(start);
        if (node == undefined) {
            throw new Error(`Node "${start}" does not exist in the graph`);
        }

        const path: GraphNode[] = [];

        function dfs(node: GraphNode): number {
            path.push(node);

            if (debug) {
                // eslint-disable-next-line no-console
                console.info(`[${GraphOptimizer.name}] path:`, path.map(n => graph.findNode(n)?.name ?? n.nodeType));
            }

            for (const [name, { pattern, operation }] of GraphOptimizer.patterns) {
                // Compare the last n nodes in the path to the pattern
                const isDifferent = path.length < pattern.length || path.slice(-pattern.length)
                    .map((v, i) => v.nodeType == pattern[i])
                    .includes(false);
                if (!isDifferent) {
                    try {
                        if (debug) {
                            // eslint-disable-next-line no-console
                            console.info(`[${GraphOptimizer.name}] Trying optimization ${name}`);
                        }
                        const newStart = operation(path.slice(-pattern.length), graph);
                        path.splice(-pattern.length);
                        dfs(newStart);
                        return pattern.length;
                    } catch (e) {
                        if (debug) {
                            // eslint-disable-next-line no-console
                            console.info(`[${GraphOptimizer.name}] ${name}:`, e);
                        }
                    }
                }
            }

            for (const [_name, [dep, _ty]] of node.inputs) {
                if (dep != null && !(dep.node instanceof GraphInputNode)) {
                    const retCount = dfs(dep.node);
                    if (retCount > 0) {
                        return retCount - 1;
                    }
                }
            }

            path.pop();

            return 0;
        }

        dfs(node);

        return graph;
    }
}
