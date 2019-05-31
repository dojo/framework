import has from '../../../src/core/has';
import global from '../../../src/shim/global';
import * as Globalize from 'globalize';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as sinon from 'sinon';
import { fetchCldrData } from '../support/util';
import * as cldrLoad from '../../../src/i18n/cldr/load';
import i18n, {
	formatMessage,
	getCachedMessages,
	getMessageFormatter,
	invalidate,
	Messages,
	observeLocale,
	setLocaleMessages,
	switchLocale,
	systemLocale,
	useDefault
} from '../../../src/i18n/i18n';
import bundle from '../support/mocks/common/main';
import partyBundle from '../support/mocks/common/party';

registerSuite('i18n', {
	before() {
		// Load the CLDR data for the locales used in the tests ('en' and 'fr');
		return fetchCldrData(['en', 'fr']).then(() => {
			switchLocale('en');
		});
	},

	afterEach() {
		const loadCldrData = cldrLoad.default as any;
		if (typeof loadCldrData.restore === 'function') {
			loadCldrData.restore();
		}

		invalidate();
		switchLocale(systemLocale);
	},

	tests: {
		systemLocale() {
			let expected = 'en';

			if (has('host-browser')) {
				const navigator = global.navigator;
				expected = navigator.language || navigator.userLanguage;
			} else if (has('host-node')) {
				expected = process.env.LANG || expected;
			}

			assert.strictEqual(systemLocale, expected.replace(/^([^.]+).*/, '$1').replace(/_/g, '-'));
		},

		formatMessage: {
			'without CLDR data': {
				before() {
					cldrLoad.reset();
				},

				after() {
					return fetchCldrData(['en', 'fr']);
				},

				tests: {
					'assert without loaded messages'() {
						assert.throws(
							() => {
								formatMessage({ messages: {} }, 'messageKey');
							},
							Error,
							'The bundle has not been registered.'
						);
					},

					'assert tokens replaced'() {
						return i18n(partyBundle).then(() => {
							const formatted = formatMessage(partyBundle, 'simpleGuestInfo', {
								host: 'Nita',
								guest: 'Bryan'
							});
							assert.strictEqual(formatted, 'Nita invites Bryan to a party.');

							assert.throws(
								() => {
									formatMessage(partyBundle, 'simpleGuestInfo', {
										host: 'Nita'
									});
								},
								Error,
								'Missing property guest'
							);
						});
					},

					'assert message without tokens'() {
						return i18n(bundle).then(() => {
							const formatted = formatMessage(bundle, 'hello');
							assert.strictEqual(formatted, 'Hello');
						});
					},

					'assert default locale used'() {
						switchLocale('ar');
						return i18n(bundle, 'ar').then(() => {
							const formatted = formatMessage(bundle, 'hello');
							assert.strictEqual(formatted, 'السلام عليكم');
						});
					}
				}
			},

			'with CLDR data': {
				'assert without a locale'() {
					return i18n(partyBundle).then(() => {
						let formatted = formatMessage(partyBundle, 'guestInfo', {
							host: 'Nita',
							guestCount: 0
						});
						assert.strictEqual(formatted, 'Nita does not host a party.');

						formatted = formatMessage(partyBundle, 'guestInfo', {
							host: 'Nita',
							gender: 'female',
							guestCount: 1,
							guest: 'Bryan'
						});
						assert.strictEqual(formatted, 'Nita invites Bryan to her party.');

						formatted = formatMessage(partyBundle, 'guestInfo', {
							host: 'Nita',
							gender: 'female',
							guestCount: 2,
							guest: 'Bryan'
						});
						assert.strictEqual(formatted, 'Nita invites Bryan and one other person to her party.');

						formatted = formatMessage(partyBundle, 'guestInfo', {
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
						assert.strictEqual(formatMessage(bundle, 'hello', {}, 'ar'), 'السلام عليكم');
					});
				},

				'assert unsupported locale'() {
					return i18n(bundle, 'fr').then(() => {
						assert.strictEqual(formatMessage(bundle, 'hello', {}, 'fr'), 'Hello');
					});
				}
			}
		},

		getCachedMessages: {
			'assert unregistered locale'() {
				assert.isUndefined(getCachedMessages(bundle, 'ar'));
			},

			'assert supported locale'() {
				return i18n(bundle, 'ar').then(() => {
					assert.deepEqual(
						getCachedMessages(bundle, 'ar'),
						{
							hello: 'السلام عليكم',
							helloReply: 'و عليكم السام',
							goodbye: 'مع السلامة'
						},
						'Locale messages can be retrieved with a bundle object.'
					);
				});
			},

			'assert unsupported locale'(this: any) {
				const cached = getCachedMessages(bundle, 'un-SU-pported');
				assert.deepEqual(cached, bundle.messages, 'Default messages returned for unsupported locale.');
			},

			'assert unsupported locale added with `setLocaleMessages`'() {
				const messages = { hello: 'Oy' };
				setLocaleMessages(bundle, messages, 'en-GB');

				const cached = getCachedMessages(bundle, 'en-GB');
				assert.deepEqual(
					cached,
					{ ...bundle.messages, ...messages },
					'Messages added with `setLocaleMessages` are returned.'
				);
			},

			'assert most specific supported locale returned'() {
				return i18n(bundle, 'ar').then(() => {
					const cached = getCachedMessages(bundle, 'ar');
					assert.deepEqual(
						getCachedMessages(bundle, 'ar-IR'),
						cached,
						'Messages are returned for the most specific supported locale.'
					);
				});
			}
		},

		getMessageFormatter: {
			'without CLDR data': {
				before() {
					cldrLoad.reset();
				},

				after() {
					return fetchCldrData(['en', 'fr']);
				},

				tests: {
					'assert without loaded messages'() {
						assert.throws(
							() => {
								getMessageFormatter({ messages: {} }, 'messageKey')();
							},
							Error,
							'The bundle has not been registered.'
						);
					},

					'assert tokens replaced'() {
						return i18n(partyBundle).then(() => {
							const formatter = getMessageFormatter(partyBundle, 'simpleGuestInfo');
							const formatted = formatter({
								host: 'Nita',
								guest: 'Bryan'
							});
							assert.strictEqual(formatted, 'Nita invites Bryan to a party.');

							assert.throws(
								() => {
									formatter({
										host: 'Nita'
									});
								},
								Error,
								'Missing property guest'
							);
						});
					},

					'assert message without tokens'() {
						return i18n(bundle).then(() => {
							const formatter = getMessageFormatter(bundle, 'hello');
							assert.strictEqual(formatter(), 'Hello');
						});
					}
				}
			},

			'with CLDR data': {
				'assert without a locale'() {
					return i18n(partyBundle).then(() => {
						const formatter = getMessageFormatter(partyBundle, 'guestInfo');
						let formatted = formatter({
							host: 'Nita',
							guestCount: 0
						});
						assert.strictEqual(formatted, 'Nita does not host a party.');

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
						const formatter = getMessageFormatter(bundle, 'hello', 'ar');
						assert.strictEqual(formatter(), 'السلام عليكم');
					});
				},

				'assert unsupported locale'() {
					return i18n(bundle, 'fr').then(() => {
						const formatter = getMessageFormatter(bundle, 'hello', 'fr');
						assert.strictEqual(formatter(), 'Hello');
					});
				}
			}
		},

		i18n: {
			'assert system locale used as default'() {
				return i18n(bundle).then(function(messages: Messages) {
					assert.deepEqual(messages, {
						hello: 'Hello',
						helloReply: 'Hello',
						goodbye: 'Goodbye'
					});
				});
			},

			'assert with string locale'() {
				return i18n(bundle, 'ar').then(function(messages: Messages) {
					assert.deepEqual(
						messages,
						{
							hello: 'السلام عليكم',
							helloReply: 'و عليكم السام',
							goodbye: 'مع السلامة'
						},
						'Locale dictionary is used.'
					);
				});
			},

			'assert with nested locale'() {
				return i18n(bundle, 'ar-JO').then(function(messages: Messages) {
					// ar-JO is missing "goodbye" key
					assert.deepEqual(
						messages,
						{
							hello: 'مرحبا',
							helloReply: 'مرحبتين',
							goodbye: 'مع السلامة'
						},
						'Most specific dictionary is used with fallbacks provided.'
					);
				});
			},

			'assert with invalid locale'() {
				return i18n(bundle, 'ar-JO-').then(function(messages: Messages) {
					assert.deepEqual(
						messages,
						{
							hello: 'مرحبا',
							helloReply: 'مرحبتين',
							goodbye: 'مع السلامة'
						},
						'Only non-empty locale segments are considered.'
					);
				});
			},

			'assert unsupported locale'() {
				return i18n(bundle, 'fr-CA').then(function(messages: Messages) {
					assert.deepEqual(messages, {
						hello: 'Hello',
						helloReply: 'Hello',
						goodbye: 'Goodbye'
					});
				});
			},

			'assert bundle without locales'() {
				const { messages } = bundle;
				const localeless = { messages };

				return i18n(localeless, 'ar').then(function(messages: Messages) {
					assert.deepEqual(
						messages,
						{
							hello: 'Hello',
							helloReply: 'Hello',
							goodbye: 'Goodbye'
						},
						'Default messages returned when bundle provides no locales.'
					);
				});
			},

			'assert messages cached'() {
				return i18n(bundle, 'ar-JO')
					.then(function() {
						return i18n(bundle, 'ar-JO');
					})
					.then((messages: Messages) => {
						const cached = getCachedMessages(bundle, 'ar-JO');

						assert.strictEqual(cached, messages as any, 'Message dictionaries are cached.');
					});
			},

			'assert message dictionaries are frozen'() {
				return i18n(bundle, 'ar-JO').then(function() {
					const cached = getCachedMessages(bundle, 'ar-JO');

					assert.throws(() => {
						cached!.hello = 'Hello';
					});
				});
			}
		},

		invalidate: {
			'assert with a bundle'() {
				return i18n(bundle, 'ar').then((messages: Messages) => {
					invalidate(bundle);
					assert.isUndefined(
						getCachedMessages(bundle, 'ar'),
						'The cache is invalidated for the specified bundle.'
					);
				});
			},

			'assert without a bundle'() {
				return i18n(bundle, 'ar').then((messages: Messages) => {
					invalidate();
					assert.isUndefined(getCachedMessages(bundle, 'ar'), 'The cache is invalidated for all bundles.');
				});
			}
		},

		observeLocale: {
			'assert observer notified of locale change'() {
				const next = sinon.spy();
				const handle = observeLocale(next);

				switchLocale('ar');
				handle.destroy();

				assert.isTrue(next.calledWith('ar'), '`observer.next` called with new locale.');
			}
		},

		setLocaleMessages() {
			sinon.stub(Globalize, 'loadMessages');
			const french = { hello: 'Bonjour', goodbye: 'Au revoir' };
			const czech = { hello: 'Ahoj', goodbye: 'Ahoj' };

			setLocaleMessages(bundle, french, 'fr');
			setLocaleMessages(bundle, czech, 'cz');

			const path = '..-_build-tests-support-mocks-common-main';
			const first = (<any>Globalize).loadMessages.args[0][0].fr[path];
			const second = (<any>Globalize).loadMessages.args[1][0].cz[path];

			assert.isFrozen(first, 'locale messages should be frozen');
			assert.isFrozen(second, 'locale messages should be frozen');

			assert.deepEqual(
				getCachedMessages(bundle, 'fr'),
				{ ...french, helloReply: 'Hello' },
				'Default messages should be included where not overridden'
			);
			assert.deepEqual(
				getCachedMessages(bundle, 'cz'),
				{ ...czech, helloReply: 'Hello' },
				'Default messages should be included where not overridden'
			);

			(<any>Globalize).loadMessages.restore();
		},

		switchLocale: {
			'assert root locale updated'() {
				switchLocale('en');
				switchLocale('ar');

				assert.strictEqual(i18n.locale, 'ar');
			},

			'assert observers not updated when locale remains the same'() {
				const next = sinon.spy();
				observeLocale(next);

				switchLocale('ar');
				switchLocale('ar');

				assert.isFalse(next.calledTwice);
			},

			'assert new locale passed to Globalize'() {
				sinon.spy(Globalize, 'locale');

				return fetchCldrData(['fr']).then(
					() => {
						switchLocale('fr');
						assert.isTrue(
							(<any>Globalize).locale.calledWith('fr'),
							'Locale should be passed to Globalize.'
						);

						cldrLoad.reset();
						switchLocale('en');
						assert.strictEqual(
							(<any>Globalize).locale.callCount,
							1,
							'Locale should not be passed to Globalize.'
						);
						(<any>Globalize).locale.restore();
					},
					(error: Error) => {
						(<any>Globalize).locale.restore();
						throw error;
					}
				);
			}
		},

		locale: {
			'assert defaults to system locale'() {
				assert.strictEqual(i18n.locale, systemLocale, '`i18n.locale` defaults to the system locale.');
			},

			'assert reflects current locale'() {
				switchLocale('fr');
				assert.strictEqual(i18n.locale, 'fr', '`i18n.locale` is the current locale.');
			}
		},

		useDefault: {
			'single es6 module'() {
				assert.strictEqual(
					useDefault({
						__esModule: true,
						default: 42
					}),
					42,
					'The default export should be returned.'
				);
			},

			'single non-es6 module'() {
				const module = { value: 42 };
				assert.deepEqual(useDefault(module), module, 'The module itself should be returned.');
			},

			'all es6 modules'() {
				const modules = [42, 43].map((value: number) => {
					return { __esModule: true, default: value };
				});
				assert.sameMembers(
					useDefault(modules),
					[42, 43],
					'The default export should be returned for all modules.'
				);
			},

			'mixed module types'() {
				const modules: any[] = [42, 43].map((value: number) => {
					return { __esModule: true, default: value };
				});
				modules.push({ value: 44 });
				assert.sameDeepMembers(useDefault(modules), [42, 43, { value: 44 }]);
			}
		}
	}
});
