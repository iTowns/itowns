/* global itowns */
/* global Widget */
/* global widgetTab */

const pickWidget = document.createElement('div');
pickWidget.id = 'pickWidget';

const widgetsP = document.getElementById('widgets');

widgetsP.appendChild(pickWidget);

const widget = new Widget(
    'Pick',
    document.getElementById('pickWidget'),
    {
        div: widgetsP,
    });

const callback = function () {
    widgetTab.addWidget(widget);
    if (document.getElementById('pickList')) {
        document.getElementById(widget.pElement.id).removeChild(document.getElementById('pickList'));
    }
    const tab = ['longitude', 'latitude', 'altitude'];
    const coords = itowns.viewer.pickPosition().coordinate;
    const list = document.createElement('ul');
    list.id = 'pickList';
    for (var j = 0; j < coords.length; j++) {
        var item = document.createElement('li');
        item.id = tab[j];
        item.innerHTML = `${tab[j]} : ${coords[j]}`;
        list.appendChild(item);
    }
    document.getElementById(widget.pElement.id).appendChild(list);
};

widget.listenToMap('mousedown', callback);
