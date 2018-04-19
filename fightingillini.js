/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/


'use strict';
const _createDebug = require('./debug.js'),
    rp = require('request-promise-native'),
    util = require('util'),
    xml2js = require('xml2js');

const debug = _createDebug('fightingillini');
const package_json = require('./package.json');

const USER_AGENT = `${package_json.name}/${package_json.version}`;

const EVENTS_RSS_SCHEDULE = 'http://fightingillini.com/calendar.ashx/calendar.rss';
const EVENT_TITLE_RE = /^(?:\d+\/\d+\s+(?:\d+:\d+\s+(?:AM|PM)\s+)?)?(?:\[.\]\s+)?(?:University\s+of\s+(?=Illinois))?(.+)$/i;

const SPORTS_BOTH = new Map([
    ['BASKETBALL',      ['MENS_BASKETBALL', 'WOMENS_BASKETBALL']],
    ['CROSS_COUNTRY',   ['MENS_CROSS_COUNTRY', 'WOMENS_CROSS_COUNTRY']],
    ['GOLF',            ['MENS_GOLF', 'WOMENS_GOLF']],
    ['GYMNASTICS',      ['MENS_GYMNASTICS', 'WOMENS_GYMNASTICS']],
    ['TENNIS',          ['MENS_TENNIS', 'WOMENS_TENNIS']],
    ['TRACK_AND_FIELD', ['MENS_TRACK_AND_FIELD', 'WOMENS_TRACK_AND_FIELD']],
]);
const SPORTS_NAME2ID = new Map([
    ['BASEBALL',                1],
    ['FOOTBALL',                2],
    ['MENS_BASKETBALL',         5],
    ['MENS_CROSS_COUNTRY',      25],
    ['MENS_GOLF',               16],
    ['MENS_GYMNASTICS',         6],
    ['MENS_TENNIS',             7],
    ['MENS_TRACK_AND_FIELD',    28],
    ['SOCCER',                  13],
    ['SOFTBALL',                9],
    ['SWIM_AND_DIVE',           14],
    ['VOLLEYBALL',              17],
    ['WOMENS_BASKETBALL',       10],
    ['WOMENS_CROSS_COUNTRY',    26],
    ['WOMENS_GOLF',             11],
    ['WOMENS_GYMNASTICS',       12],
    ['WOMENS_TENNIS',           15],
    ['WOMENS_TRACK_AND_FIELD',  27],
    ['WRESTLING',               18],
]);

const STATE_ABBR2NAME = new Map([
    ['Alabama',             /\b(AL|Ala\.)(?=(\W|$))/],
    ['Alaska',              /\b(AK|Alas\.)(?=\W|$)/],
    ['Arizona',             /\b(AZ|Ariz\.)(?=\W|$)/],
    ['Arkansas',            /\b(AR|Ark\.)(?=\W|$)/],
    ['California',          /\b(CA|(?:Calif|Cal)\.)(?=\W|$)/],
    ['Colorado',            /\b(CO|Colo?\.)(?=\W|$)/],
    ['Connecticut',         /\b(CT|Conn\.)(?=\W|$)/],
    ['Delaware',            /\b(DE|Del\.)(?=\W|$)/],
    ['Washington D.C.',     /\b(DC|D\.C\.)(?=\W|$)/],
    ['Florida',             /\b(FL|(?:Fla|Flor)\.)(?=\W|$)/],
    ['Georgia',             /\b(GA|Ga\.)(?=\W|$)/],
    ['Hawaii',              /\b(HI|H\.I\.)(?=\W|$)/],
    ['Idaho',               /\b(ID|Ida?\.)(?=\W|$)/],
    ['Illinois',            /\b(IL|Ill\.)(?=\W|$)/],
    ['Indiana',             /\b(IN|Ind\.)(?=\W|$)/],
    ['Iowa',                /\b(IA|Ia\.)(?=\W|$)/],
    ['Kansas',              /\b(KS|Kans?\.)(?=\W|$)/],
    ['Kentucky',            /\b(KY|(?:Ky|Kent?)\.)(?=\W|$)/],
    ['Louisiana',           /\b(LA|La\.)(?=\W|$)/],
    ['Maine',               /\b(ME|Me\.)(?=\W|$)/],
    ['Maryland',            /\b(MD|Md\.)(?=\W|$)/],
    ['Massachusetts',       /\b(MA|Mass\.)(?=\W|$)/],
    ['Michigan',            /\b(MI|Mich\.)(?=\W|$)/],
    ['Minnesota',           /\b(MN|Minn\.)(?=\W|$)/],
    ['Mississippi',         /\b(MS|Miss\.)(?=\W|$)/],
    ['Missouri',            /\b(MO|Mo\.)(?=\W|$)/],
    ['Montana',             /\b(MT|Mont\.)(?=\W|$)/],
    ['Nebraska',            /\b(NE|Nebr?\.)(?=\W|$)/],
    ['Nevada',              /\b(NV|Nev\.)(?=\W|$)/],
    ['New Hampshire',       /\b(NH|N\.H\.)(?=\W|$)/],
    ['New Jersey',          /\b(NJ|N\.J\.)(?=\W|$)/],
    ['New Mexico',          /\b(NM|N\.(?:\s*Mex|M)\.|New\s+M\.)(?=\W|$)/],
    ['New York',            /\b(NY|N\.Y\.)(?=\W|$)/],
    ['North Carolina',      /\b(NC|N\.C\.)(?=\W|$)/],
    ['North Dakota',        /\b(ND|N\.(?:\s*Dak|D)\.)(?=\W|$)/],
    ['Ohio',                /\b(OH|O\.)(?=\W|$)/],
    ['Oklahoma',            /\b(OK|Okla\.)(?=\W|$)/],
    ['Oregon',              /\b(OR|Oreg?\.)(?=\W|$)/],
    ['Pennsylvania',        /\b(PA|(?:Pa|Penna?)\.)(?=\W|$)/],
    ['Rhode Island',        /\b(RI|R\.I\.)(?=\W|$)/],
    ['South Carolina',      /\b(SC|S\.C\.)(?=\W|$)/],
    ['South Dakota',        /\b(SD|S\.(?:\s*Dak|D)\.)(?=\W|$)/],
    ['Tennessee',           /\b(TN|Tenn\.)(?=\W|$)/],
    ['Texas',               /\b(TX|Tex\.)(?=\W|$)/],
    ['Utah',                /\b(UT)(?=\W|$)/],
    ['Vermont',             /\b(VT|Vt\.)(?=\W|$)/],
    ['Virginia',            /\b(VA|Va\.)(?=\W|$)/],
    ['Washington',          /\b(WA|Wash\.)(?=\W|$)/],
    ['West Virginia',       /\b(WV|W\.(?:\s*Va|V)\.)(?=\W|$)/],
    ['Wisconsin',           /\b(WI|Wisc?\.)(?=\W|$)/],
    ['Wyoming',             /\b(WY|Wyo\.)(?=\W|$)/],
]);


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

class Event {
    static fromRSSItem(item, han = null) {
        this.debug('processing item %v', item);

        let itemValid = true;
        for (const key of ['ev:startdate', 'ev:enddate', 'title', 'guid']) {
            if (!(key in item && item[key])) {
                this.debug('missing required element %s for item.', key);
                itemValid = false;
            }
        }
        if (!itemValid)
            throw new Error('item is invalid');

        let title = item.title.trim();
        let titleMatch = EVENT_TITLE_RE.exec(title);
        if (titleMatch)
            title = titleMatch[1].trim();

        let location = item['ev:location'] || '';
        for (const [stateName, stateAbbr] of STATE_ABBR2NAME) {
            const stateMatch = stateAbbr.exec(location);
            if (stateMatch) {
                this.debug('replacing state abbr %s with %s', stateMatch[1], stateName);
                location = location.replace(stateAbbr, stateName);
                break;
            }
        }
        // Somtimes the location gets repeated (???). Fix this
        // case.
        location = location.replace(/^\s*(.+?)\s*,\s+\1\s*$/, '$1');

        let description = (item['description'] || '').split(/\\n/).map(line => line.trim());
        let guid = item['guid'];
        if (guid.hasOwnProperty('_'))
            guid = guid._;

        const event = new this();
        event.guid = guid;
        event.date = {
            'begin': new Date(item['ev:startdate']),
            'end': new Date(item['ev:enddate']),
        };
        event.title = title;
        event.location = location.trim();
        event.description = description;
        event.link = (item['link'] || null);
        event.logo = {
            'team': (item['s:teamlogo'] || null),
            'opponent': (item['s:opponentlogo'] || null),
        };
        event.han = han;

        return event;
    }
}

Event.debug = _createDebug('fightingillini:Event');

function _unmarshalDBValue(value) {
    for (const type in ['S', 'N', 'B']) {
        if (type in value)
            return value[type];
    }

    for (const type in ['SS', 'NS', 'BS']) {
        if (type in value)
            return Set(value[type]);
    }

    if ('M' in value) {
        const rv = {};
        for (const prop in value.M.getOwnPropertyNames())
            rv[prop] = _unmarshalDBValue(value.M[prop]);
        return rv;
    } else if ('L' in value)
        return value.L.map(v => _unmarshalDBValue(v))
    else if (value.NULL)
        return null;
    else if ('BOOL' in value)
        return value.BOOL;

    throw new Error('unknown value type for %s', util.inspect(value));
}

function _compareEvents(a, b) {
    const [aBeginTime, bBeginTime] =
        [a.date.begin.getTime(), b.date.begin.getTime()];

    if (aBeginTime < bBeginTime)
        return -1;
    else if (aBeginTime > bBeginTime)
        return 1;

    return 0;
}

function _isEqualEvents(a, b) {
    if (!a || !b)
        return false;

    return (
        a.guid === b.guid &&
        a.date.begin.getTime() === b.date.begin.getTime() &&
        a.date.end.getTime() === b.date.end.getTime() &&
        a.title === b.title &&
        a.location === b.location &&
        a.description === b.description &&
        a.link === b.link &&
        a.logo.team === b.logo.team &&
        a.logo.opponent === b.logo.opponent &&
        a.han === b.han
    );
}

function _buildEventsFromJSON(data, han = null) {
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
            events.push(Event.fromRSSItem(item));
        } catch (itemErr) {
            console.trace('exception thrown when constructing event: %s', itemErr);
        }
    }

    return events;
}

async function _getEventsFromDB() {

}
async function _getEventsFromRSS(sportName, hanValues = ['H', 'A', 'N']) {
    const sportID = SPORTS_NAME2ID.get(sportName);

    let responses;
    {
        const promises = [];
        for (const han of hanValues) {
            debug('fetching events from %s?sport_id=%s&han=%s',
                EVENTS_RSS_SCHEDULE,
                sportID,
                han,
            );
            promises.push(
                rp({
                    uri: EVENTS_RSS_SCHEDULE,
                    qs: {
                        sport_id: sportID,
                        han: han,
                    },
                    headers: {
                        'User-Agent': USER_AGENT,
                    },
                    resolveWithFullResponse: true,
                }).catch(error => { return (error instanceof Error) ? error : new Error(error) })
            );
        }
        responses = await Promise.all(promises);
    }

    let jsons = [];
    {
        const xml2js_parseString = util.promisify(xml2js.parseString);
        const promises = [];
        for (const response of responses) {
            if (response instanceof Error) {
                promises.push(Promise.resolve(response));
            } else {
                promises.push(
                    xml2js_parseString(
                        response.body,
                        {
                            async: true,
                            explicitRoot: true,
                            explicitCharkey: false,
                            explicitArray: false,
                        }
                    ).catch(error => { return (error instanceof Error) ? error : new Error(error) })
                );
            }
        }
        jsons = await Promise.all(promises);
    }

    const events = [];
    hanValues.forEach((hanValue, hanIdx) => {
        try {
            const hanJSON = jsons[hanIdx];
            if (hanJSON instanceof Error)
                throw hanJSON;

            if (hanJSON)
                events.push(..._buildEventsFromJSON(hanJSON, hanValue));
        } catch (hanErr) {
            console.trace('exception building events from JSON: %s', hanErr);
        }
    });

    return events;
}

async function _getEvents(sportID, han, sortEvents = true) {
    sportID = (sportID || '');
    han = (han || '');

    debug('fetching events from %s?sport_id=%s&%han=%s',
        EVENTS_RSS_SCHEDULE,
        sportID,
        han,
    );
    let response = await rp({
        uri: EVENTS_RSS_SCHEDULE,
        qs: {
            sport_id: sportID,
            han: han,
        },
        headers: {
            'User-Agent': USER_AGENT,
        },
        resolveWithFullResponse: true,
    });

    let data = await util.promisify(xml2js.parseString)(
        response.body,
        {
            async: true,
            explicitRoot: true,
            explicitCharkey: false,
            explicitArray: false,
        }
    );

    // The events are probably returned sorted, but just to make sure...
    const events = _buildEventsFromJSON(data);
    if (sortEvents)
        events.sort(_compareEvents);

    return events;
}

function _sportNameExpand(value) {
    if (!value)
        return SPORTS_NAME2ID.keys();
    else if (SPORTS_BOTH.has(value))
        return SPORTS_BOTH.get(value);
    else
        return value;
}

function _sportName2IDs(value) {
    const rv = new Map();
    if (!value) {
        rv.set('', '');
        return rv;
    }

    const sportNames = SPORTS_BOTH.has(value)
        ? SPORTS_BOTH.get(value)
        : [value];
    for (const name of sportNames) {
        if (SPORTS_NAME2ID.has(name))
            rv.set(name, SPORTS_NAME2ID.get(name));
        else
            console.warn('unable to map sport name %s to ID: does not exist', name);
    }

    return rv
}

/**
 * Get all the events for a sport, by the sport name. This will return a Map
 * keyed by sport name with values being an array of sorted events. If
 * returning all sports then the key is ''.
 *
 * Note that multiple sports might be returned for a single name if it is a
 * generic sport played by both genders.
 */
async function getAllEvents(sportName) {
    const promises = [];
    for (const sport of _sportName2IDs(sportName)) {
        const _f = async () => {
            const _events = await _getEvents(sport[1], '', true);
            return [sport[0], _events];
        };
        promises.push(_f());
    }

    return new Map(await Promise.all(promises));
}

/**
 * Get the next event for a sport, by the sport name. This will return a Map
 * keyed by the sport name with values being the next event (or null if there
 * are no more events). If returning an event for any sport then the key is ''.
 *
 * Note that multiple sports might be returned for a single name if it is a
 * generic sport played by both genders.
 */
async function getNextEvents(sportName) {
    const now = Date.now();

    const promises = [];
    for (const sport of _sportName2IDs(sportName)) {
        const _f = async () => {
            const _events = await _getEvents(sport[1], '', true);
            for (const _event of _events) {
                if (_event.date.begin.getTime() >= now) {
                    debug('found next event for %s: %v', sport[0], _event);
                    return [sport[0], _event];
                }
            }

            debug('did not fing next event for %s', sport[0]);
            return [sport[0], null];
        }
        promises.push(_f());
    }

    return new Map(await Promise.all(promises));
}

/**
 * Check if the name is a sport that we know about. Returns true or false.
 */
function hasSport(sportName) {
    return !sportName || SPORTS_NAME2ID.has(sportName) || SPORTS_BOTH.has(sportName);
}

module.exports = {
    _getEventsFromRSS: _getEventsFromRSS,
    getAllEvents: getAllEvents,
    getNextEvents: getNextEvents,
    hasSport: hasSport,
};
