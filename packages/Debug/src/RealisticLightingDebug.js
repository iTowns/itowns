export function createRealisticLightingDebugUI(gui, view) {
    if (view.realisticLighting === undefined) {
        console.error('Failed to create realistic lighting debug UI. The view does not expose realisticLighting');
        return;
    }
    if (view.skyController === undefined) {
        console.error('Failed to create debug UI. The view does not expose skyController');
        return;
    }
    const realisticLightingFolder = gui.addFolder('Realistic lighting');
    const realisticLightingProperty = realisticLightingFolder.add(view, 'realisticLighting');
    const forceDayTimeProperty = realisticLightingFolder.add(view.skyController, 'forceDaytime');
    const dateTimeFolder = createDateTimeUI(realisticLightingFolder, view);

    function toggleDateTimeFolder() {
        if (!view.realisticLighting || view.skyController.forceDaytime) {
            dateTimeFolder.hide();
        } else {
            dateTimeFolder.show();
            dateTimeFolder.open();
        }
    }

    toggleDateTimeFolder();
    forceDayTimeProperty.onChange(() => toggleDateTimeFolder());
    realisticLightingProperty.onChange(() => toggleDateTimeFolder());
    return realisticLightingFolder;
}

export function createDateTimeUI(gui, view) {
    const date = view.date;
    const dateTimeFolder = gui.addFolder('Date/Time');
    dateTimeFolder.add(
        { month: 1 + date.getMonth() }, 'month', 1, 12, 1,
    ).onChange((v) => {
        date.setMonth(v - 1);
        view.notifyChange(view.camera3D);
    }).name('month (1-12)');

    dateTimeFolder.add(
        { hour: date.getHours() }, 'hour', 0, 24, 0.1,
    ).onChange((v) => {
        const hours = Math.floor(v);
        const minutes = (v - hours) * 60;
        date.setHours(hours, minutes);
        view.notifyChange(view.camera3D);
    }).name('hour (24h)');
    return dateTimeFolder;
}
