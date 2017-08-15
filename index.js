const vm = require('vm')
const fs = require('fs')
const argv = require('yargs').argv
const path = require('path')
const http = require('http')
const EventEmitter = require('events')
const express = require('express')

const internalModuleNames = [
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "https",
  "inspector",
  "net",
  "os",
  "path",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "tls",
  "tty",
  "dgram",
  "url",
  "util",
  "v8",
  "vm",
  "zlib"
]

const createMockRequire = ({whiteList}) => (moduleName) => {
  const modules = whiteList.reduce((left, right) => {
    if (internalModuleNames.indexOf(right) === -1) throw new Error('Illegal module name')
    left[right] = require(right)
    return left
  }, {})
  return modules[moduleName]
}

const createMockGlobal = ({dirname, requireWhiteList}) => {
  const server = new EventEmitter()
  server.sendToSelf = (msg, callback) => {
    server.handler(msg, callback)
  }
  const mockGlobal = {
    createServer: (handler) => {
      console.log('createServer.....')
      server.emit('create')
      server.handler = handler
      return server
    },
    Buffer: Buffer,
    console: console,
    __dirname: dirname,
    __filename: dirname + '/index.js',
    clearImmediate,
    clearTimeout,
    clearInterval,
    setImmediate,
    setTimeout,
    setInterval,
    process: {
      env: {},
      nextTick: process.nextTick,
      cwd: () => dirname
    },
    require: createMockRequire({whiteList: requireWhiteList})
  }
  mockGlobal.global = mockGlobal
  return {
    server,
    mockGlobal
  }
}

const scriptText = fs.readFileSync(path.resolve('./script.js'), 'utf8')
const script = new vm.Script(scriptText)
const { mockGlobal, server } = createMockGlobal({
  dirname: '/var/lib/demo-vm',
  requireWhiteList: ['fs', 'http']
})


let isCreated = false

server.on('create', () => {
  isCreated = true
  console.log('child server created')
})

const app = express()

app.use((req, res) => {
  if (!isCreated) {
    res.write('server not ready')
    return res.end()
  }

  server.sendToSelf({name: req.query.name}, (msg) => {
    res.write(msg)
    res.end()
  })
})

app.listen(8080, () => console.log('listening onport 8080'))

script.runInContext(vm.createContext(mockGlobal))
