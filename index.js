/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/

'use strict';
const debug = require('./debug.js')('index'),
    Alexa = require('alexa-sdk');

const APP_ID = 'amzn1.ask.skill.ebff67a3-eae9-4452-9a6a-74196ee1f419';
const APP_DYNAMODB = 'alexa-IlliniSpiritSkill-SessionAttributes';

const SKILL_NAME = 'Illini Spirit';
const HELP_MESSAGE = 'Hail Alma Mater. You can say i.l.l. or i.n.i, or, you can ask me to sing, or, you can ask about upcoming events, or, you can say exit... show me your school spirit!';
const HELP_REPROMPT = 'Show me your school spirit!';
const STOP_MESSAGE = 'Go Illini!';

const SONGS = [
    `Hail to the Orange...
    Hail to the Blue...
    Hail Alma Mater...
    Ever so true...
    We love no other...
    So let our motto be...
    Victory! Illinois! Varsity!`,

    `Old Princeton yells her tiger...
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
    Oskee-wow-wow, Illinois!`,
];


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
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

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
