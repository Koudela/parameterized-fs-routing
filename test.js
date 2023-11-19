/**
 * parameterized-fs-routing
 * filesystem based routing engine
 *
 * @package parameterized-fs-routing
 * @link https://github.com/Koudela/parameterized-fs-routing/
 * @copyright Copyright (c) 2022 Thomas Koudela
 * @license http://opensource.org/licenses/MIT MIT License
 */

const fs = require('fs')
const http = require('http')
const test = require('ava')
const express = require('express')
const routing = require('.')

test.before(async t => {
    const directories = ['./testcases/routing-root', './testcases/second-root']
    const router = await routing.init(directories)

    t.context.server = http.createServer(async (req, res) => {
        const response = await router(req, res)

        if (!res.writableEnded) res.end(response)
    });

    return new Promise(resolve => t.context.server.listen(3000, '127.0.0.1', () => resolve()))
})

test.after(t => {
    return new Promise(resolve => t.context.server.close(() => resolve()))
})

function doRequest(method, path, message='', port=3000) {
    return new Promise((resolve, reject) => {
        let answer = ''
        const request = http.request({
            host: '127.0.0.1',
            port,
            method,
            path,
        }, (result) => {
            result.setEncoding('utf8')
            result.on('data', chunk => answer += chunk)
            result.on('end', () => {
                resolve(answer)
            })
        })

        request.on('error', function(e) {
            reject(e.message);
        });

        request.write(message)
        request.end()
    })
}

test('set up with plain node', async t => {
    const result = await doRequest('GET', '/hello-world')
    t.is('hello world!', result)
})

async function setUpExpress(port) {
    const directories = ['./testcases/routing-root', './testcases/second-root']
    const router = await routing.init(directories)

    const app = express()

    app.use(async (req, res, next) => {
        const response = await router(req, res)

        res.send(response)

        next()
    });

    let server = null;

    await new Promise(resolve => server = app.listen(port, '127.0.0.1', () => resolve()))

    return server
}

test('set up with express', async t => {
    const server = await setUpExpress(3001)

    const result = await doRequest('GET', '/hello-world', '', 3001)

    await new Promise(resolve => server.close(() => resolve()))

    t.is('hello world!', result)

})

test('the routing process', async t => {
    const result = await doRequest('GET', '/step-1/step-2/step-3')

    t.is(result, 'step-1.1_step-1.2_second-root_step-2.1_step-2.2_!')
})

test('parameterizing directories', async t => {
    const result = await doRequest('GET', '/admin/board/201/87')

    t.is(result, 'first_{"board-id":"201","user-id":"87"}second-root_!')
})

test('matching controller names', async t => {
    const result = await doRequest('GET', '/matching/controller/names/get/post/no-controller')

    t.is(result, 'index.js_index.mjs_index.cjs_get.js_second-root_!')
})

test('matching controller functions', async t => {
    t.is(await doRequest('GET', '/matching-controller-functions'), 'get!')
    t.is(await doRequest('POST', '/matching-controller-functions'), 'post!')
    t.is(await doRequest('PATCH', '/matching-controller-functions'), 'patch!')
    t.is(await doRequest('DELETE', '/matching-controller-functions'), 'delete!')
    t.is(await doRequest('OPTIONS', '/matching-controller-functions'), 'controller!')
})

test('traversing the controller-pipe', async t => {
    t.is(await doRequest('GET', '/traversing%20the%20controller-pipe/1/2/3'), 'start_stop!')
})

test('the controller function call', async t => {
    t.is(
        await doRequest('GET', '/the+controller+function+call'),
        'other_{"path":"./testcases/routing-root/the+controller+function+call/get.js","params":[],"args":{}}_[{"path":"./testcases/routing-root/index.js","params":["the+controller+function+call"],"args":{}},{"path":"./testcases/routing-root/the+controller+function+call/get.js","params":[],"args":{}},{"path":"./testcases/second-root/index.js","params":["the+controller+function+call"],"args":{}}]'
    )
})

test('example controller', async t => {
    t.is(await doRequest('GET', '/example-controller/42'), 'Hello world from account 42!!')
    t.is(await doRequest('POST', '/example-controller/42'), 'second-root_!')
})

test('differences in prod and env environment', async t => {
    process.env.NODE_ENV = 'production'

    let server = await setUpExpress(3002)

    t.is(await doRequest('GET', '/prod-vs-dev-env', '', 3002), 'second-root_!')

    fs.copyFileSync('./testcases/blueprints/service.js', './testcases/routing-root/prod-vs-dev-env/service.js')
    fs.copyFileSync('./testcases/blueprints/index.js', './testcases/routing-root/prod-vs-dev-env/index.js')

    t.is(await doRequest('GET', '/prod-vs-dev-env', '', 3002), 'second-root_!')

    fs.unlinkSync('./testcases/routing-root/prod-vs-dev-env/service.js')
    fs.unlinkSync('./testcases/routing-root/prod-vs-dev-env/index.js')

    await new Promise(resolve => server.close(() => resolve()))

    process.env.NODE_ENV = 'dev'

    server = await setUpExpress(3002)

    t.is(await doRequest('GET', '/prod-vs-dev-env', '', 3002), 'second-root_!')

    fs.copyFileSync('./testcases/blueprints/service_current.js', './testcases/routing-root/prod-vs-dev-env/service.js')
    fs.copyFileSync('./testcases/blueprints/index_current.js', './testcases/routing-root/prod-vs-dev-env/index.js')

    t.is(await doRequest('GET', '/prod-vs-dev-env', '', 3002), 'old no result!')

    fs.copyFileSync('./testcases/blueprints/service.js', './testcases/routing-root/prod-vs-dev-env/service.js')
    fs.copyFileSync('./testcases/blueprints/index.js', './testcases/routing-root/prod-vs-dev-env/index.js')

    t.is(await doRequest('GET', '/prod-vs-dev-env', '', 3002), 'result!')

    await new Promise(resolve => server.close(() => resolve()))

    fs.unlinkSync('./testcases/routing-root/prod-vs-dev-env/service.js')
    fs.unlinkSync('./testcases/routing-root/prod-vs-dev-env/index.js')
})
