const service = require('./service')

module.exports = { controller }

async function controller(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return 'old '+service.result()
}
