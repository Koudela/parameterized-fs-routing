export { controller }

async function controller(req, res, next) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8')

    return `index.mjs_`+await next()
}
