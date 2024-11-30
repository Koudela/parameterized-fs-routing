export { controller }

async function controller(req, res, next) {
    return `index.mjs_`+await next()
}
