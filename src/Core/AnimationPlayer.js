import * as THREE from 'three';

const FRAMERATE = 60;
const FRAME_DURATION = 1000 / FRAMERATE;

// player statut
const PLAYER_STATE = {
    // player is stopped
    STOP: 0,
    // player plays animation
    PLAY: 1,
    // player is at the end of an animation
    END: 2,
    // player is paused
    PAUSE: 3,
};

// Private functions
// stop timer and re-init parameter
const resetTimer = function resetTimer(player) {
    if (player.id) {
        clearInterval(player.id);
        player.id = undefined;
    }
    if (player.waitTimer) {
        clearInterval(player.waitTimer);
        player.waitTimer = undefined;
    }
    player.keyframe = 0;
};

// finish animation and re-init parameter
const finishAnimation = function finishAnimation(player) {
    resetTimer(player);
    if (player.isEnded()) {
        player.dispatchEvent({ type: 'animation-ended' });
    }
    player.dispatchEvent({ type: 'animation-stopped' });
    player.duration = 0;
};

/**
 * It can play, pause or stop Animation or AnimationExpression (See below).
 * AnimationPlayer is needed to use Animation or AnimationExpression
 * AnimationPlayer emits events :
 *       - for each animation's frame;
 *       - when Animation is stopped
 *       - when Animation is ending
 */
class AnimationPlayer extends THREE.EventDispatcher {
    constructor() {
        super();
        this.id = null;
        this.keyframe = 0;
        this.duration = 0;
        this.state = PLAYER_STATE.STOP;
        this.waitTimer = null;
    }

    isPlaying() {
        return this.state === PLAYER_STATE.PLAY;
    }

    isStopped() {
        return this.state === PLAYER_STATE.STOP;
    }

    isEnded() {
        return this.state === PLAYER_STATE.END;
    }

    // Public functions

    /**
     * Play one animation.
     * If another animation is playing, it's stopped and the new animation is played.
     *
     * @param {number} duration - The duration to play
     */
    play(duration) {
        this.duration = duration;
        this.dispatchEvent({ type: 'animation-started' });
        this.state = PLAYER_STATE.PLAY;
        resetTimer(this);
        this.id = setInterval(this.frame.bind(this), FRAME_DURATION);
    }

    /**
     * Play an animation after a number of frames.
     *
     * @param      {number}  duration    The duration to play
     * @param      {number}  waitingFrame    The waiting time before start animation (time in frame)
     */
    playLater(duration, waitingFrame) {
        const timew = Math.floor(FRAME_DURATION * waitingFrame);
        window.clearInterval(this.waitTimer);
        const self = this;
        this.waitTimer = window.setTimeout(() => {
            self.play(duration);
        }, timew);
    }

    /**
     * Stop the current animation.
     *
     */
    stop() {
        this.state = PLAYER_STATE.STOP;
        finishAnimation(this);
    }

    /**
     * Executed for each frame.
     *
     * @private
     */
    frame() {
        if (this.keyframe < this.duration) {
            this.keyframe++;
            this.dispatchEvent({ type: 'animation-frame' });
        } else {
            this.state = PLAYER_STATE.END;
            finishAnimation(this);
        }
    }
}

export default AnimationPlayer;
