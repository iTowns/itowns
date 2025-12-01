/**
 * Blocks UI events from propagating to itowns.
 * @param viewerDiv - Itowns view div
 * @param panel - UI element that prevents event propagation
 */
export const blockEventsIfFromPanel = (viewerDiv: HTMLDivElement, panel: HTMLDivElement) => {
    const blockIfFromPanel = (e: Event) => {
        if (
            panel &&
            e.target instanceof Node &&
            panel.contains(e.target)
        ) {
            e.stopImmediatePropagation();
        }
    };

    viewerDiv.addEventListener('mouseup', blockIfFromPanel, true);
    viewerDiv.addEventListener('mousedown', blockIfFromPanel, true);
    viewerDiv.addEventListener('pointerdown', blockIfFromPanel, true);
    viewerDiv.addEventListener('pointermove', blockIfFromPanel, true);
    viewerDiv.addEventListener('pointerup', blockIfFromPanel, true);
    viewerDiv.addEventListener('wheel', blockIfFromPanel, true);
};

export default blockEventsIfFromPanel;
