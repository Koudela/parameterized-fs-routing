module.exports = { controller: index }

async function index(req, res, next) {
    return `index.cjs_`+await next()
}
