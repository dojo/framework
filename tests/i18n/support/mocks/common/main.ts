import has from '@dojo/core/has';

const locales = [
	'ar',
	'ar-JO',
	'es'
];

// TODO: The default loader attempts to use the native Node.js `require` when running on Node. However, the Intern
// suite uses the @dojo/loader, in which case the context for requires is the location of the loader module; or in
// this case, `node_modules/@dojo/loader/loader.min.js'. Is there a better, less hacky way to handle this?
const hasHostNode = has('host-node');
const pathSeparator = hasHostNode ? require('path').sep : '/';
const basePath = hasHostNode ? `..${pathSeparator}_build${pathSeparator}` : '';
const bundlePath = `${basePath}tests${pathSeparator}support${pathSeparator}mocks${pathSeparator}common${pathSeparator}main`;

const messages = {
	hello: 'Hello',
	helloReply: 'Hello',
	goodbye: 'Goodbye'
};

export default { bundlePath, locales, messages };
