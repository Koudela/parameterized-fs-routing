module.exports = { get }

function get(req, res, next, route, routes) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    res.end(
        req.url
        + '_' + typeof next === 'function' ? 'function' : 'other'
        + '_' + JSON.stringify(route)
        + '_' + JSON.stringify(routes)
    )
}