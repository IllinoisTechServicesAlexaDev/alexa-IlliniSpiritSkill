/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/

const fi = require('./fightingillini.js'),
    debug = require('./debug.js')('test_fightingillini');

fi.getAllEvents()
    .then(events => {
        debug('Events Result: %v', events);
    })
    .catch(error => console.error('Events Error: %s', error));

fi.getNextEvents('TRACK_AND_FIELD')
    .then(events => {
        debug('Track and Field Result: %v', events);
    })
    .catch(error => console.error('Track and Field Error: %s', error));
