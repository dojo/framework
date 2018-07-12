import ar from './ar/main';
import arJO from './ar-JO/main';

export default {
	locales: {
		ar: () => ar,
		'ar-JO': () => arJO
	},
	messages: {
		hello: 'Hello',
		helloReply: 'Hello',
		goodbye: 'Goodbye'
	}
};
