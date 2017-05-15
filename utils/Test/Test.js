/* eslint-disable no-console*/
const colorLog = function colorLog(message, color) {
    console.log(`%c${message}`, `color:${color};font-weight:bold;`);
};

const maxRelativeError = 0.001;
const showTablesResult = false;

let isLaunched = false;

const randomValue = function randomValue(min, max) {
    return Math.random() * (max - min) + min;
};

const colors = {
    testm: '#315D91',
    test: '#5D7685',
    success: '#23871F',
    failedm: '#CE121D',
    failed: '#BE8589',
};

function Test(api) {
    this.api = api;

    const chain = (promises, results, index) => {
        index = index === undefined ? 0 : index;

        if (!promises[index]) {
            return Promise.resolve(results);
        }

        const mandatory = promises[index].mandatory === undefined || promises[index].mandatory;
        const color = mandatory ? colors.testm : colors.test;
        colorLog('--------------------------------------', color);
        colorLog(`Start test ${promises[index].fn.name} (${mandatory ? 'mandatory' : 'not mandatory'})`, color);
        if (promises[index].message) {
            colorLog(promises[index].message, color);
        }

        return promises[index].fn.apply(this, promises[index].params).then((r) => {
            if (mandatory) {
                results.push({ result: r, name: promises[index].fn.name });
            }
            const result = r ? 'Success' : 'Failed';
            const colorFailed = mandatory ? colors.failedm : colors.failed;
            colorLog(`${promises[index].fn.name} : Test ${result}`, r ? colors.success : colorFailed);
            index++;
            return chain(promises, results, index);
        });
    };

    const showResult = function showResult(askedPosition, resultPosition) {
        const delta = {};
        let resultTest = true;
        const tables = {};
        for (const key in askedPosition) {
            if (Object.prototype.hasOwnProperty.call(askedPosition, key)) {
                if (askedPosition[key]) {
                    delta[key] = resultPosition[key] - askedPosition[key];
                    const relativeError = Math.abs(delta[key]) / askedPosition[key];
                    const unitTest = relativeError < maxRelativeError;
                    tables[key] = { result: unitTest };
                    if (!unitTest) {
                        colorLog(`Error with ${key}`, colors.failed);
                        resultTest = false;
                    }
                }
            }
        }
        if (showTablesResult) {
            console.table(tables);
        }
        return resultTest;
    };

    this.getPositionViewer = function getPositionViewer() {
        const center = this.api.getCameraTargetGeoPosition();
        const configuration = {
            longitude: center.longitude(),
            latitude: center.latitude(),
            range: this.api.getRange(),
            tilt: this.api.getTilt(),
            heading: this.api.getHeading(),
            scale: this.api.getZoomScale(),
            level: this.api.getZoomLevel(),
        };
        return configuration;
    };

    this.launch = function launch() {
        if (!isLaunched) {
            const results = [];
            isLaunched = true;

            const promises = [
                { fn: this.setCameraTargetGeoPosition,
                    params: [{
                        longitude: randomValue(-180, 180),
                        latitude: randomValue(-70, 70),
                    }],
                },
                { fn: this.setCameraTargetGeoPositionAdvanced,
                    params: [{
                        longitude: 1,
                        latitude: 46,
                        range: 6000,
                        tilt: 45,
                        heading: 30,
                    }],
                    // Attention bug à cause du range du à l'ellispoid
                    message: 'with range parameter',
                },
                { fn: this.setCameraTargetGeoPositionAdvanced,
                    params: [{
                        longitude: 1,
                        latitude: 46,
                        scale: 0.00005,
                        tilt: 45,
                        heading: 30,
                    }],
                    message: 'with scale parameter',
                },
                { fn: this.setCameraTargetGeoPositionAdvanced,
                    params: [{
                        longitude: 1,
                        latitude: 46,
                        level: 8,
                        tilt: 45,
                        heading: 30,
                    }],
                    mandatory: false,
                    message: 'with level parameter (Not mandatory because setZoomLevel need fix)',
                },
                { fn: this.setRange,
                    params: [20000],
                    mandatory: false,
                    message: '(not mandatory because dynamic DMT)',
                },
                { fn: this.setTilt,
                    params: [randomValue(0, 90)],
                },
                { fn: this.setHeading,
                    params: [randomValue(0, 180)],
                },
            ];

            return chain(promises, results, 0).then((r) => {
                const failed = r.filter(e => !e.result);
                const success = failed.length === 0;
                const color = success ? colors.success : colors.failedm;
                colorLog('--------------------------------------', color);
                colorLog('FINISH', color);
                colorLog(`${r.length - failed.length} test(s) success / ${r.length}`, color);
                for (const fail of failed) {
                    colorLog(` + Error on : ${fail.name}`, color);
                }
                colorLog(`Success all mandatory tests : ${success}`, color);
                colorLog('--------------------------------------', color);
            });
        }
    };

    const _buildTestPosition = function buildTestPosition(fn) {
        const member = fn.name.replace(/set/i, '').toLowerCase();
        this[fn.name] = (...args) => {
            let position = {};
            if (typeof (args[0]) === 'object') {
                position = args[0];
            } else if (typeof (args[0]) === 'number') {
                position[member] = args[0];
            }
            if (args[1] === undefined) {
                args[1] = true;
            }
            return this.api[fn.name](...args).then(() =>
                showResult(position, this.getPositionViewer()));
        };

        Object.defineProperty(this[fn.name], 'name', { value: fn.name });
    };

    const buildTestPosition = _buildTestPosition.bind(this);

    buildTestPosition(this.api.setCameraTargetGeoPosition);
    buildTestPosition(this.api.setHeading);
    buildTestPosition(this.api.setTilt);
    buildTestPosition(this.api.setRange);
    buildTestPosition(this.api.setCameraTargetGeoPositionAdvanced);
}
/* eslint-enable no-console*/

window.Test = Test;
