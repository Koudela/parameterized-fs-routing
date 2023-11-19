module.exports = { controller, post }

// will be called if it is not a POST request
function controller(req, res, next, route, routes) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    const accountId = route.args['account-id']

    return `Hello world from account ${ accountId }!`
}

async function post(req, res, next) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    // wait 500 milliseconds and then call the next controller
    return await (new Promise(resolve => setTimeout(() => {
        resolve(next())
    }, 500)))
}
