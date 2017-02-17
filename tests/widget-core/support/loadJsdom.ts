import * as jsdom from 'jsdom';
import global from '@dojo/core/global';

/* In order to have the tests work under Node.js, we need to load JSDom and polyfill
 * requestAnimationFrame */

/* Create a basic document */
const doc = jsdom.jsdom(`
	<!DOCTYPE html>
	<html>
	<head></head>
	<body></body>
	<html>
`);

/* Assign it to the global namespace */
global.document = doc;

/* Assign a global window as well */
global.window = doc.defaultView;

/* Polyfill requestAnimationFrame - this can never be called an *actual* polyfill */
global.requestAnimationFrame = (cb: (...args: any[]) => {}) => {
	setImmediate(cb);
	// return something at least!
	return true;
};

global.cancelAnimationFrame = () => {};

export default doc;

console.log('Loaded JSDOM...');
