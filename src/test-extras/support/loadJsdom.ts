import global from '@dojo/shim/global';
import { add as hasAdd, exists } from '@dojo/has/has';
import { VirtualConsole } from 'jsdom';

/* In order to have the tests work under Node.js, we need to load JSDom and polyfill
 * requestAnimationFrame */

declare global {
	interface Window {
		CustomEvent: typeof CustomEvent;
		CSSStyleDeclaration: typeof CSSStyleDeclaration;
	}
}

/**
 * If `jsdom` loads, this is a reference to the virtual console for the global `window` and `document`
 */
export let virtualConsole: VirtualConsole | undefined;

/* Create a basic document */
let doc: Document;

if (!('document' in global)) {
	const jsdom = require('jsdom'); /* Only attempt to load JSDOM to avoid using a loader plugin */

	/* create a virtual console and direct it to the global `console` */
	virtualConsole = new jsdom.VirtualConsole() as VirtualConsole;
	virtualConsole.sendTo(console);

	/* Create a new jsdom instance */
	const dom = new jsdom.JSDOM(`
		<!DOCTYPE html>
		<html>
		<head></head>
		<body></body>
		<html>
	`, {
		virtualConsole,
		runScripts: 'dangerously'
	});

	/* Assign a global window */
	global.window = dom.window;

	/* Assign a global document */
	doc = global.document = global.window.document;

	/* Assign a global DocParser */
	global.DOMParser = global.window.DOMParser;

	/* Needed for Pointer Event Polyfill's incorrect Element detection */
	global.Element = global.window.Element;

	/* Patch feature detection of CSS Animations */
	Object.defineProperty(
		window.CSSStyleDeclaration.prototype,
		'transition',
		Object.getOwnPropertyDescriptor((<any> window).CSSStyleDeclaration.prototype, 'webkitTransition')!
	);

	/* Polyfill requestAnimationFrame - this can never be called an *actual* polyfill */
	global.requestAnimationFrame = (cb: (...args: any[]) => {}) => {
		setImmediate(cb);
		// return something at least!
		return true;
	};

	global.cancelAnimationFrame = () => {};

	hasAdd('jsdom', true);
}
else {
	doc = document;
	/* istanbul ignore else */
	if (!exists('jsdom')) {
		hasAdd('jsdom', false);
	}
}

export default doc;
