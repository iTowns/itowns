import Extent from 'Core/Geographic/Extent';
import { BuiltinType, DumpDotNodeStyle, Source } from 'Graph/Types';
import SourceNode from './SourceNode';

export type TMSSourceDescriptor = {
    url: string,
    crs: string,
    format?: string,
    extent?: Extent,
    zoom?: {
        min: number,
        max: number,
    },
    tileMatrixSetLimits?: Record<number, {
        minTileRow: number,
        maxTileRow: number,
        minTileCol: number,
        maxTileCol: number,
    }>,
    tileMatrixCallback?: (zoomLevel: number) => string,
};

export class TMSSourceNode extends SourceNode<TMSSourceDescriptor, unknown, unknown> {
    protected extentSetLimits?: Record<string, Record<number, Extent>>;

    constructor(public descriptor: TMSSourceDescriptor) {
        super((args) => new TMSSource(args), descriptor)
    }

    public get nodeType(): string {
        return "TMSSource";
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => name,
            attrs: {
                color: 'lightskyblue',
            }
        }
    }
}

export type TMSSourceInput = {
    crs: string,

}

export class TMSSource implements Source<unknown, unknown> {
    public constructor(config: TMSSourceDescriptor) { }

    public loadData(extent: Extent, input: TMSSourceDescriptor): Promise<never> {
        throw new Error('Method not implemented.');
    }
}
