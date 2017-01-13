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

/* Polyfill requestAnimationFrame */
global.requestAnimationFrame = (cb: (...args: any[]) => {}) => {
	setImmediate(cb);
};

export default doc;

console.log('Loaded JSDOM...');
