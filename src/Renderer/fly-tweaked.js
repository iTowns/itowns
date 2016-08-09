/**
 * @author James Baicoianu / http://www.baicoianu.com/
 * Source: https://github.com/mrdoob/three.js/blob/master/examples/js/controls/FlyControls.js
 *
 * Adopted to common js by Andrei Kashcha
 */

var eventify = require('ngraph.events');

export default function fly(camera, domElement, THREE) {
  domElement = domElement || document;
  domElement.setAttribute('tabindex', -1);

  var moveState = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    forward: 0,
    back: 0,
    pitchUp: 0,
    pitchDown: 0,
    yawLeft: 0,
    yawRight: 0,
    rollLeft: 0,
    rollRight: 0,
    fastfwd: 0
  };


  var api = {
    rollSpeed: 0.005,
    movementSpeed: 1,
    dragToLook: true,
    autoForward: false,
    deadzone: 0.1,
    /**
     * Requests to update camera position according to the currently pressed
     * keys/mouse
     */
    update: update,

    /**
     * Returns true if we are moving camera at the moment
     */
    isMoving: isMoving,

    /**
     * Releases all event handlers
     */
    destroy: destroy,

    /**
     * This allows external developers to better control our internal state
     * Super flexible, yet a bit dangerous
     */
    moveState: moveState,

    updateMovementVector: updateMovementVector,
    updateRotationVector: updateRotationVector,

    /**
     * Toggles dragToLook setting. When dragToLook is set to false, then
     * camera always attempts to focus on current mouse position. The only
     * stable point in the visualization is middle of the screen.
     */
    toggleDragToLook: toggleDragToLook
  };

  eventify(api);

  var tmpQuaternion = new THREE.Quaternion();
  var isMouseDown = 0;
  var keyMap = {
    90: { name: 'forward' }, // W
    83: { name: 'back'}, // S
    81: { name: 'left'}, // A
    68: { name: 'right'},// D
    82: { name: 'up'}, // R
    70: { name: 'down'}, // F
    38: { name: 'pitchUp'}, // up
    40: { name: 'pitchDown'}, // down
    37: { name: 'yawLeft'}, // left
    39: { name: 'yawRight'}, // right
    65: { name: 'rollLeft'}, // Q
    69: { name: 'rollRight'}, // E
    16: { name: 'fastfwd'} // LSHIFT
  };

  // we will remember what keys should be releaed in global keyup handler:
  var pendingKeyUp = Object.create(null);

  var moveVector = new THREE.Vector3(0, 0, 0);
  var rotationVector = new THREE.Vector3(0, 0, 0);

  var previousX = 0;
  var previousY = 0;

  var moveArgs = {
    move: moveVector,
    rotate: rotationVector
  };

  // these are local to the scene container. We want to initiate actions only
  // when we have focus
  domElement.addEventListener('mousedown', mousedown, false);
  domElement.addEventListener('keydown', keydown, false);
  domElement.addEventListener( 'mousewheel', mousewheel, false );

  // These are global since we can loose control otherwise and miss keyup/move
  // events.
  document.addEventListener('mousemove', mousemove, false);
  document.addEventListener('keyup', keyup, false);

  updateMovementVector();
  updateRotationVector();

  return api;

  function isMoving() {
    return moveState.up
            || moveState.down
            || moveState.left
            || moveState.right
            || moveState.forward
            || moveState.back
            || moveState.pitchUp
            || moveState.pitchDown
            || moveState.yawLeft
            || moveState.yawRight
            || moveState.rollLeft
            || moveState.rollRight;
  }

  function toggleDragToLook() {
    api.dragToLook = !api.dragToLook;
    api.moveState.yawLeft = 0;
    api.moveState.pitchDown = 0;

    updateRotationVector();

    return api.dragToLook;
  }

  function update(delta) {
    var moveMult = delta * api.movementSpeed * (moveState.fastfwd ? 3 : 1);
    var rotMult = delta * api.rollSpeed;

    camera.translateX(moveVector.x * moveMult);
    camera.translateY(moveVector.y * moveMult);
    camera.translateZ(moveVector.z * moveMult);

    tmpQuaternion.set(rotationVector.x * rotMult, rotationVector.y * rotMult, rotationVector.z * rotMult, 1).normalize();
    camera.quaternion.multiply(tmpQuaternion);

    // expose the rotation vector for convenience
    camera.rotation.setFromQuaternion(camera.quaternion, camera.rotation.order);
  }

  function keydown(event) {
    if (isModifierKey(event)) return;

    var motion = keyMap[event.keyCode];
    if (motion) {
      moveState[motion.name] = 1;
      // we need to make sure that global key up event clears this motion:
      pendingKeyUp[event.keyCode] = true;

      updateMovementVector();
      updateRotationVector();
      api.fire('move', moveArgs);
    }
  }

  function isModifierKey(e) {
    return e.altKey || e.ctrlKey || e.metaKey;
  }

  function keyup(event) {
    if (!pendingKeyUp[event.keyCode]) return;
    pendingKeyUp[event.keyCode] = false;
    var motion = keyMap[event.keyCode];
    moveState[motion.name] = 0;

    updateMovementVector();
    updateRotationVector();
    api.fire('move', moveArgs);
  }

  function mousedown(event) {
    if (domElement !== document) {
      domElement.focus();
    }

    document.addEventListener('mouseup', mouseup, false);

    event.preventDefault();
    //event.stopPropagation();

    if (api.dragToLook) {
      isMouseDown = true;
    } else {
      switch (event.button) {
        case 0:
          moveState.forward = 1;
          break;
        case 2:
          moveState.back = 1;
          break;
      }

      updateMovementVector();
    }

    api.fire('move', moveArgs);
  }

  function mousemove(event) {
    if (!api.dragToLook || isMouseDown) {
      var container = getContainerDimensions();
      var halfWidth = container.size[0] / 2;
      var halfHeight = container.size[1] / 2;

      var x = -((event.pageX - container.offset[0]) - halfWidth) / halfWidth;
      var y = ((event.pageY - container.offset[1]) - halfHeight) / halfHeight;
      moveState.yawLeft = x - previousX;
      moveState.pitchDown = y - previousY;

      if (Math.abs(moveState.yawLeft) < api.deadzone) moveState.yawLeft = 0;
      if (Math.abs(moveState.pitchDown) < api.deadzone) moveState.pitchDown = 0;

      updateRotationVector();
      api.fire('move', moveArgs);
    }
  }

  function mousewheel(event) {
    var delta = 0;
    if ( event.wheelDelta !== undefined ) {
        // WebKit / Opera / Explorer 9
        delta = event.wheelDelta;
    } else if ( event.detail !== undefined ) {
        // Firefox
        delta = - event.detail;
    }

    if (delta > 0) {
        moveState['forward'] = 1;
    } else {
        moveState['back'] = 1;
    }

    updateMovementVector();
    api.fire('move', moveArgs);
    moveState['forward'] = 0;
    moveState['back'] = 0;
  }

  function mouseup(event) {
    event.preventDefault();

    if (isMouseDown) {
      document.removeEventListener('mouseup', mouseup);
      isMouseDown = false;
    }

    if (api.dragToLook) {
      moveState.yawLeft = moveState.pitchDown = 0;
    } else {
      switch (event.button) {
        case 0:
          moveState.forward = 0;
          break;
        case 2:
          moveState.back = 0;
          break;
      }
      updateMovementVector();
    }

    updateRotationVector();
    api.fire('move', moveArgs);
  }


  function updateMovementVector() {
    var forward = (moveState.forward || (api.autoForward && !moveState.back)) ? 1 : 0;

    moveVector.x = (-moveState.left + moveState.right);
    moveVector.y = (-moveState.down + moveState.up);
    moveVector.z = (-forward + moveState.back);
  }

  function updateRotationVector() {
    rotationVector.x = (-moveState.pitchDown + moveState.pitchUp);
    rotationVector.y = (-moveState.yawRight + moveState.yawLeft);
    rotationVector.z = (-moveState.rollRight + moveState.rollLeft);
  }

  function getContainerDimensions() {
    if (domElement !== document) {
      return {
        size: [domElement.offsetWidth, domElement.offsetHeight],
        offset: [domElement.offsetLeft, domElement.offsetTop]
      };
    } else {
      return {
        size: [window.innerWidth, window.innerHeight],
        offset: [0, 0]
      };
    }
  }

  function destroy() {
    document.removeEventListener('mouseup', mouseup);
    document.removeEventListener('mousemove', mousemove, false);
    document.removeEventListener('keyup', keyup, false);
    domElement.removeEventListener('mousedown', mousedown, false);
    domElement.removeEventListener('keydown', keydown, false);
  }
}
