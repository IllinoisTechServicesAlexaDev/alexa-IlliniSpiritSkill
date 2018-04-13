/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/

const fi = require('./fightingillini.js');

fi.getAllEvents()
    .then(events => console.log('Events Result: %j', events))
    .catch(error => console.error('Events Error: %s', error));
