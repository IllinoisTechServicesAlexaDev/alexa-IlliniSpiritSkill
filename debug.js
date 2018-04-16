/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/* eslint no-throw-literal: "error"*/


'use strict';
const createDebug = require('debug'),
    util = require('util');

createDebug.formatters.v = (v) => {
    return util.inspect(v, {
        depth: 4,
        maxArrayLength: null,
    });
};

module.exports = createDebug;
