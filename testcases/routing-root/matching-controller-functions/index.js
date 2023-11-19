module.exports = { controller, get, post, patch, del }

function controller(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `controller`
}

function get(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `get`
}

function post(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `post`
}

function patch(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `patch`
}

function del(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `delete`
}
