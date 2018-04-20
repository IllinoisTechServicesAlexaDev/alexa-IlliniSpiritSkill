/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/

const fi = require('./fightingillini.js'),
    util = require('util');

function _inspect(v) {
    return util.inspect(v, {
        depth: 4,
        maxArrayLength: null,
    });
}


fi.getAllEvents()
    .then(events => {
        console.group('All Events Result');
        for (const [sportName, sportEvents] of events) {
            console.group(`${sportName}:`);
            sportEvents.forEach((event, eventIdx) => console.info('%d. %s', eventIdx, _inspect(event)));
            console.groupEnd();
        }
        console.groupEnd();
    })
    .catch(error => console.error('All Events Error: %s', error));

fi.getNextEvents('TRACK_AND_FIELD')
    .then(events => {
        console.group('Next Track and Field Result');
        for (const [sportName, sportEvent] of events) {
            console.group(`${sportName}:`);
            if (sportEvent)
                console.info(_inspect(sportEvent));
            else
                console.info('No event found.');
            console.groupEnd();
        }
        console.groupEnd();
    })
    .catch(error => console.error('Track and Field Error: %s', error));

fi._getEventsFromRSS('FOOTBALL')
    .then(events => {
        console.group('RSS Football Result');
        events.forEach((event, eventIdx) => console.info('%d. %s', eventIdx, _inspect(event)));
        console.groupEnd();
    })
    .catch(error => console.error('RSS Football Error: %s', error));

fi._getEventsFromDB('FOOTBALL')
    .then(events => {
        console.group('DB Football Result');
        events.forEach((event, eventIdx) => console.info('%d. %s', eventIdx, _inspect(event)));
        console.groupEnd();
    })
    .catch(error => console.error('DB Football Error: %s', error));
