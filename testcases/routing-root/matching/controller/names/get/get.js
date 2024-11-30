module.exports = { controller: index }

async function index(req, res, next) {
    return `get.js_`+await next()
}
