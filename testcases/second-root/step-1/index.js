module.exports = { controller: index }

async function index(req, res, next) {
    return 'step-2.1_'+ await next()
}
