import * as itowns from 'itowns';

export type FetcherConfigType = {
    id: string;
    source: itowns.WMTSSource;
    noDataValue?: number | undefined;
    clampValues?: {
        min?: number | undefined;
        max?: number | undefined;
    } | undefined;
};
