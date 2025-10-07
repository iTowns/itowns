const UPDATE_STATE = {
    IDLE: 0,
    PENDING: 1,
    ERROR: 2,
    DEFINITIVE_ERROR: 3,
    FINISHED: 4,
} as const;

// TODO: we should be able to configure this per layer
const PAUSE_BETWEEN_ERRORS = [1.0, 3.0, 7.0, 60.0];

export type UpdateState = (typeof UPDATE_STATE)[keyof typeof UPDATE_STATE];

/**
 * LayerUpdateState is the update state of a layer, for a given object
 * (e.g. tile).
 * It stores information to allow smart update decisions, and especially
 * network error handling.
 */
class LayerUpdateState {
    errorCount: number;
    failureParams: {
        lowestLevelError: number;
    };

    private state: UpdateState;
    private lastErrorTimestamp: number;

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

    /**
     * Checks if the update has finished successfully.
     */
    hasFinished() {
        return UPDATE_STATE.FINISHED == this.state;
    }

    /**
     * Checks if an update can be attempted based on the current update state.
     *
     * @param timestamp - Current timestamp in milliseconds (defaults to
     * Date.now()).
     */
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

    /**
     * Gives the number of seconds to wait before the next retry attempt.
     */
    secondsUntilNextTry() {
        if (this.state !== UPDATE_STATE.ERROR) {
            return 0;
        }
        const idx =
            Math.max(0, Math.min(this.errorCount, PAUSE_BETWEEN_ERRORS.length) - 1);

        return PAUSE_BETWEEN_ERRORS[idx];
    }

    /**
     * Marks the beginning of a new update attempt.
     */
    newTry() {
        this.state = UPDATE_STATE.PENDING;
    }

    /**
     * Marks the update as successful. It resets the error tracking.
     */
    success() {
        this.lastErrorTimestamp = 0;
        this.state = UPDATE_STATE.IDLE;
    }

    /**
     * Marks the update as permanently finished, preventing further update
     * attempts.
     */
    noMoreUpdatePossible() {
        this.state = UPDATE_STATE.FINISHED;
    }

    /**
     * Handles the case where no data is available for the requested level.
     * Updates the lowest level error tracking for future retry attempts.
     *
     * @param failureParams - The current context of the failure (this includes
     * the current updated level).
     */
    noData(failureParams: { targetLevel: number }) {
        this.state = UPDATE_STATE.IDLE;
        this.failureParams.lowestLevelError = Math.min(
            failureParams.targetLevel,
            this.failureParams.lowestLevelError,
        );
    }

    /**
     * Handles update failures. An error is either definitive or retryable (up
     * to four attempts).
     *
     * @param timestamp - The timestamp when the failure occurred.
     * @param definitive - Whether this error stops the update process.
     * @param failureParams - The current context of the failure (this includes
     * the current updated level).
     */
    failure(timestamp: number, definitive: boolean, failureParams: { targetLevel: number }) {
        if (failureParams && failureParams.targetLevel != undefined) {
            this.failureParams.lowestLevelError = Math.min(
                failureParams.targetLevel,
                this.failureParams.lowestLevelError,
            );
        }
        this.lastErrorTimestamp = timestamp;
        this.state = definitive ? UPDATE_STATE.DEFINITIVE_ERROR : UPDATE_STATE.ERROR;
        this.errorCount++;
    }

    /**
     * Checks if the layer is currently in an error state.
     */
    inError() {
        return this.state == UPDATE_STATE.DEFINITIVE_ERROR || this.state == UPDATE_STATE.ERROR;
    }
}

export default LayerUpdateState;
