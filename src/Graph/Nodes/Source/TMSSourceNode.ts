import Extent from 'Core/Geographic/Extent';
import { BuiltinType } from 'Graph/Types';
import ProcessorNode from '../ProcessorNode';

export type TMSSourceDescriptor = {
    url: string,
    crs?: string,
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

export default class TMSSourceNode extends ProcessorNode {
    protected extentSetLimits?: Record<string, Record<number, Extent>>;

    constructor(public descriptor: TMSSourceDescriptor) {
        super({}, BuiltinType.Source, (_frame, args) => {
            // TODO: Generate a TMSSource
        }, true);
    }
}
