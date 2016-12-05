import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import global from '../../../src/global';
import load from '../../../src/load/webpack';

interface WebpackModules {
	[id: number]: any;
}

let webpackModules: WebpackModules;
function setModules(modules?: { [mid: string]: any }) {
	let nextId = 0;
	webpackModules = Object.create(null) as WebpackModules;

	if (modules) {
		const idMap = Object.create(null);
		Object.keys(modules).forEach((mid: string) => {
			const id = nextId++;
			idMap[mid] = { id, lazy: mid.indexOf('bundle!') > -1 };
			webpackModules[id] = modules[mid];
		});
		global.__modules__ = idMap;
	}
	else {
		global.__modules__ = null;
	}
}

registerSuite({
	name: 'load/webpack',

	setup() {
		global.__webpack_require__ = function (id: number): any {
			return webpackModules[id];
		};
	},

	teardown() {
		delete global.__webpack_require__;
	},

	beforeEach() {
		setModules({
			'/path/to/first': {
				foo: 'foo'
			},
			'/path/to/second': {
				foo: 'bar'
			},
			'/path/bar': {
				bar: 'baz'
			},
			'/other': {
				value: 'The quick brown fox jumped over the lazy dog.'
			},
			'bundle!lazy': function (callback: (value: any) => any) {
				callback({ value: 'lazy loaded' });
			}
		});
	},

	afterEach() {
		setModules();
	},

	'without __modules'() {
		setModules();
		return load('non-existent/module').then(() => {
			throw new Error('Should not resolve.');
		}, (error: Error) => {
			assert.instanceOf(error, Error);
			assert.strictEqual(error.message, 'Missing module: non-existent/module');
		});
	},

	'contextual require': {
		'absolute path'() {
			return load(() => '/path/to/first', '/path/to/second').then((results: any[]) => {
				assert.strictEqual(results.length, 1);
				assert.strictEqual(results[0].foo, 'bar');
			}, (error: Error) => {
				throw new Error(`Promise should not reject\n${error.message}`);
			});
		},

		'relative path (same directory)'() {
			return load(() => '/path/to/first', './second').then((results: any[]) => {
				assert.strictEqual(results.length, 1);
				assert.strictEqual(results[0].foo, 'bar');
			}, (error: Error) => {
				throw new Error(`Promise should not reject\n${error.message}`);
			});
		},

		'relative path (up one directory)'() {
			return load(() => '/path/to/first', '../bar').then((results: any[]) => {
				assert.strictEqual(results.length, 1);
				assert.strictEqual(results[0].bar, 'baz');
			});
		},

		'relative path (up two directories)'() {
			return load(() => '/path/to/nested/module', '../../bar').then((results: any[]) => {
				assert.strictEqual(results.length, 1);
				assert.strictEqual(results[0].bar, 'baz');
			});
		},

		'relative path (beyond root directory)'() {
			assert.throws(() => {
				load(() => '/path/to/first', '../../../../../../other');
			}, Error, 'Path cannot go beyond root directory.');
		}
	},

	'normal require': {
		'absolute path'() {
			return load('/path/to/second').then((results: any[]) => {
				assert.strictEqual(results.length, 1);
				assert.strictEqual(results[0].foo, 'bar');
			}, (error: Error) => {
				throw new Error(`Promise should not reject\n${error.message}`);
			});
		},

		'relative path'() {
			return load('./path/to/second').then((results: any[]) => {
				assert.strictEqual(results.length, 1);
				assert.strictEqual(results[0].foo, 'bar');
			}, (error: Error) => {
				throw new Error(`Promise should not reject\n${error.message}`);
			});
		}
	},

	'bundle loader modules'() {
		return load('bundle!lazy').then((results: any[]) => {
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].value, 'lazy loaded');
		}, (error: Error) => {
			throw new Error(`Promise should not reject\n${error.message}`);
		});
	}
});
