import has from 'dojo-has/has';

// The default loader attempts to use the native Node.js `require` when running on Node. However, the Intern
// suite uses the dojo-loader, in which case the context for requires is the location of the loader module; or in
// this case, `node_modules/dojo-loader/loader.min.js'.
const basePath = has('host-node') ? '../_build/' : '';
const bundlePath = `${basePath}tests/support/nls/greetings`;
const locales = [ 'fr' ];

const messages = {
	hello: 'Hello',
	goodbye: 'Goodbye',
	welcome: 'Welcome, {name}!'
};

export default { bundlePath, locales, messages };
