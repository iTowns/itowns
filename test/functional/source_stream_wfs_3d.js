import assert from 'assert';

describe('source_stream_wfs_3d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_stream_wfs_3d.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });
    it('should remove GeometryLayer', async () => {
        const countGeometryLayerStart = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        await page.evaluate(() => view.removeLayer('WFS Bus lines'));
        const countGeometryLayerEnd = await page.evaluate(() => view.getLayers(l => l.isGeometryLayer).length);
        assert.ok(countGeometryLayerStart - countGeometryLayerEnd === 1);
    });
    it('should update tiles when a GeometryLayer is replaced by a ColorLayer', async () => {
        const staleTiles = await page.evaluate(() => {
            const id = 'WFS Building';
            window.buildingSource = view.getLayerById(id).source;
            view.removeLayer(id);
            let count = 0;
            view.tileLayer.object3d.traverse((node) => {
                if (node.layerUpdateState?.[id] || node.link?.[id]) {
                    count++;
                }
            });
            return count;
        });
        assert.equal(staleTiles, 0);

        await page.evaluate(() => view.addLayer(new itowns.ColorLayer('WFS Building', {
            source: window.buildingSource,
            style: { fill: { color: 'red' } },
        })));

        const colored = await page.waitForFunction(() => {
            let found = false;
            view.tileLayer.object3d.traverse((node) => {
                if (node.material?.visible && node.material.getColorTile?.('WFS Building')) {
                    found = true;
                }
            });
            return found;
        }, { timeout: 60000, polling: 500 }).then(() => true, () => false);
        assert.ok(colored);

        const pageErrors = [];
        const onError = (e) => { pageErrors.push(e); };
        page.on('pageerror', onError);

        await page.evaluate(() => {
            view.removeLayer('WFS Building');
            return view.addLayer(new itowns.FeatureGeometryLayer('WFS Building', {
                source: window.buildingSource,
                zoom: { min: 14 },
                style: { fill: { color: 'red' } },
            }));
        });

        const meshed = await page.waitForFunction(() => {
            let found = false;
            view.tileLayer.object3d.traverse((node) => {
                if (node.link?.['WFS Building']?.length) {
                    found = true;
                }
            });
            return found;
        }, { timeout: 60000, polling: 500 }).then(() => true, () => false);
        await page.evaluate(() => new Promise((resolve) => {
            view.notifyChange(view.camera3D);
            setTimeout(resolve, 2000);
        }));
        page.off('pageerror', onError);

        assert.ok(meshed);
        assert.deepEqual(pageErrors.map(e => e.message), []);
    });
});
