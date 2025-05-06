import assert from 'assert';

describe('view_multiglobe', function _describe() {
    let result;
    before(async () => {
        result = await loadExample('examples/view_multiglobe.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('move view to 2nd globe', async () => {
    // press-space
        await page.evaluate(() => {
            onKeyPress({ keyCode: 32 });
        });

        await page.waitForFunction(() => view.mainLoop.renderingState === 0 && view.mainLoop.scheduler.commandsWaitingExecutionCount() === 0);

        // verify that we properly updated the globe
        const { layer } = await page.evaluate(() => {
            const pick = view.pickObjectsAt({ x: 200, y: 150 })[0];
            return {
                layer: pick.layer.id,
            };
        });
        assert.equal('globe2', layer);
    });
});
