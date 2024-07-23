import { BuiltinType, Dependency, ProcessorNode, Source, Type } from 'Graph/Prelude';

export type ConstructorArgs = { url: string, crs: string } & { [name: string]: unknown };

export default abstract class SourceNode extends ProcessorNode {
    public constructor(
        constructor: (args: ConstructorArgs) => Source<unknown>,
        url: Dependency,
        crs: Dependency,
        extraDependencies?: { [name: string]: [Dependency, Type] },
    ) {
        super(
            {
                url: [url, BuiltinType.String],
                crs: [crs, BuiltinType.CRS],
                ...extraDependencies,
            },
            BuiltinType.Source,
            (_frame, args) => constructor(args as ConstructorArgs),
            true,
        );
    }
}
