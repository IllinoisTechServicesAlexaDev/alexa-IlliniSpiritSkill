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
const _createDebug = require('./debug.js'),
    rp = require('request-promise-native'),
    util = require('util'),
    xml2js = require('xml2js'),
    AWS = require('aws-sdk');

const debug = _createDebug('fightingillini');
const dynamoDB = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const package_json = require('./package.json');

const USER_AGENT = `${package_json.name}/${package_json.version}`;

const EVENTS_DB_TABLE_NAME = (process.env.EVENTS_DB_TABLE_NAME || 'alexa-IlliniSpiritSkill-FightingIllini-Events');
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
    static compare(a, b) {
        const [aBeginTime, bBeginTime] =
            [a.date.begin.getTime(), b.date.begin.getTime()];

        if (aBeginTime < bBeginTime)
            return -1;
        else if (aBeginTime > bBeginTime)
            return 1;

        return 0;
    }

    static fromDBItem(dbItem) {
        this.debug('processing db item %v', dbItem);

        const item = Object.assign({}, dbItem);
        for (const key of Object.getOwnPropertyNames(item))
            item[key] = _unmarshalDBValue(item[key]);

        let itemValid = true;
        for (const key of ['SportName', 'DateBegin', 'DateEnd', 'Title', 'GUID']) {
            if (!(key in item && item[key])) {
                this.debug('missing required element %s for item.', key);
                itemValid = false;
            }
        }
        if (!itemValid)
            throw new Error('db item is invalid');

        const event = new this();
        event.sportName = item.SportName;
        event.guid = item.GUID;
        event.date = {
            'begin': new Date(item.DateBegin),
            'end': new Date(item.DateEnd),
        };
        event.title = item.Title;
        event.location = item.Location;
        event.description = item.Description;
        event.link = item.Link;
        event.logo = {
            'team': item.LogoTeam,
            'opponent': item.LogoOpponent,
        };
        event.han = item.HAN;

        return event;
    }

    static fromRSSItem(item, sportName, han = null) {
        this.debug('processing rss item (%s, %O) %v', sportName, han, item);

        let itemValid = true;
        for (const key of ['ev:startdate', 'ev:enddate', 'title', 'guid']) {
            if (!(key in item && item[key])) {
                this.debug('missing required element %s for item.', key);
                itemValid = false;
            }
        }
        if (!itemValid)
            throw new Error('rss item is invalid');

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
        event.sportName = sportName;
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

    static isEqual(a, b) {
        if (a === b)
            return true;
        if (!a || !b)
            return false;

        if (a.description.length != b.description.length)
            return false;
        if (a.description !== b.description) {
            for (let idx = 0; idx < a.description.length; idx++)
                if (a.description[idx] !== b.description[idx])
                    return false;
        }

        return (
            a.guid === b.guid &&
            a.date.begin.getTime() === b.date.begin.getTime() &&
            a.date.end.getTime() === b.date.end.getTime() &&
            a.title === b.title &&
            a.location === b.location &&
            a.link === b.link &&
            a.logo.team === b.logo.team &&
            a.logo.opponent === b.logo.opponent &&
            a.han === b.han
        );
    }


    toDBItem() {
        const item = {
            SportName: this.sportName,
            GUID: this.guid,
            Title: this.title,
            Location: this.location,
            Description: this.description,
            Link: this.link,
            LogoTeam: this.logo.team,
            LogoOpponent: this.logo.opponent,
            HAN: this.han,
        };

        for (const k of Object.getOwnPropertyNames(item))
            item[k] = _marshalDBValue(item[k]);

        item.DateBegin = _marshalDBValue(this.date.begin, 'N');
        item.DateEnd = _marshalDBValue(this.date.end, 'N');

        return item;
    }

    toDBKey() {
        return {
            SportName: _marshalDBValue(this.sportName),
            DateBegin: _marshalDBValue(this.date.begin, 'N'),
        };
    }
}

Event.debug = _createDebug('fightingillini:Event');


/**
 * Take the result of turning an XML RSS feed into JSON and construct
 * an array of events form it.
 */
function _buildEventsFromJSON(data, sportName, han) {
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
            events.push(Event.fromRSSItem(item, sportName, han));
        } catch (itemErr) {
            console.trace('exception thrown when constructing event: %s', itemErr);
        }
    }

    return events;
}

/**
 * Turn a value of native JavaScript types into a value for the DB.
 * The typeHint parameter helps in cases when the type might be hard
 * to automatically determine (sets, Date objects).
 */
function _marshalDBValue(value, typeHint = 'S') {
    const valueType = typeof(value);

    if (value === null)
        return { 'NULL': true };
    else if (valueType == 'boolean')
        return { 'BOOL': value };
    else if (valueType == 'number')
        return { 'N': value.toString() };
    else if (valueType == 'string')
        return { 'S': value };
    else if (valueType == 'object') {
        if (value instanceof Date) {
            if (typeHint == 'N')
                return { 'N': value.getTime().toString() };
            else
                return { 'S': value.toISOString() };
        } else if (value instanceof Set) {
            const s = {};
            s[`${typeHint}S`] = Array.from(value.values());

            return s;
        } else if (Array.isArray(value))
            return { 'L': value.map(v => _marshalDBValue(v)) };
        else if (value instanceof TypedArray || value instanceof ArrayBuffer || value instanceof SharedArrayBuffer || value instanceof Buffer)
            return { 'B': value };
        else if (value instanceof Map) {
            const m = {};
            for (const [k, v] of value)
                m[k] = _marshalDBValue(v);
            return { 'M': m };
        } else {
            const m = {};
            for (const k of Object.getOwnPropertyNames(value))
                m[k] = _marshalDBValue(value[k]);
            return { 'M': m };
        }
    }

    throw new Error('unknown object type: ' + util.inspect(value));
}

/**
 * Expand a sport name into its other names, if any.
 */
function _sportNameExpand(value) {
    if (!value)
        return SPORTS_NAME2ID.keys();
    else if (SPORTS_BOTH.has(value))
        return SPORTS_BOTH.get(value);
    else
        return [value];
}

/**
 * Turn a value from the DB into native JavaScript types.
 */
function _unmarshalDBValue(value) {
    for (const dbType of ['S', 'N', 'B']) {
        if (dbType in value)
            return (dbType == 'N') ? Number.parseFloat(value[dbType]) : value[dbType];
    }

    for (const dbType of ['SS', 'NS', 'BS']) {
        if (dbType in value) {
            let v = value[dbType];
            if (dbType == 'NS')
                v = v.map(v => Number.parseFloat(v));
            return new Set(v);
        }
    }

    if ('M' in value) {
        const rv = {};
        for (const prop in Object.getOwnPropertyNames(value.M))
            rv[prop] = _unmarshalDBValue(value.M[prop]);
        return rv;
    } else if ('L' in value)
        return value.L.map(v => _unmarshalDBValue(v))
    else if (value.NULL)
        return null;
    else if ('BOOL' in value)
        return value.BOOL;

    throw new Error('unknown value type: ' + util.inspect(value));
}


/**
 * Get all the events for a sport name and set of HAN values from the
 * DB. The sport name is not expanded, except in the case of ''. When
 * it is empty then a whole table scan is done, otherwise it uses a
 * query.
 */
async function _getEventsFromDB(sportName, hanValues = null, sortEvents = false) {
    hanValues = hanValues || ['H', 'A', 'N'];

    const events = [];
    const callback = items => {
        for (const item of items) {
            try {
                events.push(Event.fromDBItem(item));
            } catch (itemErr) {
                console.trace('exception thrown when constructing event: %s', itemErr);
            }
        }
    };

    if (sportName)
        await _getEventsFromDB_Query(sportName, hanValues, callback);
    else
        await _getEventsFromDB_Scan(hanValues, callback);

    if (sortEvents)
        events.sort(Event.compare);

    return events;
}

async function _getEventsFromDB_Scan(hanValues, callback) {
    let lastEvaluatedKey = null;

    const filterExpr = util.format(
        'HAN in (%s)',
        hanValues.map((v, vIdx) => `:hanVal${vIdx}`).join(', '),
    );

    const exprAttrVals = {};
    hanValues.forEach((v, vIdx) => {
        exprAttrVals[`:hanVal${vIdx}`] = _marshalDBValue(v);
    });

    do {
        var params = {
            TableName: EVENTS_DB_TABLE_NAME,
            Select: 'ALL_ATTRIBUTES',

            ExpressionAttributeValues: exprAttrVals,
            FilterExpression: filterExpr,
        };
        if (lastEvaluatedKey) {
            params['ExclusiveStartKey'] = lastEvaluatedKey;
            lastEvaluatedKey = null;
        }

        try {
            const data = await dynamoDB.scan(params).promise();
            if (data.LastEvaluatedKey)
                lastEvaluatedKey = data.LastEvaluatedKey;

            callback(data.Items || []);
        } catch (dbErr) {
            console.trace('exception thrown getting items from the database: %s', dbErr);
        }
    } while (lastEvaluatedKey);
}

async function _getEventsFromDB_Query(sportName, hanValues, callback) {
    let lastEvaluatedKey = null;

    const filterExpr = util.format(
        'HAN in (%s)',
        hanValues.map((v, vIdx) => `:hanVal${vIdx}`).join(', '),
    );

    const exprAttrVals = {
        ':sportName': _marshalDBValue(sportName),
    };
    hanValues.forEach((v, vIdx) => {
        exprAttrVals[`:hanVal${vIdx}`] = _marshalDBValue(v);
    });

    do {
        var params = {
            TableName: EVENTS_DB_TABLE_NAME,
            Select: 'ALL_ATTRIBUTES',

            ExpressionAttributeValues: exprAttrVals,
            KeyConditionExpression: 'SportName = :sportName',
            FilterExpression: filterExpr,
        };
        if (lastEvaluatedKey) {
            params['ExclusiveStartKey'] = lastEvaluatedKey;
            lastEvaluatedKey = null;
        }

        try {
            const data = await dynamoDB.query(params).promise();
            if (data.LastEvaluatedKey)
                lastEvaluatedKey = data.LastEvaluatedKey;

            callback(data.Items || []);
        } catch (dbErr) {
            console.trace('exception thrown getting items from the database: %s', dbErr);
        }
    } while (lastEvaluatedKey);
}

/**
 * Get all the events for a sport name and set of HAN values from
 * the RSS feeds. The sportName parameter will not be expanded.
 */
async function _getEventsFromRSS(sportName, hanValues = null, sortEvents = false) {
    const sportID = SPORTS_NAME2ID.get(sportName);
    hanValues = hanValues || ['H', 'A', 'N'];

    // Fetch the feeds from the server. This batches together all the
    // HAN requests in parallel.
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

    // Process the feed responses and convert the XML to a JSON format.
    // If there was an error above then just pass it along.
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

    // Look at each of the HAN results and try to build Event objects
    // from them.
    const events = [];
    hanValues.forEach((hanValue, hanIdx) => {
        try {
            const hanJSON = jsons[hanIdx];
            if (hanJSON instanceof Error)
                throw hanJSON;

            if (hanJSON)
                events.push(..._buildEventsFromJSON(hanJSON, sportName, hanValue));
        } catch (hanErr) {
            console.trace('exception building events from JSON: %s', hanErr);
        }
    });

    if (sortEvents)
        events.sort(Event.compare);
    return events;
}

/**
 * Perform a sync between the RSS feeds (master source) and the DB
 * items.
 */
async function _syncDBEvents() {
    console.group('Synchronizing DB Events');

    // Get all of the events from the RSS feeds. This launches
    // multiple request at the same time.
    const rssEvents = new Map();
    {
        console.info('Fetching events from RSS');

        const promises = [];
        for (const _name of _sportNameExpand('')) {
            promises.push(_getEventsFromRSS(_name));
        }

        const _promiseEvents = await Promise.all(promises);
        for (const _events of _promiseEvents)
            for (const _event of _events)
                rssEvents.set(_event.guid, _event);
        debug('sync fetched rss events: %v', rssEvents);
    }

    // Get all of the events from the DB.
    const dbEvents = new Map();
    {
        console.info('Fetching events from the DB');
        const _events = await _getEventsFromDB();
        for (const _event of _events)
            dbEvents.set(_event.guid, _event);
        debug('sync fetched db events: %v', dbEvents);
    }

    // Loop over each set of events and figure out what needs to be
    // added, updated (same operation as add), and removed. Store
    // the operations to be performed in the writeOps array.
    const writeOps = [];
    for (const event of rssEvents.values()) {
        if (!dbEvents.has(event.guid) || !Event.isEqual(event, dbEvents.get(event.guid)))
            writeOps.push({
                PutRequest: { Item: event.toDBItem() },
            });
    }
    for (const event of dbEvents.values()) {
        if (!rssEvents.has(event.guid))
            writeOps.push({
                DeleteRequest: { Key: event.toDBKey() },
            });
    }

    // Send batches of operations to the server. We need to loop
    // multiple times since the batch size is 25 and any of the batch
    // operations can have unprocessed items.
    debug('performing sync with writeOps: %v', writeOps);
    console.info('Performing DB updates');
    while (writeOps.length) {
        let batchWriteOps = writeOps.splice(0, 25);
        while (batchWriteOps.length) {
            const params = {
                RequestItems: {},
            };
            params.RequestItems[EVENTS_DB_TABLE_NAME] = batchWriteOps;
            batchWriteOps = [];

            debug('doing batch write with params: %v', params);
            const result = await dynamoDB.batchWriteItem(params).promise();
            if (result.UnprocessedItems && result.UnprocessedItems[EVENTS_DB_TABLE_NAME])
                batchWriteOps = result.UnprocessedItems[EVENTS_DB_TABLE_NAME];
        }
    }

    console.groupEnd();
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
    for (const _name of _sportNameExpand(sportName)) {
        const _f = async () => {
            const _events = await _getEventsFromDB(_name, null, true);
            return [_name, _events];
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
    for (const _name of _sportNameExpand(sportName)) {
        const _f = async () => {
            const _events = await _getEventsFromDB(_name, null, true);
            for (const _event of _events) {
                if (_event.date.begin.getTime() >= now) {
                    debug('found next event for %s: %v', _name, _event);
                    return [_name, _event];
                }
            }

            debug('did not find next event for %s', _name);
            return [_name, null];
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
    _Event: Event,
    _getEventsFromDB: _getEventsFromDB,
    _getEventsFromRSS: _getEventsFromRSS,
    _syncDBEvents: _syncDBEvents,

    getAllEvents: getAllEvents,
    getNextEvents: getNextEvents,
    hasSport: hasSport,
};

if (require.main === module) {
    console.info('Performing event RSS -> DB syc. This can take awhile depending on table WCU.');
    _syncDBEvents()
        .then(() => console.info('Sychronization complete'))
        .catch(error => console.error('Sychronization failed: %s', error));
}
