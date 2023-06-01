import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Fetcher from 'Provider/Fetcher';
import GDFParser from 'Parser/GDFParser';


describe('GDFParser', function () {
    let text;

    before(async () => {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        text = await Fetcher.text(
            'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/altitude-conversion-grids/' +
                'EGM2008.gdf',
            networkOptions,
        );
    });

    it('should default `options.in.crs` parameter to `EPSG:4326`', async function () {
        const geoidGrid = await GDFParser.parse(text);
        assert.strictEqual(geoidGrid.extent.crs, 'EPSG:4326');
    });

    it('should parse text data into a GeoidGrid', async function () {
        const geoidGrid = await GDFParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.extent.west, -180);
        assert.strictEqual(geoidGrid.extent.east, 180);
        assert.strictEqual(geoidGrid.extent.south, -90);
        assert.strictEqual(geoidGrid.extent.north, 90);
        assert.strictEqual(geoidGrid.step.x, 1);
        assert.strictEqual(geoidGrid.step.y, 1);
    });

    it('should set a correct data reading method for `GeoidGrid`', async function () {
        const geoidGrid = await GDFParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.getData(geoidGrid.dataSize.y - 2, 1), 13.813008707225);
    });
});
