const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as sinon from 'sinon';
import global from '@dojo/shim/global';
import { isPlugin as utilIsPlugin, useDefault as utilUseDefault } from '../../../src/load/util';
import load, { isPlugin, useDefault } from '../../../src/load/webpack';

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

registerSuite('load/webpack', {
	before() {
		global.__webpack_require__ = function (id: number): any {
			return webpackModules[id];
		};
	},

	after() {
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
			'bundle!lazy'(callback: (value: any) => any) {
				callback({ value: 'lazy loaded' });
			},
			'plugin!normalize': {
				normalize: sinon.stub().returns('normalized/path/to/resource'),
				load: sinon.spy()
			},
			'plugin!resource/id': {
				load: sinon.spy()
			},
			'plugin!./resource/id': {
				load: sinon.spy()
			},
			'parent/plugin!./resource/id': {
				load: sinon.spy()
			}
		});
	},

	afterEach() {
		setModules();
	},

	tests: {
		api() {
			assert.strictEqual(isPlugin, utilIsPlugin, '`isPlugin` should be re-exported.');
			assert.strictEqual(useDefault, utilUseDefault, '`useDefault` should be re-exported.');
		},

		'without __modules__'() {
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
		},

		'plugin modules': {
			'with normalize method'() {
				const mid = 'plugin!normalize';
				return load(mid).then(() => {
					const module = webpackModules[global.__modules__[mid].id];
					assert.isTrue(module.normalize.calledWith('normalize'));
					assert.strictEqual(module.normalize.args[0][1]('normalize'), 'normalize',
						'`normalize` should be passed an identity resolver.');
					assert.isTrue(module.load.calledWith('normalized/path/to/resource', load));
				}, (error: Error) => {
					throw new Error(`Promise should not reject\n${error.message}`);
				});
			},

			'without normalize method': {
				'with a context method'() {
					const mid = 'plugin!./resource/id';
					const context = () => 'parent/sibling';
					return load(context, mid).then(() => {
						const module = webpackModules[global.__modules__[mid].id];
						assert.isTrue(module.load.calledWith('parent/resource/id'));
					}, (error: Error) => {
						throw new Error(`Promise should not reject\n${error.message}`);
					});
				},

				'without a context method': {
					'with a relative ID'() {
						const mid = 'plugin!./resource/id';
						return load(mid).then(() => {
							const module = webpackModules[global.__modules__[mid].id];
							assert.isTrue(module.load.calledWith('/resource/id'));
						}, (error: Error) => {
							throw new Error(`Promise should not reject\n${error.message}`);
						});
					},

					'without a relative ID'() {
						const mid = 'plugin!resource/id';
						return load(mid).then(() => {
							const module = webpackModules[global.__modules__[mid].id];
							assert.isTrue(module.load.calledWith('resource/id'));
						}, (error: Error) => {
							throw new Error(`Promise should not reject\n${error.message}`);
						});
					}
				}
			}
		}
	}
});
