const UPDATE_STATE = {
    IDLE: 0,
    PENDING: 1,
    ERROR: 2,
    DEFINITIVE_ERROR: 3,
    FINISHED: 4,
};
const PAUSE_BETWEEN_ERRORS = [1.0, 3.0, 7.0, 60.0];

/**
 * LayerUpdateState is the update state of a layer, for a given object (e.g tile).
 * It stores information to allow smart update decisions, and especially network
 * error handling.
 * @constructor
 */
class LayerUpdateState {
    constructor() {
        this.state = UPDATE_STATE.IDLE;
        this.lastErrorTimestamp = 0;
        this.errorCount = 0;
        // lowestLevelError is lowest level with error.
        //
        // if lowestLevelError is Infinity, so there has been no error.
        //
        // if lowestLevelError isn't Infinity, so the strategy is to find the
        // highest level between the current level and lowestLevelError.
        // the dichotomy method is used to find it.
        this.failureParams = {
            lowestLevelError: Infinity,
        };
    }

    canTryUpdate(timestamp = Date.now()) {
        switch (this.state) {
            case UPDATE_STATE.IDLE: {
                return true;
            }
            case UPDATE_STATE.DEFINITIVE_ERROR:
            case UPDATE_STATE.PENDING:
            case UPDATE_STATE.FINISHED: {
                return false;
            }
            case UPDATE_STATE.ERROR:
            default: {
                const errorDuration = this.secondsUntilNextTry() * 1000;
                return errorDuration <= (timestamp - this.lastErrorTimestamp);
            }
        }
    }

    secondsUntilNextTry() {
        if (this.state !== UPDATE_STATE.ERROR) {
            return 0;
        }
        const idx =
            Math.max(0, Math.min(this.errorCount, PAUSE_BETWEEN_ERRORS.length) - 1);

        return PAUSE_BETWEEN_ERRORS[idx];
    }

    newTry() {
        this.state = UPDATE_STATE.PENDING;
    }

    success() {
        this.lastErrorTimestamp = 0;
        this.state = UPDATE_STATE.IDLE;
    }

    noMoreUpdatePossible() {
        this.state = UPDATE_STATE.FINISHED;
    }

    noData(failureParams) {
        this.state = UPDATE_STATE.IDLE;
        this.failureParams.lowestLevelError = Math.min(failureParams.targetLevel, this.failureParams.lowestLevelError);
    }

    failure(timestamp, definitive, failureParams) {
        if (failureParams && failureParams.targetLevel != undefined) {
            this.failureParams.lowestLevelError = Math.min(failureParams.targetLevel, this.failureParams.lowestLevelError);
        }
        this.lastErrorTimestamp = timestamp;
        this.state = definitive ? UPDATE_STATE.DEFINITIVE_ERROR : UPDATE_STATE.ERROR;
        this.errorCount++;
    }

    inError() {
        return this.state == UPDATE_STATE.DEFINITIVE_ERROR || this.state == UPDATE_STATE.ERROR;
    }
}

export default LayerUpdateState;
