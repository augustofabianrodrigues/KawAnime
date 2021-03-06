/**
 * Created by Kylart on 23/05/2017.
 */

require('colors')
const {readdirSync, unlinkSync, rmdirSync, readFileSync} = require('fs')
const {join} = require('path')
const path = require('path')
const {userInfo} = require('os')
const express = require('express')
const resolve = file => path.resolve(__dirname, file)
const { createBundleRenderer } = require('vue-server-renderer')
const redirects = require('../../router/301.json')

// We keep the nuxt and server instance
// So we can close them at the end of the test
let server = null
let renderer = null
const template = readFileSync(resolve('../../assets/index.template.html'), 'utf-8')
const uri = 'http://localhost:9200'
const serverInfo =
  `express/${require('express/package.json').version} ` +
  `vue-server-renderer/${require('vue-server-renderer/package.json').version}`

const DIR = join(userInfo().homedir, '.KawAnime-test')

const serve = (path, cache) => express.static(resolve(path), {
  maxAge: cache && 60 * 60 * 24 * 30
})

const createRenderer = (bundle, options) => {
  // https://github.com/vuejs/vue/blob/dev/packages/vue-server-renderer/README.md#why-use-bundlerenderer
  return createBundleRenderer(bundle, Object.assign(options, {
    template,
    runInNewContext: false
  }))
}

const render = ({url}, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Server', serverInfo)

  const handleError = (err) => {
    if (err && err.code === 404) {
      res.status(404).end('404 | Page Not Found')
    } else {
      res.status(500).end(`<pre>500 | Internal Server Error\n${err.stack}</pre>`)
      console.error(`error during render : ${url}`)
      console.error(err.stack)
    }
  }

  const context = {
    title: 'KawAnime',
    url
  }
  renderer.renderToString(context, (err, html) => {
    if (err) {
      return handleError(err)
    }
    res.end(html)
  })
}

module.exports = { // adapted from: https://git.io/vodU0
  before: function (browser, done) {
    const app = express()

    const bundle = require('../../public/vue-ssr-server-bundle.json')
    const clientManifest = require('../../public/vue-ssr-client-manifest.json')
    renderer = createRenderer(bundle, {
      clientManifest
    })

    app.use('/static', serve('../../static', true))
    app.use('/public', serve('../../public', true))

    // Setup the api
    require('../../server')(app)
    app.get('*', render)

    // 301 redirect for changed routes
    Object.keys(redirects).forEach((k) => {
      app.get(k, (req, res) => res.redirect(301, redirects[k]))
    })

    server = app.listen(9200, () => {
      console.log(`> server started at ${uri}`.green)
    })
    done()
  },
  'Getting downloader page and downloading some anime': function (client) {
    client
      .url(`${uri}/downloader`)
      .waitForElementVisible('body')
      .assert.title('Downloader - KawAnime')
      .assert.visible('div.form-container')
      .assert.visible('div#magnets-switch .input-group--selection-controls__ripple')
      .click('div#magnets-switch .input-group--selection-controls__ripple')
      .assert.visible('input[name="name-input"]')
      .click('input[name="name-input"]')
      .setValue('input[name="name-input"]', 'sakura trick')
      .assert.visible('input[name="from-ep-input"]')
      .click('input[name="from-ep-input"]')
      .setValue('input[name="from-ep-input"]', '3')
      .assert.visible('input[name="until-ep-input"]')
      .click('input[name="until-ep-input"]')
      .setValue('input[name="until-ep-input"]', '9')
      .assert.visible('#download-btn')
      .click('#download-btn')
      .waitForElementVisible('div.modal-text')
      .end()
  },
  'Getting season page': function (client) {
    client
      .url(`${uri}/seasons`)
      .waitForElementVisible('body')
      .assert.title('Seasons - KawAnime')
      .end()
  },
  after: function () {
    server.close()

    /**
     * Removing temporary .KawAnime directory
     */
    console.info('Removing temporary info'.yellow)
    const files = readdirSync(DIR)

    files.forEach((file) => {
      unlinkSync(`${DIR}/${file}`)
    })

    try {
      rmdirSync(DIR)
    } catch (err) {
      throw err
    }

    console.info('All clear!'.green)
  }
}
