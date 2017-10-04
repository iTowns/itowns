import * as THREE from 'three';

const FRAMERATE = 60;
const FRAME_DURATION = 1000 / FRAMERATE;
// if is true console.log are enabled to sniff animation'state
const debugAnimation = false;

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

const debugMsg =
    [
        'Stop',
        'Play',
        'End',
        'Pause',
    ];

// if debugAnimation is true console.log are enabled to sniff animation'state
let _DEBUG = null;

if (debugAnimation) {
    _DEBUG = function DEBUG(message, animation) {
        if (animation) {
            // eslint-disable-next-line no-console
            console.info('Animation ', message, ' : ', animation.name);
        }
    };
} else {
    _DEBUG = function _DEBUG() {};
}

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
        player.dispatchEvent({
            type: 'animation-ended',
            animation: player.animation,
        });
    }
    player.dispatchEvent({
        type: 'animation-stopped',
        animation: player.animation,
    });
    player.animation = null;
    if (player.resolve) {
        player.resolve();
        player.resolve = null;
        player.promise = null;
    }
};

const setPlayerState = function setPlayerState(player, state) {
    player.state = state;
    _DEBUG(debugMsg[state], player.animation);
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
        this.animation = null;
        this.resolve = null;
        this.promise = null;
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
     * @param {Animation} animation - The animation to play
     * @return {Promise<void>} - Promise is resolved when animation is stopped or finished
     */
    play(animation) {
        this.animation = animation;
        this.dispatchEvent({
            type: 'animation-started',
            animation });
        setPlayerState(this, PLAYER_STATE.PLAY);
        resetTimer(this);
        this.id = setInterval(this.frame.bind(this), FRAME_DURATION);
        this.promise = new Promise((r) => { this.resolve = r; });
        return this.promise;
    }

    /**
     * Play an animation after a number of frames.
     *
     * @param      {Animation}  animation    The animation to play
     * @param      {number}  waitingFrame    The waiting time before start animation (time in frame)
     * @return     {Promise<void>} Promise is resolved when animation is stopped or finished
     */
    playLater(animation, waitingFrame) {
        this.resolveWait = null;
        const promise = new Promise((r) => { this.resolveWait = r; });
        const timew = Math.floor(FRAME_DURATION * waitingFrame);
        window.clearInterval(this.waitTimer);
        this.waitTimer = window.setTimeout(() => { this.play(animation).then(() => this.resolveWait()); }, timew);
        return promise;
    }

    /**
     * Stop the current animation.
     *
     * @return  {Promise<void>}  Promise is resolved when animation is stopped or finished
     */
    stop() {
        setPlayerState(this, PLAYER_STATE.STOP);
        finishAnimation(this);
        // needed to return promise to wait sync
        return Promise.resolve();
    }

    /**
     * Executed for each frame.
     *
     * @private
     */
    frame() {
        if (this.keyframe < this.animation.duration) {
            if (this.animation.animate) {
                this.animation.animate(this.keyframe);
            }
            this.keyframe++;
            this.dispatchEvent({
                type: 'animation-frame',
            });
        }
        else {
            setPlayerState(this, PLAYER_STATE.END);
            finishAnimation(this);
        }
    }
}

/**
 * Animation is played by the AnimationPlayer during the time of duration
 * During playback, the AnimationPlayer emits events for each frame
 * Animation is used to execute a callback to each frame
 */
class Animation {
    /**
     * @param {Object}  params
     * @param {?number} params.duration - The animation's duration in number of frames. {@link FRAMERATE} is number of frames in one seconde.
     * @param {string}  params.name     - The animation's name. It's used for debug message.
     */
    constructor(params) {
        this.duration = params.duration || FRAMERATE;
        this.name = params.name;
    }
}

/**
 * AnimatedExpression is played by the AnimationPlayer during the time of duration
 * During playback, the AnimationPlayer emits event for each frame and
 * it applies expression on root.
 * AnimatedExpression is used to change object's values for each frame
 */
class AnimatedExpression extends Animation {
    /**
     * @param {Object}   params
     * @param {?number}  params.duration   - Duration in number of frames. {@link FRAMERATE} is number of frames in one seconde.
     * @param {Object}   params.root       - Object in scene to animate
     * @param {function(Object,number):void} params.expression - Function applied to root for each frame, arguments are the root object and the ratio of completion.
     * @param {string}   params.name       - The animation's name. It's used for debug message
     */
    constructor(params) {
        super(params);
        this.root = params.root;
        this.expression = params.expression;
    }
    animate(keyFrame) {
        this.expression(this.root, keyFrame / (this.duration - 1));
    }
}

export { Animation, AnimatedExpression };
export default AnimationPlayer;
