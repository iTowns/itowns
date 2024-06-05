import { Graph, GraphNode, ScreenShaderNode } from 'Graph/Prelude.ts';

export default {
    pattern: Array(2).fill(ScreenShaderNode.name),
    operation: (nodes: GraphNode[], graph: Graph) => {
        const [child, parent] = nodes as ScreenShaderNode[];

        const [cName, pName] = [graph.findNode(child), graph.findNode(parent)]
            .map(n => n?.name ?? 'null');

        const [cRenderer, pRenderer] = [child.inputs, parent.inputs]
            .map(inputs => inputs.get('renderer')![0]!);

        if (cRenderer.node != pRenderer.node || cRenderer.output != pRenderer.output) {
            throw new Error(`Different renderer for ${cName} and ${pName}`);
        }

        if (graph.findDependants(parent).length != 1) {
            throw new Error(`Parent ${pName} has multiple dependants`);
        }

        const [cParts, pParts] = [child.fragmentShaderParts, parent.fragmentShaderParts];

        const detectedOffsetSampling = /texture2D\((?!uTexture,vUv)[^)]*\)/.exec(
            ((cParts.auxCode ?? '') + cParts.main).replaceAll(/\s/g, ''),
        );

        if (detectedOffsetSampling != null) {
            throw new Error(
                `Child ${cName} samples input with an offset`
                + `(only allowed for parent shaders when merging): ${detectedOffsetSampling[0]}`,
            );
        }

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

        cParts.auxCode = [
            `// ${pName}`, pParts.auxCode,
            `// ${cName}`, cParts.auxCode,
        ].join('\n');
        cParts.main = [
            `// ${pName}`, pParts.main,
            `// ${cName}`, cParts.main,
        ].join('\n');

        for (const [inputName, [dep, ty]] of Array.from(parent.inputs.entries()).slice().reverse()) {
            child.inputs.set(inputName, [dep, ty]);
        }

        graph.nodes.delete(pName);
        graph.nodes.delete(cName);

        graph.nodes.set(`__${pName}_${cName}`, child);

        return child;
    },
};


