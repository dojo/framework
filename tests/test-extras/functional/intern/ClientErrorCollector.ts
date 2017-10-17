const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import Command from '@theintern/leadfoot/Command';
import { Require } from '@dojo/interfaces/loader';
import ClientErrorCollector from '../../../src/intern/ClientErrorCollector';

declare const require: Require;

registerSuite('ClientErrorCollector', {

	'client errors are returned'() {
		const collector = new ClientErrorCollector(this.remote);

		return this.remote
			.get(`${__dirname}/ClientErrorCollector.html`)
			.then(() => collector.init())
			.execute('__throw_an_error()', [])
			.then(() => collector.finish())
			.then((results) => {
				assert.isArray(results, 'Results should be an array');
				assert.strictEqual(results!.length, 1, 'Should have a single element');
				const [ result ] = results!;
				assert.include(result.message, 'Ooops...', 'Should contain the correct error name');
				assert.include((<any> result.source), 'tests/functional/intern/ClientErrorCollector.html', 'Should be from the correct source');
				assert.isNumber(result.colno);
				assert.isNumber(result.lineno);
				assert.isObject(result.error);
				if (result.error) {
					assert.include(result.error.message, 'Ooops...');
					assert.strictEqual(result.error.name, 'Error');
				}
			});
	},

	'all client errors are returned'() {
		const collector = new ClientErrorCollector(this.remote);

		return this.remote
			.get(`${__dirname}/ClientErrorCollector.html`)
			.then(() => collector.init())
			.execute('__throw_an_error()', [])
			.execute('__throw_an_error()', [])
			.then(() => collector.finish())
			.then((results) => {
				assert.isArray(results, 'Results should be an array');
				assert.strictEqual(results!.length, 2, 'Should have a single element');
			});
	},

	'no client errors are returned'() {
		const collector = new ClientErrorCollector(this.remote);

		return this.remote
			.get(`${__dirname}/ClientErrorCollector.html`)
			.then(() => collector.init())
			.then(() => collector.finish())
			.then((results) => {
				assert.isArray(results, 'Results should be an array');
				assert.strictEqual(results!.length, 0, 'Should have no elements');
			});
	},

	'assertNoErrors': {
		'no errors'() {
			const collector = new ClientErrorCollector(this.remote);

			return this.remote
				.get(`${__dirname}/ClientErrorCollector.html`)
				.then(() => collector.init())
				.then(() => collector.assertNoErrors());
		},

		'throws on error'() {
			const collector = new ClientErrorCollector(this.remote);

			return this.remote
				.get(`${__dirname}/ClientErrorCollector.html`)
				.then(() => collector.init())
				.execute('__throw_an_error()', [])
				.then<Command<any>>(() => {
					return collector.assertNoErrors()
						.catch((e: Error) => {
							assert.instanceOf(e, Error);
							assert.include(e.message, 'Ooops...');
							assert.strictEqual(e.name, 'Error');
						});
				});
		}
	}
});
