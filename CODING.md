# Development guide

## Environment setup

### Node.js

iTowns uses NPM as the build tool. If you haven't already, install Node.js: https://nodejs.org/
You must have Node.js 10 or superior to develop in iTowns core.

## Building

* Download dependencies: `npm install`
* Run the dev server:
   * `npm start` (you can change the port: `npm start -- --port 3000`. If you get an error message that is not related to the port being in use, please update to last lts or stable version)
   * Open `http://localhost:8080/`
   * Make changes in the code, the browser will automatically reload on save
* Build iTowns to produce a single independent script:
   * `npm run build`
   * The script and its source-maps are generated into the `dist/` folder
   * You can run the built script to verify it works OK:
      * `python -m SimpleHTTPServer 8080` (change the port at your convenience)
      * Open `http://localhost:8080/`
* Transpile itowns to ES5 to require it in your code:
   * `npm run transpile`
   * The transpiled source is in `lib/`
   * You can then require `src/Main.js` in your code
* Test and lint changes: see test, lint and test-examples npm script

## Testing

If you want to run tests you'll need to install [puppeteer](https://github.com/GoogleChrome/puppeteer).

If you install pupperter behind proxy, use HTTP_PROXY, HTTPS_PROXY, NO_PROXY to defines HTTP proxy settings that are used to download and run Chromium.

If puppeteer fails to download Chrome, you can try with the [documented environment variables](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#environment-variables).
Or you can download it manually, and then:
- install puppeteer without downloading Chrome: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm install puppeteer`
- then use the env var `CHROME` to tell itowns/mocha/puppeteer what Chrome app it should use:
`CHROME=/opt/google/chrome-beta/chrome npm run test-examples`

Then you can run the tests:
```bash
npm run test-examples
```
Supported environment variables:

    * SCREENSHOT_FOLDER: take a screenshot at the end of each test and save it in this folder. Example: SCREENSHOT_FOLDER=/tmp/
    * CHROME: path to Chrome executable. If unspecified itowns will use the one downloaded during puppeteer install.
    * DEBUG: run Chrome in a window with the debug tools open.
    * REMOTE_DEBUGGING: run Chrome in headless mode and set up remote debugging. Example: REMOTE_DEBUGGING=9222 will setup remote debugging on port 9222. Then start another Chrome instance, browse to chrome://inspect/#devices and add localhost:9222 in Discover network targets.

Note: Chrome in headless mode doesn't support the WebGL EXT_frag_depth extension. So rendering may differ and some bugs can only be present in headless mode.

## Contribute back

See [the contributor's guide](CONTRIBUTING.md)

Note : You should not commit changes to `package-lock.json` if you're not using NPM >= 6 (particularly if you didn't make any change to the `package.json` either).
