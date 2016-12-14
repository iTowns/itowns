var rangeControl = document.createElement('div');
rangeControl.id = 'rangeControl';

var controlDiv = document.getElementById('controlDiv');

controlDiv.appendChild(rangeControl);

var controlR = new itowns.viewer.Control(
    'Range',
    document.getElementById('rangeControl'),
    {
        div: document.getElementById('controlDiv')
    }
);

var callbackR = function () {
    itowns.viewer.addControl(controlR);
    document.getElementById(controlR.pElement.id).innerHTML = "Range : " + itowns.viewer.getRange();
};

itowns.viewer.addEventListener('mousedown', callbackR);