import { around } from '../../../src/core/aspect';
import { padStart } from '../../../src/shim/string';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import {
	formatDate,
	formatRelativeTime,
	getDateFormatter,
	getDateParser,
	getRelativeTimeFormatter,
	parseDate
} from '../../../src/i18n/date';
import { switchLocale, systemLocale } from '../../../src/i18n/i18n';
import { fetchCldrData } from '../support/util';

function getOffsets(date: Date) {
	const offset = date.getTimezoneOffset();
	const longOffset = Math.round(offset / 60);
	const fullHourOffset = padStart(String(Math.abs(longOffset)), 2, '0');
	const fullSecondOffset = padStart(String(offset % 60), 2, '0');
	const fullOffset = `${fullHourOffset}:${fullSecondOffset}`;

	return [longOffset < 0 ? -1 : 1, Math.abs(longOffset), fullOffset];
}

function getTimezoneDate(date: Date, offset: number = 0): Date {
	const copy = new Date(date.getTime());
	around(copy, 'getTimezoneOffset', () => () => offset * 60);
	return copy;
}

function getTimezones(date: Date, standard: string = 'GMT') {
	const [sign, longOffset, fullOffset] = getOffsets(date);
	const timeSeparator = standard === 'UTC' ? '\u2212' : '-';
	const fullSeparator = sign < 0 ? '+' : timeSeparator;
	const zeroPattern = /^[0:]+$/;
	return [
		`${standard}${longOffset ? (sign < 0 ? '+' : timeSeparator) + longOffset : ''}`,
		`${standard}${zeroPattern.test(fullOffset as string) ? '' : fullSeparator + fullOffset}`
	];
}

interface DateOptions {
	short: string;
	medium: string;
	long: string;
	full: string;
}

interface SkeletonOptions {
	GyMMMd: string;
}

interface DateOptionsTypes {
	date: DateOptions;
	datetime: DateOptions;
	skeleton: SkeletonOptions;
	time: DateOptions;
}

type DateOptionsKeys = keyof DateOptionsTypes;

function getDateOptions<T extends DateOptionsKeys>(type: T, timezoneOffset?: number): any {
	const date = getTimezoneDate(new Date(1815, 11, 10, 11, 27), timezoneOffset);
	const [gmtLong, gmtFull] = getTimezones(date);
	const [utcLong, utcFull] = getTimezones(date, 'UTC');
	const values = {
		en: {
			date: {
				short: '12/10/15',
				medium: 'Dec 10, 1815',
				long: 'December 10, 1815',
				full: 'Sunday, December 10, 1815'
			},

			datetime: {
				short: '12/10/15, 11:27 AM',
				medium: 'Dec 10, 1815, 11:27:00 AM',
				long: `December 10, 1815 at 11:27:00 AM ${gmtLong}`,
				full: `Sunday, December 10, 1815 at 11:27:00 AM ${gmtFull}`
			},

			skeleton: {
				GyMMMd: 'Dec 10, 1815 AD'
			},

			time: {
				short: '11:27 AM',
				medium: '11:27:00 AM',
				long: `11:27:00 AM ${gmtLong}`,
				full: `11:27:00 AM ${gmtFull}`
			}
		},

		fr: {
			date: {
				short: '10/12/1815',
				medium: '10 déc. 1815',
				long: '10 décembre 1815',
				full: 'dimanche 10 décembre 1815'
			},

			datetime: {
				short: '10/12/1815 11:27',
				medium: '10 déc. 1815 à 11:27:00',
				long: `10 décembre 1815 à 11:27:00 ${utcLong}`,
				full: `dimanche 10 décembre 1815 à 11:27:00 ${utcFull}`
			},

			skeleton: {
				GyMMMd: '10 déc. 1815 ap. J.-C.'
			},

			time: {
				short: '11:27',
				medium: '11:27:00',
				long: `11:27:00 ${utcLong}`,
				full: `11:27:00 ${utcFull}`
			}
		}
	};

	const enValues = values['en'][type];
	const frValues = values['fr'][type];

	return [enValues, frValues];
}

function getKeys<T extends DateOptionsKeys>(
	object: SkeletonOptions | DateOptions,
	key: T
): Array<keyof DateOptionsTypes[T]> {
	return <any>Object.keys(object);
}

registerSuite('date', {
	before() {
		// Load the CLDR data for the locales used in the tests ('en' and 'fr');
		return fetchCldrData(['en', 'fr']).then(() => {
			switchLocale('en');
		});
	},

	after() {
		switchLocale(systemLocale);
	},

	tests: {
		getDateFormatter: {
			'assert without a locale'() {
				const formatter = getDateFormatter();
				const date = new Date(1815, 11, 10);
				assert.strictEqual(formatter(date), '12/10/1815');
			},

			'assert with a locale'() {
				const formatter = getDateFormatter('fr');
				const date = new Date(1815, 11, 10);
				assert.strictEqual(formatter(date), '10/12/1815');
			},

			'with options': (function() {
				function getAssertion<T extends DateOptionsKeys>(type: T, timezoneOffset?: number) {
					const date = getTimezoneDate(new Date(1815, 11, 10, 11, 27), timezoneOffset);
					return function() {
						const [enValues, frValues] = getDateOptions(type, timezoneOffset);

						getKeys(enValues, type).forEach((key) => {
							const formatter = getDateFormatter({ [type]: key });
							assert.strictEqual(formatter(date), enValues[key]);
						});

						getKeys(frValues, type).forEach((key) => {
							const formatter = getDateFormatter({ [type]: key }, 'fr');
							assert.strictEqual(formatter(date), frValues[key]);
						});
					};
				}

				return {
					'assert "date" option': getAssertion('date'),
					'"time" option': {
						'assert no timezone offset': getAssertion('time'),
						'assert with timezone offset': getAssertion('time', 6)
					},
					'"datetime" option': {
						'assert no timezone offset': getAssertion('datetime'),
						'assert with timezone offset': getAssertion('datetime', 6)
					},
					'assert "skeleton" option': getAssertion('skeleton')
				};
			})()
		},

		getDateParser: {
			'assert without a locale'() {
				assert.strictEqual(getDateParser()('12/10/1815').toISOString(), new Date(1815, 11, 10).toISOString());
			},

			'assert with a locale'() {
				assert.strictEqual(
					getDateParser('fr')('10/12/1815').toISOString(),
					new Date(1815, 11, 10).toISOString()
				);
			},

			'with options': {
				'assert "date" option'() {
					const date = new Date(1815, 11, 10);
					const [enValues, frValues] = getDateOptions('date');

					getKeys(enValues, 'date').forEach((key) => {
						// The expected "short" year format in English is the last two digits,
						// with the current century assumed.
						const expected = key === 'short' ? new Date(2015, 11, 10) : date;
						assert.strictEqual(
							getDateParser({ date: key })(enValues[key]).toISOString(),
							expected.toISOString()
						);
					});

					getKeys(frValues, 'date').forEach((key) => {
						assert.strictEqual(
							getDateParser({ date: key }, 'fr')(frValues[key]).toISOString(),
							date.toISOString()
						);
					});
				},

				'assert "time" option'() {
					const expected = new Date();
					expected.setHours(11);
					expected.setMinutes(27);
					expected.setSeconds(0);
					expected.setMilliseconds(0);

					const [gmtLong, gmtFull] = getTimezones(expected);
					const [utcLong, utcFull] = getTimezones(expected, 'UTC');
					const enValues = {
						short: '11:27 AM',
						medium: '11:27:00 AM',
						long: `11:27:00 AM ${gmtLong}`,
						full: `11:27:00 AM ${gmtFull}`
					};
					const frValues = {
						short: '11:27',
						medium: '11:27:00',
						long: `11:27:00 ${utcLong}`,
						full: `11:27:00 ${utcFull}`
					};

					getKeys(enValues, 'time').forEach((key) => {
						assert.strictEqual(
							getDateParser({ time: key })(enValues[key]).toISOString(),
							expected.toISOString()
						);
					});
					getKeys(frValues, 'time').forEach((key) => {
						assert.strictEqual(
							getDateParser({ time: key }, 'fr')(frValues[key]).toISOString(),
							expected.toISOString()
						);
					});
				},

				'assert "datetime" option'() {
					const expected = new Date(2015, 11, 10, 11, 27);
					const [gmtLong, gmtFull] = getTimezones(expected);
					const [utcLong, utcFull] = getTimezones(expected, 'UTC');
					const enValues = {
						short: '12/10/15, 11:27 AM',
						medium: 'Dec 10, 2015, 11:27:00 AM',
						long: `December 10, 2015 at 11:27:00 AM ${gmtLong}`,
						full: `Sunday, December 10, 2015 at 11:27:00 AM ${gmtFull}`
					};
					const frValues = {
						short: '10/12/2015 11:27',
						medium: '10 déc. 2015 à 11:27:00',
						long: `10 décembre 2015 à 11:27:00 ${utcLong}`,
						full: `dimanche 10 décembre 2015 à 11:27:00 ${utcFull}`
					};

					getKeys(enValues, 'datetime').forEach((key) => {
						assert.strictEqual(
							getDateParser({ datetime: key })(enValues[key]).toISOString(),
							expected.toISOString()
						);
					});
					getKeys(frValues, 'datetime').forEach((key) => {
						assert.strictEqual(
							getDateParser({ datetime: key }, 'fr')(frValues[key]).toISOString(),
							expected.toISOString()
						);
					});
				},

				'assert "skeleton" option'() {
					const expected = new Date(1815, 11, 10).toISOString();
					const [enValues, frValues] = getDateOptions('skeleton');

					getKeys(enValues, 'skeleton').forEach((key) => {
						const parser = getDateParser({ skeleton: 'GyMMMd' });
						assert.strictEqual(parser(enValues[key]).toISOString(), expected);
					});

					getKeys(enValues, 'skeleton').forEach((key) => {
						const parser = getDateParser({ skeleton: 'GyMMMd' }, 'fr');
						assert.strictEqual(parser(frValues[key]).toISOString(), expected);
					});
				}
			}
		},

		formatDate: {
			'assert without a locale'() {
				assert.strictEqual(formatDate(new Date(1815, 11, 10)), '12/10/1815');
			},

			'assert with a locale'() {
				assert.strictEqual(formatDate(new Date(1815, 11, 10), 'fr'), '10/12/1815');
			},

			'assert options': (function() {
				function getAssertion<T extends DateOptionsKeys>(type: T, timezoneOffset?: number) {
					const date = getTimezoneDate(new Date(1815, 11, 10, 11, 27), timezoneOffset);

					return function() {
						const [enValues, frValues] = getDateOptions(type, timezoneOffset);

						getKeys(enValues, type).forEach((key) => {
							assert.strictEqual(formatDate(date, { [type]: key }), enValues[key]);
						});
						getKeys(frValues, type).forEach((key) => {
							assert.strictEqual(formatDate(date, { [type]: key }, 'fr'), frValues[key]);
						});
					};
				}

				return {
					'assert "date" option': getAssertion('date'),
					'"time" values': {
						'assert no timezone offset': getAssertion('time'),
						'assert with timezone offset': getAssertion('time', 6)
					},
					'"datetime" values': {
						'assert no timezone offset': getAssertion('datetime'),
						'assert with timezone offset': getAssertion('datetime', 6)
					}
				};
			})()
		},

		formatRelativeTime: {
			'assert without a locale'() {
				assert.strictEqual(formatRelativeTime(-1, 'week'), 'last week');
				assert.strictEqual(formatRelativeTime(-3, 'week'), '3 weeks ago');
				assert.strictEqual(formatRelativeTime(1, 'week'), 'next week');
				assert.strictEqual(formatRelativeTime(3, 'week'), 'in 3 weeks');
			},

			'assert with a locale'() {
				assert.strictEqual(formatRelativeTime(-1, 'week', 'fr'), 'la semaine dernière');
				assert.strictEqual(formatRelativeTime(-3, 'week', 'fr'), 'il y a 3 semaines');
				assert.strictEqual(formatRelativeTime(1, 'week', 'fr'), 'la semaine prochaine');
				assert.strictEqual(formatRelativeTime(3, 'week', 'fr'), 'dans 3 semaines');
			},

			'assert options': {
				'assert "short" option'() {
					assert.strictEqual(formatRelativeTime(-1, 'week', { form: 'short' }), 'last wk.');
					assert.strictEqual(formatRelativeTime(-3, 'week', { form: 'short' }), '3 wk. ago');
					assert.strictEqual(formatRelativeTime(1, 'week', { form: 'short' }), 'next wk.');
					assert.strictEqual(formatRelativeTime(3, 'week', { form: 'short' }), 'in 3 wk.');

					assert.strictEqual(formatRelativeTime(-1, 'week', { form: 'short' }, 'fr'), 'la semaine dernière');
					assert.strictEqual(formatRelativeTime(-3, 'week', { form: 'short' }, 'fr'), 'il y a 3 sem.');
					assert.strictEqual(formatRelativeTime(1, 'week', { form: 'short' }, 'fr'), 'la semaine prochaine');
					assert.strictEqual(formatRelativeTime(3, 'week', { form: 'short' }, 'fr'), 'dans 3 sem.');
				},

				'assert "narrow" option'() {
					assert.strictEqual(formatRelativeTime(-1, 'week', { form: 'narrow' }), 'last wk.');
					assert.strictEqual(formatRelativeTime(-3, 'week', { form: 'narrow' }), '3 wk. ago');
					assert.strictEqual(formatRelativeTime(1, 'week', { form: 'narrow' }), 'next wk.');
					assert.strictEqual(formatRelativeTime(3, 'week', { form: 'narrow' }), 'in 3 wk.');

					assert.strictEqual(formatRelativeTime(-1, 'week', { form: 'narrow' }, 'fr'), 'la semaine dernière');
					assert.strictEqual(formatRelativeTime(-3, 'week', { form: 'narrow' }, 'fr'), '-3 sem.');
					assert.strictEqual(formatRelativeTime(1, 'week', { form: 'narrow' }, 'fr'), 'la semaine prochaine');
					assert.strictEqual(formatRelativeTime(3, 'week', { form: 'narrow' }, 'fr'), '+3 sem.');
				}
			}
		},

		parseDate: {
			'assert without a locale'() {
				assert.strictEqual(parseDate('12/10/1815').toISOString(), new Date(1815, 11, 10).toISOString());
			},

			'assert with a locale'() {
				assert.strictEqual(parseDate('10/12/1815', 'fr').toISOString(), new Date(1815, 11, 10).toISOString());
			},

			'with options': {
				'assert "date" option'() {
					const date = new Date(1815, 11, 10);
					const [enValues, frValues] = getDateOptions('date');

					getKeys(enValues, 'date').forEach((key) => {
						// The expected "short" year format in English is the last two digits,
						// with the current century assumed.
						const expected = key === 'short' ? new Date(2015, 11, 10) : date;
						assert.strictEqual(
							parseDate(enValues[key], { date: key }).toISOString(),
							expected.toISOString()
						);
					});

					getKeys(frValues, 'date').forEach((key) => {
						assert.strictEqual(
							parseDate(frValues[key], { date: key }, 'fr').toISOString(),
							date.toISOString()
						);
					});
				},

				'assert "time" option'() {
					const expected = new Date();
					expected.setHours(11);
					expected.setMinutes(27);
					expected.setSeconds(0);
					expected.setMilliseconds(0);

					const [gmtLong, gmtFull] = getTimezones(expected);
					const [utcLong, utcFull] = getTimezones(expected, 'UTC');
					const enValues = {
						short: '11:27 AM',
						medium: '11:27:00 AM',
						long: `11:27:00 AM ${gmtLong}`,
						full: `11:27:00 AM ${gmtFull}`
					};
					const frValues = {
						short: '11:27',
						medium: '11:27:00',
						long: `11:27:00 ${utcLong}`,
						full: `11:27:00 ${utcFull}`
					};

					getKeys(enValues, 'time').forEach((key) => {
						assert.strictEqual(
							parseDate((<any>enValues)[key], { time: key }).toISOString(),
							expected.toISOString()
						);
					});
					getKeys(frValues, 'time').forEach((key) => {
						assert.strictEqual(
							parseDate((<any>frValues)[key], { time: key }, 'fr').toISOString(),
							expected.toISOString()
						);
					});
				},

				'assert "datetime" option'() {
					const expected = new Date(2015, 11, 10, 11, 27);
					const [gmtLong, gmtFull] = getTimezones(expected);
					const [utcLong, utcFull] = getTimezones(expected, 'UTC');
					const enValues = {
						short: '12/10/15, 11:27 AM',
						medium: 'Dec 10, 2015, 11:27:00 AM',
						long: `December 10, 2015 at 11:27:00 AM ${gmtLong}`,
						full: `Sunday, December 10, 2015 at 11:27:00 AM ${gmtFull}`
					};
					const frValues = {
						short: '10/12/2015 11:27',
						medium: '10 déc. 2015 à 11:27:00',
						long: `10 décembre 2015 à 11:27:00 ${utcLong}`,
						full: `dimanche 10 décembre 2015 à 11:27:00 ${utcFull}`
					};

					getKeys(enValues, 'datetime').forEach((key) => {
						assert.strictEqual(
							parseDate((<any>enValues)[key], { datetime: key }).toISOString(),
							expected.toISOString()
						);
					});
					getKeys(frValues, 'datetime').forEach((key) => {
						assert.strictEqual(
							parseDate((<any>frValues)[key], { datetime: key }, 'fr').toISOString(),
							expected.toISOString()
						);
					});
				},

				'assert "skeleton" option'() {
					const expected = new Date(1815, 11, 10).toISOString();
					const [enValues, frValues] = getDateOptions('skeleton');

					getKeys(enValues, 'skeleton').forEach((key) => {
						assert.strictEqual(parseDate(enValues[key], { skeleton: 'GyMMMd' }).toISOString(), expected);
					});

					getKeys(enValues, 'skeleton').forEach((key) => {
						assert.strictEqual(
							parseDate(frValues[key], { skeleton: 'GyMMMd' }, 'fr').toISOString(),
							expected
						);
					});
				}
			}
		},

		getRelativeTimeFormatter: {
			'assert without a locale'() {
				const formatter = getRelativeTimeFormatter('week');
				assert.strictEqual(formatter(-1), 'last week');
				assert.strictEqual(formatter(-3), '3 weeks ago');
				assert.strictEqual(formatter(1), 'next week');
				assert.strictEqual(formatter(3), 'in 3 weeks');
			},

			'assert with a locale'() {
				const formatter = getRelativeTimeFormatter('week', 'fr');
				assert.strictEqual(formatter(-1), 'la semaine dernière');
				assert.strictEqual(formatter(-3), 'il y a 3 semaines');
				assert.strictEqual(formatter(1), 'la semaine prochaine');
				assert.strictEqual(formatter(3), 'dans 3 semaines');
			},

			'assert options': {
				'assert "short" option'() {
					const enFormatter = getRelativeTimeFormatter('week', { form: 'short' });
					assert.strictEqual(enFormatter(-1), 'last wk.');
					assert.strictEqual(enFormatter(-3), '3 wk. ago');
					assert.strictEqual(enFormatter(1), 'next wk.');
					assert.strictEqual(enFormatter(3), 'in 3 wk.');

					const frFormatter = getRelativeTimeFormatter('week', { form: 'short' }, 'fr');
					assert.strictEqual(frFormatter(-1), 'la semaine dernière');
					assert.strictEqual(frFormatter(-3), 'il y a 3 sem.');
					assert.strictEqual(frFormatter(1), 'la semaine prochaine');
					assert.strictEqual(frFormatter(3), 'dans 3 sem.');
				},

				'assert "narrow" option'() {
					const enFormatter = getRelativeTimeFormatter('week', { form: 'narrow' });
					assert.strictEqual(enFormatter(-1), 'last wk.');
					assert.strictEqual(enFormatter(-3), '3 wk. ago');
					assert.strictEqual(enFormatter(1), 'next wk.');
					assert.strictEqual(enFormatter(3), 'in 3 wk.');

					const frFormatter = getRelativeTimeFormatter('week', { form: 'narrow' }, 'fr');
					assert.strictEqual(frFormatter(-1), 'la semaine dernière');
					assert.strictEqual(frFormatter(-3), '-3 sem.');
					assert.strictEqual(frFormatter(1), 'la semaine prochaine');
					assert.strictEqual(frFormatter(3), '+3 sem.');
				}
			}
		}
	}
});
