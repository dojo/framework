import fr from './fr/greetings';

export default {
	locales: {
		fr: () => fr
	},
	messages: {
		hello: 'Hello',
		goodbye: 'Goodbye',
		welcome: 'Welcome, {name}!'
	}
};
