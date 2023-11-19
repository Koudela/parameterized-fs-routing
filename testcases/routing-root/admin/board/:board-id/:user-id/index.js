module.exports = { controller: index }

async function index(req, res, next, route) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return JSON.stringify(route.args)+ await next()
}
