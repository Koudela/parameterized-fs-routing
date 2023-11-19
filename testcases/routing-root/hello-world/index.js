module.exports = { controller: index }

function index(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `hello world`
}
