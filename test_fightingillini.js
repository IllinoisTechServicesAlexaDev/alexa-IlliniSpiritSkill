/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/

const fi = require('./fightingillini.js');

fi.getAllEvents()
    .then(events => {
        console.log('Events Result: %j', events);
        Array.from(new Set(events.map(event => event.location))).sort().forEach(location => {
            console.log(`Location: ${location}`);
        });
    })
    .catch(error => console.error('Events Error: %s', error));
