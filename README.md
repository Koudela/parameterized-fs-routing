# parameterized-fs-routing

filesystem based routing engine

## Features

* parameterized paths
* supports multiple route matching (e.g. to implement an access schema in an explicit way)
* supports multiple routing roots (e.g. to implement server side event trees beside the url routing)
* integrates with plain node and frameworks like express

## Advantages

* small (~1.9kb minified)
* fast
* dependency free
* all features are documented and covered by tests
* no config
* optimized for speed in prod env
* optimized for comfort in dev env

## set up the routing 

### initialization

Init the router with one or more root routing directories.

### binding 

Call the router with the `req` and `res` arguments to get the response.

### example set up with plain node

```js
const http = require('http')
const routing = require('parameterized-fs-routing')

const rootDirs = ['/home/project/src/routing-headless', '/home/project/src/routing-browser']
const router = await routing.init(rootDirs)

const server = http.createServer(async (req, res) => {
    const response = await router(req, res)

    res.end(response)
});

server.listen(3000, '127.0.0.1', () => {});
```

### example set up with express

```js
const express = require('express')
const routing = require('parameterized-fs-routing')

const app = express()

const directories = ['/home/project/src/routing-headless', '/home/project/src/routing-browser']
const router = await routing.init(directories)

app.use(async (req, res, next) => {
    const response = await router(req, res)
    
    res.send(response)
    
    next()
})

app.listen(3000, () => {})
```

## the routing process

Every routing process starts in the first of the root directories. If there is a 
matching controller it is stacked to a fifo controller-pipe. 

Then the tree is traversed by matching url-parts to directory names. In every 
directory matching controllers are stacked to the controller-pipe.

If one tree is traversed the next root directory is processed.

### parameterizing directories

Directory names starting with a colon (`:`) are treated as parameters.
E.g. the url path (without the domain) is `admin/board/201/87` and the 
controller path (without the root) is `admin/board/:board-id/:user-id/index.js` 
then the arguments variable `route.args` holds 
`{ 'board-id':'201', 'user-id':'87' }`.

Exact matches are traversed before parameterizing directories. Thus 
parameterizing directories can be used as fallback.

If there is more than one parameterizing directory the order of traversal may
change on runtime. (It is recommended against using more than one parameterizing
directory.)

### matching controller names

A controller is every file beneath a routing directory root that ends with `.js`
`.mjs` or `.cjs` and either starts with the lower case request method name or 
with `index`.

`index` files do not care about the type of request. For all other files 
`req.method.toLowerCase()` is used to find the right controller file.

If there is more than one matching controller file in one directory the order
in which they are stacked to the controller-pipe may change on runtime.

### matching controller functions

Every controller file has to export one or more function. They have to be named
like `req.method.toLowerCase()` e.g. `post`, `get`, `patch`, etc. One exception
is `del` which is the function name for the request method `DELETE`. 

If the controller exports a function named `controller` it is used as fallback 
if the request method does not match any exported function.

If no function matches the request method and no fallback exists the controller
is silently dropped from the controller-pipe.

### traversing the controller-pipe

Like in express to the matching controller function a `next` function is passed 
as third parameter. By calling `next()` the next controller in the 
controller-pipe is called.

## the controller function call

One can use async or normal functions as controller functions.

Five parameters are passed to the controller function: `req`, `res`, `ǹext`,
`route` and `routes`.

`req` and `res` are the request and response objects the router is called with.

`next` is a function without arguments to call the next one in the 
controller-pipe and receive its response.

`route` is an object that holds information about the routing process: 
- `route.path` holds the full matched file system path.
- `route.params` is an array of the remaining url parts.
- `route.args` is an object of the matched parametrizing directories and its url
counterparts.

`routes` holds all matched routes. Ones that are already called as well as those
in the controller-pipe.

### example controller

```js
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
```

## differences in prod and env environment 

If the process environment variable `NODE_ENV` is set to `production` all routes 
and controller are loaded on initialization thus minimizing the file system load
at runtime. Mark that there is a drawback: Changes to the routes or controllers 
have no effect after initialization is done.

If the process does not run in production mode every routing call is processed 
via the current file system and nodes require and path cache is cleared. Thus, 
any changes take effekt immediately. 
