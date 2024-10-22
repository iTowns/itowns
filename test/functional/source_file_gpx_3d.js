import assert from 'assert';

describe('source_file_gpx_3d', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/source_file_gpx_3d.html', this.fullTitle());
    });

    it('view initialized', async () => {
        assert.ok(result);
    });

    it('should wait for the mesh to be added to the scene', async function _it() {
        await page.waitForFunction(() => view.scene.children.length === 4, { timeout: 10000 });
    });
});
