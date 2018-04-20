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


'use strict';
const debug = require('./debug.js')('index'),
    fightingillini = require('./fightingillini.js'),
    moment = require('moment-timezone'),
    xmlesc = require('xml-escape'),
    Alexa = require('alexa-sdk');

const APP_ID = (process.env.APP_ID || 'amzn1.ask.skill.ebff67a3-eae9-4452-9a6a-74196ee1f419');
const APP_DYNAMODB = (process.env.APP_DYNAMODB || 'alexa-IlliniSpiritSkill-SessionAttributes');
const APP_TIMEZONE = (process.env.APP_TIMEZONE || 'America/Chicago');
const APP_TIMEZONE_NAME = (process.env.APP_TIMEZONE_NAME || 'Central');

const SKILL_NAME = 'Illini Spirit';
const HELP_MESSAGE = 'Hail Alma Mater. You can say i.l.l. or i.n.i, or, you can ask me to sing, or, you can ask about upcoming events, or, you can say exit... show me your school spirit!';
const HELP_REPROMPT = 'Show me your school spirit!';
const STOP_MESSAGE = 'Go Illini!';

const SONGS = [
    xmlesc(`Hail to the Orange...
    Hail to the Blue...
    Hail Alma Mater...
    Ever so true...
    We love no other...
    So let our motto be...
    Victory! Illinois! Varsity!`),

    xmlesc(`Old Princeton yells her tiger...
    Wisconsin her varsity...
    And they give the same old Rah...
    Rah Rah...
    At each university...
    But the yell that always thrills me...
    And fills my heart with joy...
    Is the good old Oskee-wow-wow...
    That they yell at Illinois.

    Oskee-wow-wow, Illinois...
    Our eyes are all on you...
    Oskee-wow-wow, Illinois...
    Wave your Orange and Blue, Rah! Rah...
    When your team trots out before you...
    Ev'ry man stand up and yell...
    Back the team to gain a victory...
    Oskee-wow-wow, Illinois!`),
];

// TODO: make this a translation lookup
const SPORTS_NAME2SPEECH = new Map([
    ['BASEBALL',                'baseball'],
    ['FOOTBALL',                'football'],
    ['MENS_BASKETBALL',         'mens basketball'],
    ['MENS_CROSS_COUNTRY',      'mens cross country'],
    ['MENS_GOLF',               'mens golf'],
    ['MENS_GYMNASTICS',         'mens gymnastics'],
    ['MENS_TENNIS',             'mens tennis'],
    ['MENS_TRACK_AND_FIELD',    'mens track and field'],
    ['SOCCER',                  'soccer'],
    ['SOFTBALL',                'softball'],
    ['SWIM_AND_DIVE',           'swim and dive'],
    ['VOLLEYBALL',              'volleyball'],
    ['WOMENS_BASKETBALL',       'womens basketball'],
    ['WOMENS_CROSS_COUNTRY',    'womens cross country'],
    ['WOMENS_GOLF',             'womens golf'],
    ['WOMENS_GYMNASTICS',       'womens gymnastics'],
    ['WOMENS_TENNIS',           'womens tennis'],
    ['WOMENS_TRACK_AND_FIELD',  'womens track and field'],
    ['WRESTLING',               'wrestling'],
]);



/**
 * Tries to get a matched resolution for the slot, or if that fails then it
 * returns the spoken value with a null id. If there was no spoken value then
 * null is returned.
 */
function _getResolutionOrValue(slot) {
    if (!slot || !slot.value)
        return null;

    if (!slot.resolutions || !slot.resolutions.resolutionsPerAuthority)
        return {
            name: slot.value,
            id: null,
        };

    const resolutions = (slot.resolutions || {}).resolutionsPerAuthority || [];
    for (const resolution of resolutions) {
        debug('looking at resolution: %v', resolution);
        try {
            const values = resolution.values || [];
            if (!values.length) {
                debug('no values for the resolution; skipping');
                continue;
            }

            const status = resolution.status.code;
            if (status == 'ER_SUCCESS_MATCH') {
                debug('found a resolution value: %s', values[0].value);
                return values[0].value;
            } else {
                debug('not a resolution match: %s', status);
            }
        } catch (resolutionErr) {
            console.trace('exception when processing a slot resolution: %s', resolutionErr);
        }
    }

    return {
        name: slot.value,
        id: null,
    };
}


const handlers = {
    'BloodIntent': function () {
        this.emit(':tell', 'Every true Illini bleeds Orange and Blue.');
    },

    'ILLIntent': function () {
        this.response.cardRenderer(SKILL_NAME, "ILL-INI");
        this.emit(':tell', "i.n.i.");
    },

    'INIIntent': function () {
        this.response.cardRenderer(SKILL_NAME, "ILL-INI");
        this.emit(':tell', "i.l.l.");
    },

    'NextEventIntent': async function () {
        const intent = this.event.request.intent;
        const slots = intent.slots || {};

        const sportNameValue = _getResolutionOrValue(slots.sportName) || { name: '', id: null };
        if (!fightingillini.hasSport(sportNameValue.id)) {
            this.emit(':tell', xmlesc(`Sorry, I am unable to find a sport named ${sportNameValue.name}`));
            return;
        }

        const events = await fightingillini.getNextEvents(sportNameValue.id);
        if (!events.size) {
            this.emit(':tell', xmlesc(`Sorry, I was unable to get events for ${sportNameValue.name}`));
            return;
        }

        let speechOutput = [];
        for (const [_sportName, _event] of events) {
            const _sportNameSpeech = SPORTS_NAME2SPEECH.get(_sportName);
            if (_event) {
                const _eventBegin = moment.tz(_event.date.begin, APP_TIMEZONE)
                    .format(`[on] dddd, MMMM Do, [at] hh:mm A [${APP_TIMEZONE_NAME}]`);

                let _eventOutput = `The next ${_sportNameSpeech} event is ${_eventBegin}, ${_event.title}`;
                if (_event.location)
                    _eventOutput = _eventOutput + `, at ${_event.location}`;
                _eventOutput = _eventOutput + '.';
                speechOutput.push(_eventOutput);
            } else if (sportNameValue.id) {
                // Only output an 'unable to find event' if we aren't
                // listing all the next events
                speechOutput.push(`I wasn't able to find any upcoming events for ${_sportNameSpeech}.`)
            }
        }

        this.response.speak(xmlesc(speechOutput.join(' ')));
        this.emit(':responseReady');
    },

    'SingIntent': function () {
        // Record what songs we haven't used so the user doesn't get the same
        // one over and over again.
        let songs = this.attributes['songs'];
        if (!songs || !songs.length)
            songs = this.attributes['songs'] = SONGS.slice();

        const songIndex = Math.floor(Math.random() * songs.length);
        const song = songs[songIndex];
        songs.splice(songIndex, 1);

        this.emit(':tell', song);
    },

    'LaunchRequest': function () {
        this.emit('AMAZON.HelpIntent');
    },

    'SessionEndedRequest': function () {
        this.emit(':tell', STOP_MESSAGE);
    },

    'AMAZON.HelpIntent': function () {
        this.emit(':ask', HELP_MESSAGE, HELP_REPROMPT);
    },

    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },

    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
};

exports.handler = (event, context, callback) => {
    const alexa = Alexa.handler(event, context, callback);

    alexa.APP_ID = APP_ID;
    alexa.dynamoDBTableName = APP_DYNAMODB;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
