import * as THREE from 'three';
import { BuiltinType, Dependency, DumpDotNodeStyle, GraphNode, Type } from '../Common.ts';
import ProcessorNode from './ProcessorNode.ts';

interface CallbackArgs extends Record<string, any> {
    input: THREE.WebGLRenderTarget;
    renderer: THREE.WebGLRenderer;
    uniforms: any[];
}

export default class ScreenShaderNode extends ProcessorNode {
    private static get vertexShader() {
        return `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
        `;
    }

    private static get defaultFragmentShader() {
        return `
        void main() {
            vec4 color = texture2D(uTexture, vUv);
            gl_FragColor = color;
        }
        `;
    }


    // WARN: This is a temporary hack. Essentially a scuffed singleton pack.
    // PERF: Evaluate the cost of having a scene per shader node instead.
    private static _scene: THREE.Scene;
    private static _quad: THREE.Mesh;
    private static _camera: THREE.Camera;

    // Kept for debug purposes
    private _fragmentShader: string;
    private _material: THREE.ShaderMaterial;

    private static _init() {
        if (ScreenShaderNode._scene == undefined) {
            ScreenShaderNode._scene = new THREE.Scene();

            // Setup the quad used to render the effects
            ScreenShaderNode._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
            ScreenShaderNode._quad.frustumCulled = false;

            ScreenShaderNode._scene.add(ScreenShaderNode._quad);

            ScreenShaderNode._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
    }

    /**
     * Create a new screen shader node.
     * @param input The input {@link THREE.Texture}.
     * @param renderer The {@link THREE.WebGLRenderer} to render with.
     */
    public constructor(
        input: Dependency,
        renderer: Dependency,
        { uniforms, fragmentShader, toScreen = false }: {
            uniforms?: { [name: string]: GraphNode | Type },
            fragmentShader?: string,
            toScreen?: boolean
        },
    ) {
        ScreenShaderNode._init();

        const fullUniforms = Object.fromEntries(
            Object.entries(uniforms ?? {})
                .map(([name, uniform]): [string, [Dependency, string]] => {
                    if (uniform instanceof GraphNode) {
                        return [name, [uniform, uniform.outputType]];
                    } else {
                        return [name, [null, uniform]];
                    }
                }),
        );

        console.log('== FullUniforms ==', fullUniforms);

        super(
            {
                // Unpacking the uniforms object first allows us to ignore
                // potential 'input' and 'renderer' fields.
                ...fullUniforms,
                input: [input, BuiltinType.RenderTarget],
                renderer: [renderer, BuiltinType.Renderer],
            },
            BuiltinType.RenderTarget,
            (_frame, args: CallbackArgs) => {
                const { input, renderer, ...uniforms } = args;

                const target: THREE.WebGLRenderTarget | null = toScreen
                    ? null
                    : (this._out[1] ?? new THREE.WebGLRenderTarget(
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

                return target;
            });

        this._fragmentShader = `
            precision highp float;

            varying vec2 vUv;
            uniform sampler2D uTexture;

            ${fragmentShader ?? ScreenShaderNode.defaultFragmentShader}`;

        this._material = new THREE.ShaderMaterial({
            fragmentShader: this._fragmentShader,
            vertexShader: ScreenShaderNode.vertexShader,
        });
    }

    protected get _nodeType(): string {
        return ScreenShaderNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        const { label, attrs } = super.dumpDotStyle;
        return {
            label,
            attrs: {
                ...attrs,
                fillcolor: 'lightcoral',
            },
        };
    }
}
