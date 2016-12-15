import i18n, {
	Bundle,
	formatMessage,
	getCachedMessages,
	getMessageFormatter,
	I18n,
	invalidate,
	MessageFormatter,
	Messages,
	ready,
	switchLocale,
	systemLocale
} from './i18n';
import {
	generateLocales,
	normalizeLocale
} from './util';
import loadCldrData from './cldr/load';

export default i18n;

export {
	Bundle,
	formatMessage,
	getCachedMessages,
	getMessageFormatter,
	generateLocales,
	I18n,
	invalidate,
	loadCldrData,
	MessageFormatter,
	Messages,
	normalizeLocale,
	ready,
	switchLocale,
	systemLocale
};
