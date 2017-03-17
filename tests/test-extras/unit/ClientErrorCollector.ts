import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import ClientErrorCollector from '../../src/ClientErrorCollector';
// import * as Promise from 'dojo/Promise';
import * as Command from 'leadfoot/Command';

let resultString = '';
let lastResult: any;

const mockRemote: Command<void> = <any> {
	execute(...args: any[]) {
		return mockRemote;
	},

	then(executor: (arg: any) => any) {
		if (Array.isArray(lastResult)) {
			lastResult = executor(lastResult);
		}
		else {
			lastResult = executor(resultString);
		}
		return mockRemote;
	}
};

registerSuite({
	name: 'ClientErrorCollector',

	'init()': {
		'invocation'() {
			const collector = new ClientErrorCollector(mockRemote);
			collector.init()
				.execute(() => {}, []);
		},

		'already init throws'() {
			const collector = new ClientErrorCollector(mockRemote);
			collector.init();
			assert.throws(() => {
				collector.init();
			}, Error, 'ClientErrorCollector already initialised');
		}
	},

	'finish()': {
		'inocation'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[]';
			collector.init()
				.then(() => {
					collector.finish();
					assert.isArray(lastResult);
					assert.lengthOf(lastResult, 0);
				});
		},

		'errors returned'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10,"error":{"message":"Ooops...","name":"TypeError","stack":""}}]';
			collector.init()
				.then(() => {
					collector.finish();
					assert.isArray(lastResult);
					assert.lengthOf(lastResult, 1);
					const [ result ] = lastResult;
					assert.isObject(result);
					assert.strictEqual(result.message, 'Ooops...');
				});
		},

		'without init throws'() {
			const collector = new ClientErrorCollector(mockRemote);
			assert.throws(() => {
				collector.finish();
			}, Error, 'ClientErrorCollector not initialised');
		}
	},

	'assertNoErrors()': {
		'no errors'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					collector.assertNoErrors();
				});
		},

		'Error'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10,"error":{"message":"Ooops...","name":"Error","stack":""}}]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					assert.throws(() => {
						collector.assertNoErrors();
					}, Error);
				});
		},

		'EvalError'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10,"error":{"message":"Ooops...","name":"EvalError","stack":""}}]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					assert.throws(() => {
						collector.assertNoErrors();
					}, EvalError);
				});
		},

		'RangeError'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10,"error":{"message":"Ooops...","name":"RangeError","stack":""}}]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					assert.throws(() => {
						collector.assertNoErrors();
					}, RangeError);
				});
		},

		'ReferenceError'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10,"error":{"message":"Ooops...","name":"ReferenceError","stack":""}}]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					assert.throws(() => {
						collector.assertNoErrors();
					}, ReferenceError);
				});
		},

		'SyntaxError'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10,"error":{"message":"Ooops...","name":"SyntaxError","stack":""}}]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					assert.throws(() => {
						collector.assertNoErrors();
					}, SyntaxError);
				});
		},

		'TypeError'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10,"error":{"message":"Ooops...","name":"TypeError","stack":""}}]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					assert.throws(() => {
						collector.assertNoErrors();
					}, TypeError);
				});
		},

		'no error object'() {
			const collector = new ClientErrorCollector(mockRemote);
			resultString = '[{"message":"Ooops...","source":"somefile.js","lineno":10,"colno":10}]';
			lastResult = undefined;
			collector.init()
				.then(() => {
					assert.throws(() => {
						collector.assertNoErrors();
					}, Error);
				});
		}
	}
});
