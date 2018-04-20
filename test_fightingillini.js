/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/

/*
 * Copyright (c) 2018 University of Illinois Board of Trustees
 * All rights reserved.
 *
 * Developed by:   Technology Services
 *                 University of Illinois at Urbana Champaign
 *                 https://techservices.illinois.edu/
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal with the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 *     - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimers.
 *
 *     - Redistributions in binary form must reproduce the above
 *     copyright notice, this list of conditions and the following
 *     disclaimers in the documentation and/or other materials provided
 *     with the distribution.
 *
 *     - Neither the names of Technology Services, University of Illinois
 *     at Urbana-Champaign, nor the names of its contributors may be used
 *     to endorse or promote products derived from this Software without
 *     specific prior written permission.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE CONTRIBUTORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS WITH THE SOFTWARE.
 */


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
