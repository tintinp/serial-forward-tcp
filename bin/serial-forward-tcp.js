#!/usr/bin/env node

/* eslint no-console: 0 */

const { argv } = require('yargs')
  .alias('d', 'device')
  .demand('d')
  .describe('d', 'device')

  .alias('b', 'baud')
  .describe('b', 'Baud rate')
  .number('b')
  .default('b', 115200)

  .alias('p', 'port')
  .describe('p', 'TCP port')
  .number('p')
  .default('p', 55555)

  .help('h')
  .alias('h', 'help')

const SerialPort = require('serialport')
const Net = require('net')

// params
const baud = argv.b
const tcpPort = argv.p
const devicePath = argv.d

const server = Net.createServer()
let device
const sockets = {}
let lastSocketId = 0

const streamToSocket = (socketId) => {
  if (!sockets[socketId]) {
    return
  }
  device.pipe(sockets[socketId])
}

const removeSocket = (socketId) => {
  if (!sockets[socketId]) {
    return
  }
  device.pause()
  device.unpipe(sockets[socketId])
  device.resume()

  delete sockets[socketId]
}

const startTCPServer = (err) => {
  if (err) {
    console.log(`Error opening device ${devicePath}: ${err.message}`)
    process.exit(1)
  }

  console.log(`Opened device ${devicePath}`)

  server.listen(tcpPort, () => {
    console.log(`Listeninig at port ${tcpPort}`)
  })

  server.on('connection', (socket) => {
    socket.name = ++lastSocketId

    console.log(`client connected: ${socket.name}`)
    sockets[socket.name] = socket
    socket.on('end', () => {
      console.log(`client disconnected: ${socket.name}`)
      removeSocket(socket.name)
    })

    socket.on('error', (socketErr) => {
      console.log(`client error: ${socket.name}: ${socketErr.message}`)
      removeSocket(socket.name)
    })

    socket.on('close', () => {
      console.log(`client closed: ${socket.name}`)
      removeSocket(socket.name)
    })

    // start streaming sbp to socket
    streamToSocket(socket.name)
  })
}

const main = () => {
  device = new SerialPort(
    devicePath,
    {
      baudRate: baud
    },
    startTCPServer
  )
}

main()
