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

					async 'assert tokens replaced'() {
						await i18n(partyBundle);
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
					},

					async 'assert message without tokens'() {
						await i18n(bundle);
						const formatted = formatMessage(bundle, 'hello');
						assert.strictEqual(formatted, 'Hello');
					},

					async 'assert default locale used'() {
						switchLocale('ar');
						await i18n(bundle, 'ar');
						const formatted = formatMessage(bundle, 'hello');
						assert.strictEqual(formatted, 'السلام عليكم');
					}
				}
			},

			'with CLDR data': {
				async 'assert without a locale'() {
					await i18n(partyBundle);
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
				},

				async 'assert supported locale'() {
					await i18n(bundle, 'ar');
					assert.strictEqual(formatMessage(bundle, 'hello', {}, 'ar'), 'السلام عليكم');
				},

				async 'assert unsupported locale'() {
					await i18n(bundle, 'fr');
					assert.strictEqual(formatMessage(bundle, 'hello', {}, 'fr'), 'Hello');
				}
			}
		},

		getCachedMessages: {
			'assert unregistered locale'() {
				assert.isUndefined(getCachedMessages(bundle, 'ar'));
			},

			async 'assert supported locale'() {
				await i18n(bundle, 'ar');
				assert.deepEqual(
					getCachedMessages(bundle, 'ar'),
					{
						hello: 'السلام عليكم',
						helloReply: 'و عليكم السام',
						goodbye: 'مع السلامة'
					},
					'Locale messages can be retrieved with a bundle object.'
				);
			},

			'assert unsupported locale'(this: any) {
				const cached = getCachedMessages(bundle, 'un-SU-pported');
				assert.deepEqual(cached, bundle.messages, 'Default messages returned for unsupported locale.');
			},

			'assert unsupported locale added with `setLocaleMessages`'() {
				try {
					const messages = { hello: 'Oy' };
					setLocaleMessages(bundle, messages, 'en-GB');

					const cached = getCachedMessages(bundle, 'en-GB');
					assert.deepEqual(
						cached,
						{ ...bundle.messages, ...messages },
						'Messages added with `setLocaleMessages` are returned.'
					);
				} finally {
					setLocaleMessages(bundle, {}, 'en-GB');
				}
			},

			async 'assert most specific supported locale returned'() {
				await i18n(bundle, 'ar');
				const cached = getCachedMessages(bundle, 'ar');
				assert.deepEqual(
					getCachedMessages(bundle, 'ar-IR'),
					cached,
					'Messages are returned for the most specific supported locale.'
				);
			},

			async 'assert locale order does not effect result'() {
				await i18n(bundle, 'ar-IR');
				const cached = getCachedMessages(bundle, 'ar-IR');
				assert.deepEqual(
					getCachedMessages(bundle, 'ar'),
					cached,
					'Caching is not affected by the order in which locale messages are requested'
				);
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

					async 'assert tokens replaced'() {
						await i18n(partyBundle);
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
					},

					async 'assert message without tokens'() {
						await i18n(bundle);
						const formatter = getMessageFormatter(bundle, 'hello');
						assert.strictEqual(formatter(), 'Hello');
					},

					async 'assert unsupported locale'() {
						await i18n(bundle, 'en-GB');
						const formatter = getMessageFormatter(bundle, 'hello', 'en-GB');
						assert.strictEqual(formatter(), 'Hello');
					},

					async 'assert partially-supported locale'() {
						await i18n(bundle, 'ar-IR');
						const formatter = getMessageFormatter(bundle, 'hello', 'ar-IR');
						assert.strictEqual(formatter(), 'السلام عليكم');
					}
				}
			},

			'with CLDR data': {
				async 'assert without a locale'() {
					await i18n(partyBundle);
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
				},

				async 'assert supported locale'() {
					await i18n(bundle, 'ar');
					const formatter = getMessageFormatter(bundle, 'hello', 'ar');
					assert.strictEqual(formatter(), 'السلام عليكم');
				},

				async 'assert unsupported locale'() {
					await i18n(bundle, 'fr');
					const formatter = getMessageFormatter(bundle, 'hello', 'fr');
					assert.strictEqual(formatter(), 'Hello');
				},

				async 'assert partially-supported locale'() {
					await i18n(bundle, 'ar-IR');
					const formatter = getMessageFormatter(bundle, 'hello', 'ar-IR');
					assert.strictEqual(formatter(), 'السلام عليكم');
				}
			}
		},

		i18n: {
			async 'assert system locale used as default'() {
				const messages = await i18n(bundle);
				assert.deepEqual(messages, {
					hello: 'Hello',
					helloReply: 'Hello',
					goodbye: 'Goodbye'
				});
			},

			async 'assert with string locale'() {
				const messages = await i18n(bundle, 'ar');
				assert.deepEqual(
					messages,
					{
						hello: 'السلام عليكم',
						helloReply: 'و عليكم السام',
						goodbye: 'مع السلامة'
					},
					'Locale dictionary is used.'
				);
			},

			async 'assert with nested locale'() {
				const messages = await i18n(bundle, 'ar-JO');
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
			},

			async 'assert with invalid locale'() {
				const messages = await i18n(bundle, 'ar-JO-');
				assert.deepEqual(
					messages,
					{
						hello: 'مرحبا',
						helloReply: 'مرحبتين',
						goodbye: 'مع السلامة'
					},
					'Only non-empty locale segments are considered.'
				);
			},

			async 'assert unsupported locale'() {
				const messages = await i18n(bundle, 'fr-CA');
				assert.deepEqual(messages, {
					hello: 'Hello',
					helloReply: 'Hello',
					goodbye: 'Goodbye'
				});
			},

			async 'assert bundle without locales'() {
				const localeless = { messages: bundle.messages };

				const messages = await i18n(localeless, 'ar');
				assert.deepEqual(
					messages,
					{
						hello: 'Hello',
						helloReply: 'Hello',
						goodbye: 'Goodbye'
					},
					'Default messages returned when bundle provides no locales.'
				);
			},

			async 'assert messages cached'() {
				await i18n(bundle, 'ar-JO');
				const messages = await i18n(bundle, 'ar-JO');
				const cached = getCachedMessages(bundle, 'ar-JO');
				assert.strictEqual(cached, messages as any, 'Message dictionaries are cached.');
			},

			async 'assert message dictionaries are frozen'() {
				await i18n(bundle, 'ar-JO');
				const cached = getCachedMessages(bundle, 'ar-JO');

				assert.throws(() => {
					cached!.hello = 'Hello';
				});
			}
		},

		invalidate: {
			async 'assert with a bundle'() {
				await i18n(bundle, 'ar');
				invalidate(bundle);
				assert.isUndefined(
					getCachedMessages(bundle, 'ar'),
					'The cache is invalidated for the specified bundle.'
				);
			},

			async 'assert without a bundle'() {
				await i18n(bundle, 'ar');
				invalidate();
				assert.isUndefined(getCachedMessages(bundle, 'ar'), 'The cache is invalidated for all bundles.');
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
			try {
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
			} finally {
				setLocaleMessages(bundle, {}, 'fr');
				setLocaleMessages(bundle, {}, 'cz');
				(<any>Globalize).loadMessages.restore();
			}
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
