import { BuiltinType, Dependency, Graph, GraphNode, ProcessorNode, Source, Type } from 'Graph/Prelude';

export type BaseConstructorArgs = { url: string, crs: string };

export default abstract class SourceNode<ConstructorArgs extends BaseConstructorArgs, Input, Output> extends GraphNode {
    private _constructor: (args: ConstructorArgs) => Source<Input, Output>;
    private _config: ConstructorArgs;

    public constructor(
        constructor: (args: ConstructorArgs) => Source<Input, Output>,
        constructorArgs: ConstructorArgs,
    ) {
        super(
            new Map(),
            BuiltinType.Source,
            true,
        );

        this._constructor = constructor;
        this._config = constructorArgs;
    }

    protected _apply(_graph?: Graph, frame: number = 0): void {
        this._out.frame = frame;

        const start = Date.now();
        this.updateOutputs({ [SourceNode.defaultIoName]: this._constructor(this._config) })
        this._out.timeTaken = Date.now() - start;
    }
}
