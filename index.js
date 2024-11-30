/**
 * parameterized-fs-routing
 * filesystem based routing engine
 *
 * @package parameterized-fs-routing
 * @link https://github.com/Koudela/parameterized-fs-routing/
 * @copyright Copyright (c) 2022-2025 Thomas Koudela
 * @license http://opensource.org/licenses/MIT MIT License
 */

(function(exports) {
    'use strict'

    const fetch = repository => repository.endsWith('.mjs') ? import(repository) : require(repository)
        , isNull = obj => obj === null
        , isFnc = fnc => typeof fnc === 'function'
        , cloneObject = obj => Object.assign({}, obj)
        , cloneArray = arr => Array.from(arr)
        , extractCtrlName = method => method !== 'delete' ? method : 'del'
        , some = (haystack, needle) => haystack.some(item => item === needle)
        , isJSFile = filename => some(['js', 'mjs', 'cjs'], filename.split('.', 2)[1])
        , isValidCtrlFile = (filename, method) => some(['index', method], filename.split('.', 2)[0])
        , fsp = fetch('fs').promises
        , cache = {}
        , keyParam = '#p'
        , keyFiles = '#f'

        , extractRoutesRecursive = (cache, urlParts, method, args) => {
            const params = cloneArray(urlParts)
                , urlPart = (urlParts.shift() ?? '').toLowerCase()

                , routesFirstOrder = (cache[keyFiles] ?? []).reduce((routes, obj) => {
                    routes.push({ name: obj.name, path: obj.fullPath, params, args: cloneObject(args) });

                    return routes
                }, [])

                , routesSecondOrder =  !(urlPart in cache) ? []
                    : extractRoutesRecursive(cache[urlPart], cloneArray(urlParts), method, cloneObject(args))

                , routesThirdOrder = (cache[keyParam] ?? []).reduce((routes, obj) => {
                    args[obj.name] = urlPart
                    routes = routes.concat(extractRoutesRecursive(obj.cache, cloneArray(urlParts), method, cloneObject(args)));

                    return routes
                }, [])

            return [].concat(routesFirstOrder, routesSecondOrder, routesThirdOrder)
        }
        , buildCacheRecursive = async (startPath, cache, urlParts=null) => {
            if (!isNull(urlParts)) urlParts = cloneArray(urlParts)
            const isProd = isNull(urlParts)
                , urlPart = isNull(urlParts) ? null : (urlParts.shift() ?? '').toLowerCase();

            cache[keyParam] = []
            cache[keyFiles] = []

            await Promise.all((await fsp.readdir(startPath)).map(async (path) => {
                const fullPath = startPath + '/' + path

                if ((await fsp.stat(fullPath)).isDirectory()) {
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

                    if (isProd) fetch(fullPath)
                }
            }))

            return cache
        }
        , extractRoutes = async (routesDir, url, method, isProd) => {
            const path = url.split('?', 2)[0]
                , urlParts = path.split('/').filter(value => value !== '')

            if (isProd && !(routesDir in cache)) {
                cache[routesDir] = await buildCacheRecursive(routesDir, {})
            }

            const cachePart = isProd ? cache[routesDir] : await buildCacheRecursive(routesDir, {}, cloneArray(urlParts))

            return extractRoutesRecursive(cachePart, urlParts, method, {})
        }
        , next = async (iter, req, res, ctrlName, routes, isProd) => {
            const nextFnc = async (ctrlN=ctrlName) => await next(iter, req, res, ctrlN, routes, isProd)
            const obj = iter.next()

            if (obj.done) return ''

            const route = obj.value

            if (!isValidCtrlFile(route.name, ctrlName)) return nextFnc()

            const file = await fetch(route.path);

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
        , warmupCache = async routingDirectories => {
            for (const routesDir of routingDirectories) {
                cache[routesDir] = await buildCacheRecursive(routesDir, {})
            }
        }

    function* iterator(routes) {
        for (let i=0; i<routes.length; i++) {
            yield routes[i];
        }
    }

    /**
     * @param {string[]} routingDirectories
     */
    exports.init = async (routingDirectories) => {
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
