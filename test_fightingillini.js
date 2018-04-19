/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/

const fi = require('./fightingillini.js'),
    _createDebug = require('./debug.js');

fi.getAllEvents()
    .then(events => {
        const debug = _createDebug('test_fightingillini:AllEvents');
        debug('Events Result: %v', events);
    })
    .catch(error => console.error('Events Error: %s', error));

fi.getNextEvents('TRACK_AND_FIELD')
    .then(events => {
        const debug = _createDebug('test_fightingillini:NextEvents:TRACK_AND_FIELD');
        debug('Track and Field Result: %v', events);
    })
    .catch(error => console.error('Track and Field Error: %s', error));

fi._getEventsFromRSS('FOOTBALL')
    .then(events => {
        const debug = _createDebug('test_fightingillini:RSSEvents:FOOTBALL');
        debug('RSS Football Result: %v', events);
    })
    .catch(error => console.error('RSS Football Error: %s', error));

fi._getEventsFromDB('FOOTBALL')
    .then(events => {
        const debug = _createDebug('test_fightingillini:DBEvents:FOOTBALL');
        debug('DB Football Result: %v', events);
    })
    .catch(error => console.error('DB Football Error: %s', error));
