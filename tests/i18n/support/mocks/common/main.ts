import has from '@dojo/core/has';

const locales = [
	'ar',
	'ar-JO',
	'es'
];

const hasHostNode = has('host-node');
const pathSeparator = hasHostNode ? require('path').sep : '/';
const bundlePath = `tests${pathSeparator}support${pathSeparator}mocks${pathSeparator}common${pathSeparator}main`;

const messages = {
	hello: 'Hello',
	helloReply: 'Hello',
	goodbye: 'Goodbye'
};

export default { bundlePath, locales, messages };
