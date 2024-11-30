module.exports = { controller: index }

async function index(req, res, next) {
    return 'second-root_'+await next()
}
