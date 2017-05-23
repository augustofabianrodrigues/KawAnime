/**
 * Created by Kylart on 20/04/2017.
 */

const fs = require('fs')
const {userInfo} = require('os')
const {join} = require('path')

const wlPath = join(userInfo().homedir, '.KawAnime', 'lists.json')

exports.getLists = (res) => {
  const wlFile = require(wlPath)

  console.log(`[WatchList] Gathered lists from local.`)

  res.writeHead(200, {'Content-Type': 'application/json'})
  res.write(JSON.stringify(wlFile))
  res.end()
}

exports.saveWatchList = (req, res) => {
  req.on('data', (chunk) => {
    // Saving list
    fs.writeFileSync(wlPath, chunk, 'utf-8')

    console.log('[WatchList] Successfully saved lists.')

    res.writeHead(200, {})
    res.end()
  })
}