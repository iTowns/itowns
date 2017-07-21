# Build guide

## Environment setup

### Node.js

iTowns uses NPM as the build tool. If you haven't already, install Node.js: https://nodejs.org/

## Build the code

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


## Contribute back

See [the contributor's guide](CONTRIBUTING.md)
