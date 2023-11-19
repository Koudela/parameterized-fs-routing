/**
 * parameterized-fs-routing
 * filesystem based routing engine
 *
 * @package parameterized-fs-routing
 * @link https://github.com/Koudela/parameterized-fs-routing/
 * @copyright Copyright (c) 2022 Thomas Koudela
 * @license http://opensource.org/licenses/MIT MIT License
 */

(function(exports) {
    'use strict'

    const fs = require('fs')
    let cache = {}
    
    const keyParam = '#p'
    const keyFiles = '#f'
    const O = Object
    const keys = O.keys

    function isNull(obj) {
        return obj === null
    }

    function isFnc(fnc) {
        return typeof fnc === 'function'
    }

    function isDir(fullPath) {
        return fs.statSync(fullPath).isDirectory()
    }

    function isJSFile(path) {
        const parts = path.split('.', 2)

        return parts[1] === 'js' || parts[1] === 'mjs' || parts[1] === 'cjs'
    }

    function isValidPath(path, method) {
        const parts = path.split('.', 2)

        return (parts[0] === 'index' || parts[0] === method) && isJSFile(path)
    }

    function cloneObject(obj) {
        return O.assign({}, obj)
    }

    function cloneArray(arr) {
        return Array.from(arr)
    }

    function extractRoutesRecursive(cache, urlParts, method, args) {
        const params = cloneArray(urlParts)
        const urlPart = (urlParts.shift() ?? '').toLowerCase()

        const routesFirstOrder = (cache[keyFiles] ?? []).reduce((routes, obj) => {
            if (isValidPath(obj.name, method)) {
                routes.push({ path: obj.fullPath, params, args: cloneObject(args) });
            }

            return routes
        }, [])

        const routesSecondOrder =  !(urlPart in cache) ? []
            : extractRoutesRecursive(cache[urlPart], cloneArray(urlParts), method, cloneObject(args))

        const routesThirdOrder = (cache[keyParam] ?? []).reduce((routes, obj) => {
            args[obj.name] = urlPart
            routes = routes.concat(extractRoutesRecursive(obj.cache, cloneArray(urlParts), method, cloneObject(args)));

            return routes
        }, [])

        return [].concat(routesFirstOrder, routesSecondOrder, routesThirdOrder)
    }

    async function buildCacheRecursive(startPath, cache, urlParts=null) {
        if (!isNull(urlParts)) urlParts = cloneArray(urlParts)
        const isProd = isNull(urlParts)
        const urlPart = isNull(urlParts) ? null : (urlParts.shift() ?? '').toLowerCase();

        cache[keyParam] = []
        cache[keyFiles] = []

        await Promise.all((await fs.promises.readdir(startPath)).map(async (path) => {
            const fullPath = startPath + '/' + path

            if (isDir(fullPath)) {
                if (path.charAt(0) === ':') {
                    cache[keyParam].push({
                        name: path.slice(1),
                        cache: await buildCacheRecursive(fullPath, {}, urlParts),
                    })
                } else if (isProd || urlPart === path) {
                    cache[path] = await buildCacheRecursive(fullPath, {}, urlParts)
                }
            } else if (isJSFile(path)) {
                cache[keyFiles].push({
                    name: path,
                    fullPath,
                })

                if (isProd) {
                    if (fullPath.endsWith('.mjs')) {
                        await import(fullPath)
                    } else {
                        require(fullPath)
                    }
                }
            }
        }))

        return cache
    }

    async function extractRoutes(routesDir, url, method, isProd) {
        const path = url.split('?', 2)[0]
        const urlParts = path.split('/').filter((value) => { return value !== ''; })

        if (isProd && !(routesDir in cache)) {
            cache[routesDir] = await buildCacheRecursive(routesDir, {})
        }

        const cachePart = isProd ? cache[routesDir] : await buildCacheRecursive(routesDir, {}, cloneArray(urlParts))

        return extractRoutesRecursive(cachePart, urlParts, method, {})
    }

    function* iterator(routes) {
        for (let i=0; i<routes.length; i++) {
            yield routes[i];
        }
    }

    async function next(iter, req, res, ctrlName, routes, isProd) {
        const nextFnc = async () => await next(iter, req, res, ctrlName, routes, isProd)
        const obj = iter.next()

        if (!obj.done) {
            const route = obj.value

            if (!isProd) {
                delete require.cache[route.path]
            }

            let file;

            if (route.path.endsWith('.mjs')) {
                file = await import(route.path)
            } else {
                file = require(route.path)
            }

            const firstOrderCtrlFnc = file[ctrlName]

            if (isFnc(firstOrderCtrlFnc)) {
                return await firstOrderCtrlFnc(req, res, nextFnc , route, routes)
            }

            const secondOrderCtrlFnc = file['controller']

            if (isFnc(secondOrderCtrlFnc)) {
                return await secondOrderCtrlFnc(req, res, nextFnc, route, routes)
            }

            return await nextFnc()
        }

        return ''
    }

    function extractCtrlName(method) {
        return method !== 'delete' ? method : 'del'
    }

    async function warmupCache(routingDirectories) {
        for (const routesDir of routingDirectories) {
            cache[routesDir] = await buildCacheRecursive(routesDir, {})
        }
    }

    /**
     * @param {string[]} routingDirectories
     */
    exports.init = async function(routingDirectories) {
        const isProd = process.env.NODE_ENV === 'production'

        if (isProd) await warmupCache(routingDirectories)

        return async (req, res) => {
            const url = decodeURIComponent(req.url)
            const method = req.method.toLowerCase()
            const ctrlName = extractCtrlName(method)
            const routes = []

            for (const routesDir of routingDirectories) {
                routes.push(...await extractRoutes(routesDir, url, method, isProd) ?? [])
            }

            if (routes.length) {
                const iter = iterator(routes)

                return next(iter, req, res, ctrlName, routes, isProd)
            }
        }
    }
})(exports)
