module.exports = { controller: index }

async function index(req, res, next) {
    return `index.js_`+await next()
}
