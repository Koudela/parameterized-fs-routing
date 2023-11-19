module.exports = { controller: index }

async function index(req, res, next) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `get.js_`+await next()
}
