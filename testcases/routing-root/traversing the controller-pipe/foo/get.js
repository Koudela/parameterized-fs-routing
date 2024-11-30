'use strict'

module.exports = { get }

function get(req, res, next) {
    return next('bar')
}