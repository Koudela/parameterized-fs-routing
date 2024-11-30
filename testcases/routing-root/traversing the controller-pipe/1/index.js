module.exports = { controller: index }

async function index(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `stop`
}
