/* global itowns */
/* global Widget */
/* global widgetTab */

const rangeWidget = document.createElement('div');
rangeWidget.id = 'rangeWidget';

const widgetsR = document.getElementById('widgets');

widgetsR.appendChild(rangeWidget);

const widgetR = new Widget(
    'Range',
    document.getElementById('rangeWidget'),
    { div: widgetsR });

const callbackR = function () {
    widgetTab.addWidget(widgetR);
    if (document.getElementById('rangeList')) {
        document.getElementById(widgetR.pElement.id).removeChild(document.getElementById('rangeList'));
    }
    const coords = itowns.viewer.getRange();
    const list = document.createElement('ul');
    list.id = 'rangeList';
    const item = document.createElement('li');
    item.innerHTML = `range : ${coords}`;
    list.appendChild(item);
    document.getElementById(widgetR.pElement.id).appendChild(list);
};

widgetR.listenToMap('mousedown', callbackR);
