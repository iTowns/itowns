import * as THREE from 'three';
import { BuiltinType, Dependency, DumpDotNodeStyle, GraphNode, Type, Mappings } from '../Prelude.ts';
import ProcessorNode from './ProcessorNode.ts';

interface CallbackArgs extends Record<string, any> {
    input: THREE.WebGLRenderTarget;
    renderer: THREE.WebGLRenderer;
    uniforms: any[];
}

type FragmentShaderParts = {
    uniforms?: { [name: string]: Dependency | GraphNode | Type };
    auxCode?: string;
    main: string;
};

export default class ScreenShaderNode extends ProcessorNode {
    private static get vertexShader(): string {
        return `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;
    }

    private static get defaultFragmentShader(): FragmentShaderParts {
        return {
            main: 'gl_FragColor = texture2D(uTexture, vUv);',
        };
    }

    // HACK: Essentially a scuffed singleton pack.
    // PERF: Evaluate the cost of having a scene per shader node instead.
    private static _scene: THREE.Scene;
    private static _quad: THREE.Mesh;
    private static _camera: THREE.Camera;

    // Kept for debug purposes
    private _material: THREE.ShaderMaterial;

    private _fragmentShaderParts: FragmentShaderParts;

    private static _init(): void {
        if (ScreenShaderNode._scene == undefined) {
            ScreenShaderNode._scene = new THREE.Scene();

            // Setup the quad used to render the effects
            ScreenShaderNode._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
            ScreenShaderNode._quad.frustumCulled = false;

            ScreenShaderNode._scene.add(ScreenShaderNode._quad);

            ScreenShaderNode._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
    }

    public constructor(
        target: Dependency,
        renderer: Dependency,
        { fragmentShaderParts = ScreenShaderNode.defaultFragmentShader, toScreen = false }: {
            fragmentShaderParts?: FragmentShaderParts,
            toScreen?: boolean
        },
    ) {
        ScreenShaderNode._init();

        const uniforms = fragmentShaderParts.uniforms ?? {};

        const fullUniforms = Object.fromEntries(
            Object.entries(uniforms)
                .map(([name, uniform]): [string, [Dependency | null, Type]] => {
                    let val: [Dependency | null, Type];
                    if (typeof uniform == 'string') {
                        val = [null, uniform];
                    } else if (uniform instanceof GraphNode) {
                        val = [{ node: uniform, output: GraphNode.defaultIoName }, uniform.outputs.get(GraphNode.defaultIoName)![1]];
                    } else {
                        val = [uniform, uniform.node.outputs.get(uniform.output)![1]];
                    }

                    return [name, val];
                }),
        );

        super(
            {
                // Unpacking the uniforms object first allows us to ignore
                // potential 'input' and 'renderer' fields.
                ...fullUniforms,
                target: [target, BuiltinType.RenderTarget],
                renderer: [renderer, BuiltinType.Renderer],
            },
            BuiltinType.RenderTarget,
            (_frame, args: CallbackArgs) => {
                const { target: input, renderer, ...uniforms } = args;

                const target: THREE.WebGLRenderTarget | null = toScreen
                    ? null
                    : (this.outputs.get(GraphNode.defaultIoName)![0] ?? new THREE.WebGLRenderTarget(
                        input.width,
                        input.height,
                    ));

                this._material.uniforms.uTexture = { value: input.texture };

                // Set user-provided uniforms
                for (const [name, value] of Object.entries(uniforms ?? {})) {
                    this._material.uniforms[name] = { value };
                }

                ScreenShaderNode._quad.material = this._material;

                renderer.setRenderTarget(target);
                renderer.clear();
                renderer.render(ScreenShaderNode._scene, ScreenShaderNode._camera);

                this._out.outputs.set(ScreenShaderNode.defaultIoName, [target, BuiltinType.RenderTarget]);
            });

        this._fragmentShaderParts = fragmentShaderParts;
        const frag = ScreenShaderNode.buildFragmentShader(this._fragmentShaderParts);
        this._material = ScreenShaderNode.buildMaterial(frag);
    }

    public get fragmentShaderParts(): FragmentShaderParts {
        return this._fragmentShaderParts;
    }

    private static buildFragmentShader({ uniforms, auxCode, main }: FragmentShaderParts): string {
        const uniformDeclarations = Object.entries(uniforms ?? {})
            .map(([name, uniform]): string => {
                let ty: Type;

                if (typeof uniform == 'string') {
                    ty = uniform;
                } else if (uniform instanceof GraphNode) {
                    ty = uniform.outputs.get(GraphNode.defaultIoName)![1];
                } else {
                    ty = uniform.node.outputs.get(uniform.output)![1];
                }

                return `uniform ${Mappings.toOpenGL(ty)} ${name};`;
            });

        return [
            'precision highp float;\n',
            'varying vec2 vUv;',
            'uniform sampler2D uTexture;',
            ...(uniformDeclarations.length > 0 ? [uniformDeclarations.join('\n')] : []),
            ...(auxCode != undefined ? [auxCode] : []),
            'void main() {',
            `    ${main.split('\n').join('\n    ')}`,
            '}',
        ].join('\n');
    }

    public static buildMaterial(fragmentShader: string): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            fragmentShader,
            vertexShader: ScreenShaderNode.vertexShader,
        });
    }

    public get nodeType(): string {
        return ScreenShaderNode.name;
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        const { label, attrs } = super.dumpDotStyle;
        return {
            label,
            attrs,
        };
    }
}
