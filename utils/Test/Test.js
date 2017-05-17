import { CONTROL_EVENTS } from '../../src/Renderer/ThreeExtended/GlobeControls';
/* eslint-disable no-console*/
const colorLog = function colorLog(message, color) {
    console.log(`%c${message}`, `color:${color};font-weight:bold;`);
};

const maxRelativeError = 0.02;
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

function Test(control) {
    this.control = control;

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

    const showResult = function showResult(askedPosition, resultPosition, eventSuccess) {
        if (eventSuccess !== -1) {
            console.log('EVENT ', eventSuccess ? 'Success' : 'Failed');
        }
        const delta = {};
        let resultTest = true;
        const tables = {};
        for (const key in askedPosition) {
            if (Object.prototype.hasOwnProperty.call(askedPosition, key)) {
                if (askedPosition[key]) {
                    delta[key] = resultPosition[key] - askedPosition[key];
                    console.log(askedPosition[key], resultPosition[key]);
                    const relativeError = Math.abs(delta[key] / askedPosition[key]);
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
        const center = this.control.getCameraTargetGeoPosition();
        const configuration = {
            longitude: center.longitude(),
            latitude: center.latitude(),
            range: this.control.getRange(),
            tilt: this.control.getTilt(),
            heading: this.control.getHeading(),
            scale: this.control.getScale(),
            zoom: this.control.getZoom(),
        };
        return configuration;
    };

    this.launch = function launch() {
        if (!isLaunched) {
            const results = [];
            isLaunched = true;

            // const promises = [
            //     // premier test pas pris en compte voir ISSUE #300
            //     { fn: this.setCameraTargetGeoPosition,
            //         params: [{
            //             longitude: 0,
            //             latitude: 0,
            //         }],
            //         mandatory: false,
            //     },
            //     { fn: this.setCameraTargetGeoPosition,
            //         params: [{
            //             longitude: 14.746392303871474,
            //             latitude: 3.447160108471735,
            //         }],
            //         mandatory: false,
            //     },
            //     { fn: this.setCameraTargetGeoPositionAdvanced,
            //         params: [{
            //             longitude: 1,
            //             latitude: 46,
            //             range: 6000,
            //             tilt: 45,
            //             heading: 30,
            //         }],
            //         // Attention bug à cause du range du à l'ellispoid
            //         message: 'with range parameter',
            //     },
            // ];

            const promises = [
                // premier test pas pris en compte voir ISSUE #300
                { fn: this.setCameraTargetGeoPosition,
                    params: [{
                        longitude: 0,
                        latitude: 0,
                    }],
                    mandatory: false,
                },
                { fn: this.setCameraTargetGeoPosition,
                    params: [{
                        longitude: randomValue(-180, 180),
                        latitude: randomValue(-50, 50),
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
                        zoom: 8,
                        tilt: 45,
                        heading: 30,
                    }],
                    mandatory: false,
                    message: 'with zoom parameter (Not mandatory because setZoom need fix)',
                },
                { fn: this.setRange,
                    params: [20000],
                    mandatory: false,
                    message: '(not mandatory because dynamic DMT)',
                },
                { fn: this.setTilt,
                    params: [randomValue(1, 85)],
                },
                { fn: this.setHeading,
                    params: [randomValue(0, 180)],
                },
                { fn: this.setZoom,
                    params: [Math.floor(randomValue(2, 19))],
                },
                { fn: this.setScale,
                    params: [0.0005],
                },
                { fn: this.setOrbitalPosition,
                    params: [{
                        tilt: randomValue(1, 85),
                        heading: randomValue(0, 180),
                        range: 20000,
                    }],
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

    const _buildTestPosition = function _buildTestPosition(fn, event) {
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
            console.log(fn.name, args);

            // ADD EVENT TEST
            let eventSuccess = false;

            const foo = () => {
                eventSuccess = true;
                this.control.removeEventListener(event, foo);
            };

            if (event) {
                this.control.addEventListener(event, foo, false);
            } else {
                eventSuccess = -1;
            }
            return this.control[fn.name](...args).then(() =>
                showResult(position, this.getPositionViewer(), eventSuccess));
        };

        Object.defineProperty(this[fn.name], 'name', { value: fn.name });
    };

    const buildTestPosition = _buildTestPosition.bind(this);

    buildTestPosition(this.control.setCameraTargetGeoPosition, CONTROL_EVENTS.CAMERA_TARGET_CHANGED);
    buildTestPosition(this.control.setHeading, CONTROL_EVENTS.ORIENTATION_CHANGED);
    buildTestPosition(this.control.setTilt, CONTROL_EVENTS.ORIENTATION_CHANGED);
    buildTestPosition(this.control.setRange, CONTROL_EVENTS.RANGE_CHANGED);
    buildTestPosition(this.control.setCameraTargetGeoPositionAdvanced);
    buildTestPosition(this.control.setZoom, CONTROL_EVENTS.RANGE_CHANGED);
    buildTestPosition(this.control.setScale, CONTROL_EVENTS.RANGE_CHANGED);
    /* buildTestPosition(this.control.pan);*/
    buildTestPosition(this.control.setOrbitalPosition, CONTROL_EVENTS.ORIENTATION_CHANGED);
}
/* eslint-enable no-console*/

window.Test = Test;
