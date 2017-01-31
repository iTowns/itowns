const UPDATE_STATE = {
    IDLE: 0,
    PENDING: 1,
    ERROR: 2,
    DEFINITIVE_ERROR: 3,
};
const PAUSE_BETWEEN_ERRORS = [1.0, 3.0, 7.0, 60.0];

/**
 * LayerUpdateState is the update state of a layer, for a given object (e.g tile).
 * It stores information to allow smart update decisions, and especially network
 * error handling.
 */
function LayerUpdateState() {
    this.state = UPDATE_STATE.IDLE;
    this.lastErrorTimestamp = 0;
    this.errorCount = 0;
}

LayerUpdateState.prototype.canTryUpdate = function canTryUpdate(timestamp) {
    switch (this.state) {
        case UPDATE_STATE.IDLE: {
            return true;
        }
        case UPDATE_STATE.DEFINITIVE_ERROR:
        case UPDATE_STATE.PENDING: {
            return false;
        }
        case UPDATE_STATE.ERROR:
        default: {
            const errorDuration = this.secondsUntilNextTry() * 1000;
            return errorDuration <= (timestamp - this.lastErrorTimestamp);
        }
    }
};

LayerUpdateState.prototype.secondsUntilNextTry = function secondsUntilNextTry() {
    if (this.state !== UPDATE_STATE.ERROR) {
        return 0;
    }
    const idx =
        Math.max(0, Math.min(this.errorCount, PAUSE_BETWEEN_ERRORS.length) - 1);

    return PAUSE_BETWEEN_ERRORS[idx];
};

LayerUpdateState.prototype.newTry = function newTry() {
    this.state = UPDATE_STATE.PENDING;
};

LayerUpdateState.prototype.success = function success() {
    this.lastErrorTimestamp = 0;
    this.state = UPDATE_STATE.IDLE;
};

LayerUpdateState.prototype.failure = function failure(timestamp, definitive) {
    this.lastErrorTimestamp = timestamp;
    this.state = definitive ? UPDATE_STATE.DEFINITIVE_ERROR : UPDATE_STATE.ERROR;
    this.errorCount++;
};

export default LayerUpdateState;
