var pickControl = document.createElement('div');
pickControl.id = 'pickControl';

var controlDiv = document.getElementById('controlDiv');

controlDiv.appendChild(pickControl);

var control = new itowns.viewer.Control(
    'Pick',
    document.getElementById('pickControl'),
    {
        div: document.getElementById('controlDiv')
    }
);

var callback = function () {
    itowns.viewer.addControl(control);
    document.getElementById(control.pElement.id).innerHTML = "longitude : " + itowns.viewer.pickPosition().coordinate[0] * 180 / 3.14 + " ; latitude : " + itowns.viewer.pickPosition().coordinate[1] * 180 / 3.14 + " ; altitude : " +  itowns.viewer.pickPosition().coordinate[2];
};

itowns.viewer.addEventListener('mousedown', callback);