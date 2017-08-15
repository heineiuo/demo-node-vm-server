const fs = require('fs')
const http = require('http')

console.log(global)
console.log(setTimeout)
console.log(setInterval)

const pkg = fs.readFileSync('./package.json', 'utf8')
console.log(pkg)

const server = createServer((msg, callback) => {
  callback('hello: ' + msg.name)
})