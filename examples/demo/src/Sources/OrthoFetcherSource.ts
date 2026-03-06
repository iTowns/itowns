import * as itowns from 'itowns';
import type { FetcherConfigType } from '../Types';

let configPromise: Promise<FetcherConfigType> | undefined;
let cachedConfig: FetcherConfigType | undefined;

export async function getFetcherConfig() {
    if (cachedConfig) {
        return Promise.resolve(cachedConfig);
    }
    if (!configPromise) {
        configPromise = (
            itowns.Fetcher.json(
                'assets/Ortho.json',
            ) as Promise<FetcherConfigType>
        ).then((config) => {
            config.source = new itowns.WMTSSource(config.source);
            cachedConfig = config;
            return cachedConfig;
        });
    }
    return configPromise;
}
