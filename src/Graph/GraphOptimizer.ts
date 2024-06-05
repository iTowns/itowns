import { Graph, GraphNode, ScreenShaderNode } from './Prelude.ts';

export type GraphOptimizerPattern = {
    pattern: string[],
    operation: (nodes: GraphNode[], graph: Graph) => Graph
};

export default class GraphOptimizer {
    public static patterns: Map<string, GraphOptimizerPattern> = new Map(Object.entries({
        screenShaderMerger: {
            pattern: ['ScreenShader', 'ScreenShader'],
            operation: (nodes: GraphNode[], graph: Graph) => {
                const [child, parent] = nodes as ScreenShaderNode[];

                const [childRenderer, parentRenderer] = [child.inputs.get('renderer')![0]!, parent.inputs.get('renderer')![0]!];
                if (childRenderer.node != parentRenderer.node || childRenderer.output != parentRenderer.output) {
                    throw new Error('Different renderer');
                    // return graph;
                }

                if (graph.findDependants(parent).length != 1) {
                    throw new Error('Parent has multiple dependants');
                    return graph;
                }

                const [cParts, pParts] = [child.fragmentShaderParts, parent.fragmentShaderParts];

                // Find and replace duplicate uniform names
                const replacements = [];

                pParts.uniforms ??= {};

                for (const [name, _value] of Object.entries(pParts.uniforms)) {
                    if (cParts.uniforms?.[name] != undefined) {
                        const val = pParts.uniforms[name];
                        delete pParts.uniforms[name];
                        pParts.uniforms[`parent_${name}`] = val;

                        replacements.push([name, `parent_${name}`]);
                    }
                }

                cParts.uniforms = { ...cParts.uniforms, ...pParts.uniforms };

                // Replace duplicate uniform names in parent code
                cParts.auxCode ??= '';
                pParts.auxCode ??= '';

                for (const [name, replacement] of replacements) {
                    const match = new RegExp(`\\b${name}\\b`);
                    pParts.auxCode = pParts.auxCode.replaceAll(match, replacement);
                }

                const [childName, parentName] = [graph.findNode(child), graph.findNode(parent)].map(n => n?.name ?? 'null');

                cParts.auxCode = [
                    `// ${parentName}`, pParts.auxCode,
                    `// ${childName}`, cParts.auxCode,
                ].join('\n');
                cParts.main = [
                    `// ${parentName}`, pParts.main,
                    `// ${childName}`, cParts.main,
                ].join('\n');

                for (const [inputName, [dep, ty]] of parent.inputs.entries()) {
                    child.inputs.set(inputName, [dep, ty]);
                }

                if (!graph.nodes.delete(parentName)) {
                    throw new Error(`Failed to delete node ${parentName}`);
                }

                return graph;
            },
        },
    }));

    public static optimize(graph: Graph, start: GraphNode | string): Graph {
        graph.validate();

        const node = start instanceof GraphNode ? start : graph.nodes.get(start);
        if (node == undefined) {
            throw new Error(`Node "${start}" does not exist in the graph`);
        }

        const visited = new Set<GraphNode>();
        const path: GraphNode[] = [];

        function dfs(node: GraphNode): void {
            if (visited.has(node)) {
                return;
            }
            visited.add(node);

            path.push(node);

            for (const [name, { pattern, operation }] of GraphOptimizer.patterns) {
                const slice = path.slice(-pattern.length).map(v => v.nodeType);
                if (slice.join(' ') == pattern.join(' ')) {
                    console.log(`Running optimization pattern ${name}`);
                    const opRes = operation(path.slice(-pattern.length), graph);
                    if (graph != opRes) {
                        console.error(graph, opRes);
                        throw new Error('Optimization patterns must not create new graphs');
                    }
                    path.splice(-pattern.length);
                }
            }

            for (const [_name, [dep, _ty]] of node.inputs) {
                if (dep != null) {
                    dfs(dep.node);
                }
            }
        }

        dfs(node);

        return graph;
    }
}
