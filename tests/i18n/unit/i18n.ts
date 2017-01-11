import global from 'dojo-core/global';
import has from 'dojo-core/has';
import Promise from 'dojo-shim/Promise';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import * as cldrLoad from '../../src/cldr/load';
import i18n, {
	formatMessage,
	getCachedMessages,
	getMessageFormatter,
	invalidate,
	Messages,
	observeLocale,
	ready,
	switchLocale,
	systemLocale
} from '../../src/i18n';
import bundle from '../support/mocks/common/main';
import partyBundle from '../support/mocks/common/party';

registerSuite({
	name: 'i18n',

	afterEach() {
		const loadCldrData = <any> cldrLoad.default;
		if (typeof loadCldrData.restore === 'function') {
			loadCldrData.restore();
		}

		invalidate();
		return switchLocale(systemLocale);
	},

	systemLocale() {
		let expected = 'en';

		if (has('host-browser')) {
			const navigator = global.navigator;
			expected = navigator.language || navigator.userLanguage;
		}
		else if (has('host-node')) {
			expected = process.env.LANG;
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
			const cached = getCachedMessages(bundle, 'un-SU-pported');
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

	observeLocale: {
		'assert observer notified of error'() {
			const onError = sinon.spy();
			const subscription = observeLocale({ error: onError });
			sinon.stub(cldrLoad, 'default').returns(Promise.reject(new Error('locale switch failure.')));

			return switchLocale('ar').then(() => {
				subscription.unsubscribe();
				assert.isTrue(onError.called, '`observer.error` called with error object.');
			});
		},

		'assert observer notified of locale change'() {
			const next = sinon.spy();
			const subscription = observeLocale({ next });

			return switchLocale('ar').then(() => {
				subscription.unsubscribe();
				assert.isTrue(next.calledWith('ar'), '`observer.next` called with new locale.');
			});
		},

		'assert observer not notified after unsubscribe'() {
			const observer = { error: sinon.spy(), next: sinon.spy() };
			const subscription = observeLocale(observer);
			subscription.unsubscribe();

			return switchLocale('ar').then(() => {
				assert.isFalse(observer.next.called, '`observer.next` not called after unsubscribe.');

				sinon.stub(cldrLoad, 'default').returns(Promise.reject(new Error('locale switch failure.')));
				return switchLocale('ar-JO');
			}).then(() => {
				assert.isFalse(observer.error.called, '`observer.error` not called after unsubscribe.');
			});
		}
	},

	ready() {
		assert.isFunction(ready().then, 'Returns a promise.');
	},

	switchLocale: {
		'assert locale updated on success'() {
			return switchLocale('en').then(() => {
				return switchLocale('ar');
			}).then(() => {
				assert.strictEqual(i18n.locale, 'ar');
			});
		},

		'assert locale not updated on error'() {
			return switchLocale('en').then(() => {
				sinon.stub(cldrLoad, 'default').returns(Promise.reject(new Error('locale switch error')));
				return switchLocale('ar');
			}).then(() => {
				assert.strictEqual(i18n.locale, 'en', 'Root locale not changed.');
			});
		},

		'assert observers not updated when locale remains the same'() {
			const next = sinon.spy();
			observeLocale({ next });

			return switchLocale('ar').then(() => {
				return switchLocale('ar');
			}).then(() => {
				assert.isFalse(next.calledTwice);
			});
		}
	},

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
