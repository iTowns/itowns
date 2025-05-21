import { TmsSource } from 'Main';
import { TmsSourceOptions } from './TmsSource';

export interface WmtsSourceOptions<Data> extends TmsSourceOptions<Data> {
    name: string,
    version?: string,
    style?: string,
    tileMatrixSet?: string,
    vendorSpecific?: Record<string, unknown>,
}

export class WmtsSource<Data> extends TmsSource<Data> {
    public readonly isWmtsSource = true as const;

    public constructor(options: WmtsSourceOptions<Data>) {
        super(options);

        const urlObj = new URL(this.url);
        urlObj.searchParams.set('LAYER', options.name);
        urlObj.searchParams.set('FORMAT', this.format);
        urlObj.searchParams.set('SERVICE', 'WMTS');
        urlObj.searchParams.set('VERSION', options.version ?? '1.0.0');
        urlObj.searchParams.set('REQUEST', 'GetTile');
        urlObj.searchParams.set('STYLE', options.style ?? 'normal');
        urlObj.searchParams.set('TILEMATRIXSET', options.tileMatrixSet ?? 'WGS84');
        urlObj.searchParams.set('TILEMATRIX', '%TILEMATRIX');
        urlObj.searchParams.set('TILEROW', '%ROW');
        urlObj.searchParams.set('TILECOL', '%COL');

        const vendorSpecific: Record<string, string> = Object.fromEntries(
            Object.entries(options.vendorSpecific ?? {}).map(([k, v]) => [k, String(v)]));
        for (const name in vendorSpecific) {
            if (Object.prototype.hasOwnProperty.call(vendorSpecific, name)) {
                urlObj.searchParams.set(name, vendorSpecific[name]);
            }
        }

        this.url = decodeURIComponent(urlObj.toString());
    }
}
