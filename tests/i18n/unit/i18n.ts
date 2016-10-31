import global from 'dojo-core/global';
import has from 'dojo-core/has';
import { Handle } from 'dojo-interfaces/core';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import i18n, {
	formatMessage,
	getCachedMessages,
	getMessageFormatter,
	invalidate,
	LocaleContext,
	LocaleState,
	Messages,
	ready,
	switchLocale,
	systemLocale
} from '../../src/i18n';
import bundle from '../support/mocks/common/main';
import partyBundle from '../support/mocks/common/party';

registerSuite({
	name: 'i18n',

	afterEach() {
		invalidate();
		return switchLocale('');
	},

	systemLocale() {
		let expected = 'en';

		if (has('host-browser')) {
			const navigator = global.navigator;
			expected = navigator.language || navigator.userLanguage;
		}
		else if (has('host-node')) {
			expected = global.process.env.LANG;
		}

		assert.strictEqual(systemLocale, expected.replace(/^([^.]+).*/, '$1').replace(/_/g, '-'));
	},

	formatMessage: {
		'assert without a locale'() {
			return i18n(partyBundle).then(() => {
				let formatted = formatMessage(partyBundle.bundlePath, 'guestInfo', {
					host: 'Nita',
					guestCount: 0
				});
				assert.strictEqual(formatted, 'Nita does not give a party.');

				formatted = formatMessage(partyBundle.bundlePath, 'guestInfo', {
					host: 'Nita',
					gender: 'female',
					guestCount: 1,
					guest: 'Bryan'
				});
				assert.strictEqual(formatted, 'Nita invites Bryan to her party.');

				formatted = formatMessage(partyBundle.bundlePath, 'guestInfo', {
					host: 'Nita',
					gender: 'female',
					guestCount: 2,
					guest: 'Bryan'
				});
				assert.strictEqual(formatted, 'Nita invites Bryan and one other person to her party.');

				formatted = formatMessage(partyBundle.bundlePath, 'guestInfo', {
					host: 'Nita',
					gender: 'female',
					guestCount: 42,
					guest: 'Bryan'
				});
				assert.strictEqual(formatted, 'Nita invites Bryan and 41 other people to her party.');
			});
		},

		'assert supported locale'() {
			return i18n(bundle, 'ar').then(() => {
				assert.strictEqual(formatMessage(bundle.bundlePath, 'hello', null, 'ar'), 'السلام عليكم');
			});
		},

		'assert unsupported locale'() {
			return i18n(bundle, 'fr').then(() => {
				assert.strictEqual(formatMessage(bundle.bundlePath, 'hello', null, 'fr'), 'Hello');
			});
		}
	},

	getCachedMessages: {
		'assert unregistered locale'() {
			assert.isUndefined(getCachedMessages(bundle, 'ar'));
		},

		'assert supported locale'() {
			return i18n(bundle, 'ar').then(() => {
				assert.deepEqual(getCachedMessages(bundle, 'ar'), {
					hello: 'السلام عليكم',
					helloReply: 'و عليكم السام',
					goodbye: 'مع السلامة'
				}, 'Locale messages can be retrieved with a bundle object.');
			});
		},

		'assert unsupported locale'(this: any) {
			const cached = getCachedMessages(bundle, 'bogus-locale');
			assert.deepEqual(cached, bundle.messages, 'Default messages returned for unsupported locale.');
		},

		'assert most specific supported locale returned'() {
			return i18n(bundle, 'ar').then(() => {
				const cached = getCachedMessages(bundle, 'ar');
				assert.deepEqual(getCachedMessages(bundle, 'ar-IR'), cached,
					'Messages are returned for the most specific supported locale.');
			});
		}
	},

	getMessageFormatter: {
		'assert without a locale'() {
			return i18n(partyBundle).then(() => {
				const formatter = getMessageFormatter(partyBundle.bundlePath, 'guestInfo');
				let formatted = formatter({
					host: 'Nita',
					guestCount: 0
				});
				assert.strictEqual(formatted, 'Nita does not give a party.');

				formatted = formatter({
					host: 'Nita',
					gender: 'female',
					guestCount: 1,
					guest: 'Bryan'
				});
				assert.strictEqual(formatted, 'Nita invites Bryan to her party.');

				formatted = formatter({
					host: 'Nita',
					gender: 'female',
					guestCount: 2,
					guest: 'Bryan'
				});
				assert.strictEqual(formatted, 'Nita invites Bryan and one other person to her party.');

				formatted = formatter({
					host: 'Nita',
					gender: 'female',
					guestCount: 42,
					guest: 'Bryan'
				});
				assert.strictEqual(formatted, 'Nita invites Bryan and 41 other people to her party.');
			});
		},

		'assert supported locale'() {
			return i18n(bundle, 'ar').then(() => {
				const formatter = getMessageFormatter(bundle.bundlePath, 'hello', 'ar');
				assert.strictEqual(formatter(), 'السلام عليكم');
			});
		},

		'assert unsupported locale'() {
			return i18n(bundle, 'fr').then(() => {
				const formatter = getMessageFormatter(bundle.bundlePath, 'hello', 'fr');
				assert.strictEqual(formatter(), 'Hello');
			});
		}
	},

	i18n: {
		'assert invalid path'() {
			const pathless = {
				bundlePath: 'path',
				messages: {},
				locales: []
			};

			return i18n(pathless, 'en').then(function () {
				throw new Error('Load promise should not resolve.');
			}, function (error: Error) {
				const expected = 'Invalid i18n bundle path. Bundle maps must adhere to the format ' +
					'"{basePath}{separator}{bundleName}" so that locale bundles can be resolved.';
				assert.strictEqual(error.message, expected);
			});
		},

		'assert system locale used as default'()  {
			return i18n(bundle).then(function (messages: Messages) {
				assert.deepEqual(messages, {
					hello: 'Hello',
					helloReply: 'Hello',
					goodbye: 'Goodbye'
				});
			});
		},

		'assert with string locale'() {
			return i18n(bundle, 'ar').then(function (messages: Messages) {
				assert.deepEqual(messages, {
					hello: 'السلام عليكم',
					helloReply: 'و عليكم السام',
					goodbye: 'مع السلامة'
				}, 'Locale dictionary is used.');
			});
		},

		'assert context with locale'() {
			const context: LocaleContext<LocaleState> = {
				state: { locale: 'ar' }
			};

			return i18n(bundle, context).then(function (messages: Messages) {
				assert.deepEqual(messages, {
					hello: 'السلام عليكم',
					helloReply: 'و عليكم السام',
					goodbye: 'مع السلامة'
				}, 'Locale is read from the context\'s state.');
			});
		},

		'assert context without locale'() {
			const context: LocaleContext<LocaleState> = {
				state: {}
			};

			return i18n(bundle, context).then(function (messages: Messages) {
				assert.deepEqual(messages, {
					hello: 'Hello',
					helloReply: 'Hello',
					goodbye: 'Goodbye'
				}, 'The system locale is used when a context is provided with no locale.');
			});
		},

		'assert with nested locale'() {
			return i18n(bundle, 'ar-JO').then(function (messages: Messages) {
				// ar-JO is missing "goodbye" key
				assert.deepEqual(messages, {
					hello: 'مرحبا',
					helloReply: 'مرحبتين',
					goodbye: 'مع السلامة'
				}, 'Most specific dictionary is used with fallbacks provided.');
			});
		},

		'assert with invalid locale'() {
			return i18n(bundle, 'ar-JO-').then(function (messages: Messages) {
				assert.deepEqual(messages, {
					hello: 'مرحبا',
					helloReply: 'مرحبتين',
					goodbye: 'مع السلامة'
				}, 'Only non-empty locale segments are considered.');
			});
		},

		'assert unsupported locale'() {
			return i18n(bundle, 'fr-CA').then(function (messages: Messages) {
				assert.deepEqual(messages, {
					hello: 'Hello',
					helloReply: 'Hello',
					goodbye: 'Goodbye'
				});
			});
		},

		'assert bundle without locales'() {
			const { bundlePath, messages } = bundle;
			const localeless = { bundlePath, messages };

			return i18n(localeless, 'ar').then(function (messages: Messages) {
				assert.deepEqual(messages, {
					hello: 'Hello',
					helloReply: 'Hello',
					goodbye: 'Goodbye'
				}, 'Default messages returned when bundle provides no locales.');
			});
		},

		'assert messages cached'() {
			return i18n(bundle, 'ar-JO').then(function () {
				return i18n(bundle, 'ar-JO');
			}).then((messages: Messages) => {
				const cached = getCachedMessages(bundle, 'ar-JO');

				assert.strictEqual(cached, messages, 'Message dictionaries are cached.');
			});
		},

		'assert message dictionaries are frozen'() {
			return i18n(bundle, 'ar-JO').then(function () {
				const cached = getCachedMessages(bundle, 'ar-JO');

				assert.throws(() => {
					cached['hello'] = 'Hello';
				});
			});
		}
	},

	invalidate: {
		'assert with a bundle path'() {
			return i18n(bundle, 'ar').then((messages: Messages) => {
				invalidate(bundle.bundlePath);
				assert.isUndefined(getCachedMessages(bundle, 'ar'), 'The cache is invalidated for the specified bundle.');
			});
		},

		'assert without a bundle path'() {
			return i18n(bundle, 'ar').then((messages: Messages) => {
				invalidate();
				assert.isUndefined(getCachedMessages(bundle, 'ar'), 'The cache is invalidated for all bundles.');
			});
		}
	},

	ready() {
		assert.isFunction(ready().then, 'Returns a promise.');
	},

	switchLocale: (function (){
		function getContext() {
			return <any> {
				dirty: false,
				state: {},

				invalidate(this: any) {
					this.dirty = true;
				},

				own(this: any, handle: Handle): Handle {
					this.handle = handle;
					return handle;
				}
			};
		}

		return {
			'assert registered observers updated'() {
				const context = getContext();

				return i18n(bundle, context).then(function () {
					return switchLocale('ar');
				}).then(() => {
					assert.isTrue(context.dirty, 'Context object invalidated.');
				});
			},

			'assert registered observers with an explicit locale not updated'() {
				const context = getContext();
				context.state.locale = 'fr';

				return i18n(bundle, context).then(function () {
					return switchLocale('ar');
				}).then(() => {
					assert.isFalse(context.dirty, 'Context object not invalidated.');
				});
			},

			'assert registered observers not updated when same locale is passed to `switchLocale`'() {
				const context = getContext();

				return switchLocale('ar').then(() => {
					return i18n(bundle, context);
				}).then(function () {
					return switchLocale('ar');
				}).then(() => {
					assert.isFalse(context.dirty, 'Context object not invalidated.');
				});
			},

			'assert registered observers not updated when handle is destroyed'() {
				const context = getContext();

				return i18n(bundle, context).then(function () {
					assert(context.handle);
					context.handle.destroy();

					return switchLocale('ar');
				}).then(() => {
					assert.isFalse(context.dirty, 'Context object not invalidated.');
				});
			},

			'assert handle does not continually remove context objects'() {
				const first = getContext();
				const second = getContext();

				return i18n(bundle, first).then(function () {
					return i18n(bundle, second);
				}).then(function () {
					first.handle.destroy();
					first.handle.destroy();
					first.handle.destroy();

					return switchLocale('ar');
				}).then(() => {
					assert.isTrue(second.dirty, 'Second object still invalidated.');
				});
			}
		};
	})(),

	locale: {
		'assert defaults to system locale'() {
			assert.strictEqual(i18n.locale, systemLocale, '`i18n.locale` defaults to the system locale.');
		},

		'assert reflects current locale'() {
			return switchLocale('fr').then(() => {
				assert.strictEqual(i18n.locale, 'fr', '`i18n.locale` is the current locale.');
			});
		}
	}
});
