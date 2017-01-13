import request from '@dojo/core/request';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import loadCldrData, { CldrDataResponse } from '../../../src/cldr/load';

registerSuite({
	name: 'cldr/load',

	loadCldrData: {
		beforeEach() {
			sinon.spy(request, 'get');
		},

		afterEach() {
			(<any> request.get).restore();
		},

		basic() {
			return loadCldrData('en').then((result: CldrDataResponse) => {
				assert.strictEqual(result.supplemental.length, 7, 'All supplemental data are loaded.');
				assert.strictEqual(result['en'].length, 6, 'All locale data are loaded');

				assert.isTrue(Object.isFrozen(result.supplemental), 'Supplemental array is frozen.');
				assert.isTrue(Object.isFrozen(result['en']), 'Locale array is frozen.');

				result.supplemental.forEach((item) => {
					assert.isTrue(Object.isFrozen(item), 'Supplemental data objects are frozen.');
				});
				result['en'].forEach((item) => {
					assert.isTrue(Object.isFrozen(item), 'Locale data objects are frozen.');
				});

				const first = (<any> result['en'][0]).main;
				assert(first['en'], 'Correct locale data are returned.');
			});
		},

		'assert multiple locales'() {
			return loadCldrData([ 'en', 'en-GB' ]).then((result: CldrDataResponse) => {
				const en = (<any> result['en'][0]).main;
				const enGB = (<any> result['en-GB'][0]).main;

				assert(en['en'], 'Correct locale data are returned.');
				assert(enGB['en-GB'], 'Correct locale data are returned.');
			});
		},

		'assert unsupported locale'() {
			return loadCldrData('un-SU-pported').then(() => {
				throw Error('Test should not pass with unsupported locale.');
			}, (error) => {
				assert.strictEqual(error.message, 'No CLDR data for locale: un-SU-pported.');
			});
		},

		'assert fallback used when locale not supported'() {
			return loadCldrData('un-SU-pported', 'en').then((result: CldrDataResponse) => {
				const first = (<any> result['un-SU-pported'][0]).main;
				assert(first['en'], 'Data for fallback are returned.');
			}, (error) => {
				throw new Error('Test should not fail when a supported fallback locale is provided.');
			});
		}
	}
});
