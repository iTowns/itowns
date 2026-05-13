import * as itowns from 'itowns';

type FetcherConfigType = {
    id: string;
    source: itowns.WMTSSource;
    noDataValue?: number | undefined;
    clampValues?: {
        min?: number | undefined;
        max?: number | undefined;
    } | undefined;
};

export default FetcherConfigType;
