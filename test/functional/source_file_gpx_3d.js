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
        await page.waitForFunction(
            () => {
                // The added mesh has 29 children. Identify it based on that property.
                const children = view.scene.children;
                return children[children.length - 1].children.length === 29;
            },
            { timeout: 10000 },
        );
    });
});
