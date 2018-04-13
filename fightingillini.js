/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/


'use strict';
const rp = require('request-promise-native');
const util = require('util');
const xml2js = require('xml2js');

const package_json = require('./package.json');

const USER_AGENT = `${package_json.name}/${package_json.version}`;

const EVENTS_RSS_SCHEDULE = 'http://fightingillini.com/calendar.ashx/calendar.rss';
const EVENT_TITLE_RE = /^(?:\d+\/\d+\s+(?:\d+:\d+\s+(?:AM|PM)\s+)?)?(?:\[.\]\s+)?(?:University\s+of\s+(?=Illinois))?(.+)$/i;

const SPORTS_BOTH = {
    'basketball': ['mens basketball', 'womens basketball'],
    'cross country': ['mens cross country', 'womens cross country'],
    'golf': ['mens golf', 'womens golf'],
    'gymnastics': ['mens gymnastics', 'womens gymnastics'],
    'tennis': ['mens tennis', 'womens tennis'],
    'track and field': ['mens track and field', 'womens track and field'],
};
const SPORTS_NAME2ID = {
    'baseball': 1,
    'football': 2,
    'mens basketball': 5,
    'mens cross country': 25,
    'mens golf': 16,
    'mens gymnastics': 6,
    'mens tennis': 7,
    'mens track and field': 28,
    'soccer': 13,
    'softball': 9,
    'swim and dive': 14,
    'volleyball': 17,
    'womens basketball': 10,
    'womens cross country': 26,
    'womens golf': 11,
    'womens gymnastics': 12,
    'womens tennis': 15,
    'womens track and field': 27,
    'wrestling': 18,
};


class RSSError extends Error {
    constructor(message, url) {
        super(message);
        Error.captureStackTrace(this, RSSError);

        this._url = url;
    }

    get url() {
        return this._url;
    }
}

async function getEvents(sportID, location) {
    let response = await rp({
        uri: EVENTS_RSS_SCHEDULE,
        qs: {
            sport_id: (sportID || ''),
            han: (location || ''),
        },
        headers: {
            'User-Agent': USER_AGENT,
        },
        resolveWithFullResponse: true,
    });

    let data = await util.promisify(xml2js.parseString)(
        response.body,
        {
            explicitRoot: true,
            explicitCharkey: false,
            explicitArray: false,
        }
    );

    // Required RSS elements for this to work
    if (!data)
        throw new RSSError('no rss data', EVENTS_RSS_SCHEDULE);
    if (!data.rss)
        throw new RSSError('no rss node', EVENTS_RSS_SCHEDULE);
    if (!data.rss.channel)
        throw new RSSError('no channel nodes', EVENTS_RSS_SCHEDULE);

    const channel = Array.isArray(data.rss.channel)
        ? data.rss.channel[0]
        : data.rss.channel;

    // No items just means an empty result
    if (!channel.item)
        return [];

    const items = Array.isArray(channel.item) ? channel.item : [channel.item];
    const events = [];
    for (const item of items) {
        try {
            let itemValid = true;
            for (const key of ['ev:startdate', 'ev:enddate', 'title']) {
                if (!(key in item && item[key])) {
                    console.warn('Missing required element %s for item.', key);
                    itemValid = false;
                }
            }
            if (!itemValid)
                throw new Error('item is invalid');

            let title = item.title.trim();
            let titleMatch = EVENT_TITLE_RE.exec(title);
            if (titleMatch)
                title = titleMatch[1].trim();

            events.push({
                'date': {
                    'begin': new Date(item['ev:startdate']),
                    'end': new Date(item['ev:enddate']),
                },
                'title': title,
                'location': item['ev:location'],
            });
        } catch (itemErr) {
            console.warn('Exception thrown when constructing event (item = "%j"): %s', item, itemErr);
        }
    }

    return events;
}

function getAllEvents() {
    return getEvents();
}


module.exports = {
    getAllEvents: getAllEvents,
};
