# Development guide

iTowns needs `nodejs` (10+) and `npm` (at least 6.x) installed on the system.
See the [node website](https://nodejs.org) to install node and npm.

## Building

* Download dependencies: `npm install`
* Run the dev server:
   * `npm start` (you can change the port: `npm start -- --port 3000`. If you
     get an error message that is not related to the port being in use, please
     update to last lts or stable version)
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

## Debugging
* `babel-inline-import-loader` prevents the source map debug in browser. If you
  want launch server and debug with the original source map, run : `npm run
  debug`.
* To debug iTowns package on your side project. You can link iTowns package with
  `npm link ../path/iTowns/` in project folder and auto-transpile to `lib/` when
  iTowns sources are modified with command `npm run watch` in iTowns folder.

## Testing
For unit and functional test, defines `HTTPS_PROXY` if you launch test behind a proxy.

In order to run the tests, [puppeteer](https://github.com/GoogleChrome/puppeteer)
needs to be installed. If installing puppeteer behind a proxy, use `HTTP_PROXY`,
`HTTPS_PROXY`, `NO_PROXY` to defines HTTP proxy settings that are used to download
and run Chromium.

If puppeteer fails to download Chrome, you can try with the [documented environment
variables](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#environment-variables).
Or you can download it manually, and then:
* install puppeteer without downloading Chrome:
  `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm install puppeteer`
* then use the env var `CHROME` to tell itowns/mocha/puppeteer what Chrome app
  it should use: `CHROME=/opt/google/chrome-beta/chrome npm run test-examples`

Then tests can be ran with four differents methods:
* `npm run test`: build and ran all tests in iTowns
* `npm run test-unit`: ran unit tests only
* `npm run test-functional`: ran functional testing with examples only, use
  `npx mocha -t 30000 test/functional/bootstrap.js
  test/functional/<test_case>.js` to run a single example
* `npm run test-with-coverage`: build and ran all tests in iTowns and generate a
  report on the coverage of the tests


When running tests on examples, some environment variables can be set:
* `SCREENSHOT_FOLDER`: take a screenshot at the end of each test and save it in
  this folder. Example: `SCREENSHOT_FOLDER=/tmp/`
* `CHROME`: path to Chrome executable. If unspecified itowns will use the one
  downloaded during puppeteer install.
* `DEBUG`: run Chrome in a window with the debug tools open.
* `REMOTE_DEBUGGING`: run Chrome in headless mode and set up remote debugging.
  Example: `REMOTE_DEBUGGING=9222` will setup remote debugging on port 9222.
  Then start another Chrome instance, browse to `chrome://inspect/#devices` and
  add `localhost:9222` in Discover network targets.

Note: Chrome in headless mode doesn't support the WebGL `EXT_frag_depth`
extension. So rendering may differ and some bugs can only be present in headless
mode.

### Syntax in tests

[mochajs](https://mochajs.org/) is used for both type of tests. To avoid
problems with same name variables, keep them in the smallest scope. For example,
a variable should almost always be in the `it()` section of a test. However, it
can be useful to keep a single shared variable for a bunch of tests (in the same
file). For this, declare it in the `describe()` section, and set it (if
possible) in a `before()` section.

### Useful commands for continuous testing

If you wish to have unit tests to continuously run, you can append to your
running command `-- --watch`. You will be getting in this case `npm run
test-unit -- --watch`.

If you want to work on a single test and debug it, without having all the extra
output, you can use this command `npm run base-test-unit test/unit/3dtiles.js`
and of course replace 3dtiles.js with the correct filename. You can also append
the `-- --watch` flag as well. If you want disable reporting and keep error message
in console add `--reporter min`.

## Contribute back

See [the contributor's guide](CONTRIBUTING.md) for more information on how to
contribute.

Note : You should not commit changes to `package-lock.json` if you're not using
npm >= 6 (particularly if you didn't make any change to the `package.json`
either).
