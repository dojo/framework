import Promise from '@dojo/shim/Promise';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { ObjectSuiteDescriptor } from 'intern/lib/interfaces/object';
import * as sinon from 'sinon';
import has from '../../src/has';
import load, { isPlugin, useDefault } from '../../src/load';
import { RootRequire } from '@dojo/interfaces/loader';
import { isPlugin as utilIsPlugin, useDefault as utilUseDefault } from '../../src/load/util';
import mockPlugin from '../support/load/plugin-default';

declare const require: RootRequire;

const suite: ObjectSuiteDescriptor = {
	before() {
		return load(require, '../support/load/a', '../support/load/b', '../support/load/c') as Promise<any>;
	},

	tests: {
		api() {
			assert.strictEqual(isPlugin, utilIsPlugin, 'isPlugin should be re-exported');
			assert.strictEqual(useDefault, utilUseDefault, 'useDefault should be re-exported');
		},

		'global load'(this: any) {
			const def = this.async(5000);

			load('@dojo/shim/Promise').then(def.callback(function ([ promiseModule ]: [ any, any ]) {
				assert.strictEqual(promiseModule.default, Promise);
			}));
		},

		'contextual load'(this: any) {
			const def = this.async(5000);

			load(require, '../support/load/a', '../support/load/b').then(def.callback(function ([ a, b ]: [ any, any ]) {
				assert.deepEqual(a, { 'default': 'A', one: 1, two: 2 });
				assert.deepEqual(b, { 'default': 'B', three: 3, four: 4 });
			}));
		},

		'contextual load - all es 6 modules'() {
			return load(require, '../support/load/a', '../support/load/b').then(useDefault).then(([ a, b ]: any[]) => {
				assert.deepEqual(a, 'A');
				assert.deepEqual(b, 'B');
			});
		},

		'contextual load - single es 6 module'() {
			return load(require, '../support/load/a', '../support/load/b').then(([ a, b ]) => [ useDefault(a), b ]).then(([ a, b ]: any[]) => {
				assert.deepEqual(a, 'A');
				assert.deepEqual(b, { 'default': 'B', three: 3, four: 4 });
			});
		},

		'load plugin': {
			'without a resource id'(this: any) {
				const dfd = this.async(5000);

				load(require, '../support/load/plugin').then(dfd.callback(([ plugin ]: [ any ]) => {
					assert.isFunction(plugin.load, 'No special behavior without a resource id.');
				}));
			},

			'with a resource id'(this: any) {
				const dfd = this.async(5000);
				const resourceId = require.toUrl ? require.toUrl('@dojo/shim/Promise') : (require as any).resolve('@dojo/shim/Promise');

				load(require, '../support/load/plugin!@dojo/shim/Promise').then(dfd.callback(([ value ]: [ any ]) => {
					assert.strictEqual(value, resourceId, 'The plugin `load` should receive the resolved resource id.');
				}));
			},

			'non-plugin with resource id'(this: any) {
				const dfd = this.async(5000);

				load(require, '../support/load/a!some/resource').then(dfd.callback(([ a ]: [ any ]) => {
					assert.deepEqual(a, { one: 1, two: 2, 'default': 'A' }, 'The resource id should be ignored.');
				}));
			},

			'default export used'(this: any) {
				const dfd = this.async(5000);
				sinon.spy(mockPlugin, 'load');

				load(require, '../support/load/plugin-default!some/resource').then(dfd.callback(([ value ]: [ any ]) => {
					assert.isTrue((<any> mockPlugin.load).calledWith('some/resource', load),
						'Plugin `load` called with resource id and core `load`.');
					assert.strictEqual(value, 'some/resource', 'The `load` on the default export should be used.');

					(<any> mockPlugin.load).restore();
				}), dfd.rejectOnError(() => {
					(<any> mockPlugin.load).restore();
				}));
			},

			'normalize method'(this: any) {
				const dfd = this.async(5000);
				sinon.spy(mockPlugin, 'normalize');

				load(require, '../support/load/plugin-default!normalize').then(dfd.callback(([ value ]: [ any ]) => {
					assert.strictEqual(value, 'path/to/normalized', 'The path should be passed to the `normalize` method.');
					assert.isTrue((<any> mockPlugin.normalize).calledWith('normalize'),
						'`normalize` called with resource id.');
					assert.isFunction((<any> mockPlugin.normalize).firstCall.args[1],
						'`normalize` called with resolver function.');

					(<any> mockPlugin.normalize).restore();
				}), dfd.rejectOnError(() => {
					(<any> mockPlugin.normalize).restore();
				}));
			}
		},

		'error handling'() {
			return load('some/bogus/nonexistent/thing').then(() => {
				throw new Error('Should not resolve.');
			}, (error: Error) => {
				assert(error);
				assert.isTrue(error.message.indexOf('some/bogus/nonexistent/thing') > -1,
					'The error message should contain the module id.');
			});
		}
	}
};

if (has('host-node')) {
	const nodeRequire: any = (<any> require).nodeRequire || require;
	const path: any = nodeRequire('path');
	const buildDir: string = path.join(process.cwd(), '_build');

	suite.tests.node = {
		'global load succeeds'(this: any) {
			const def = this.async(5000);

			const result: () => Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).globalSucceed;
			result().then(def.callback(function ([ fs, path ]: [ any, any ]) {
				assert.strictEqual(fs, nodeRequire('fs'));
				assert.strictEqual(path, nodeRequire('path'));
			}));
		},

		'global load with relative path fails'(this: any) {
			const def = this.async(5000);

			const result: () => Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).globalFail;
			result().then(function () {
				def.reject(new Error('load should not have succeeded'));
			}, def.callback(function (error: Error) {
				assert.instanceOf(error, Error);
			}));
		},

		'contextual load succeeds'(this: any) {
			const def = this.async(5000);

			const result: () => Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).succeed;
			result().then(def.callback(function ([ a, b ]: [ any, any ]) {
				assert.deepEqual(a, { 'default': 'A', one: 1, two: 2 });
				assert.deepEqual(b, { 'default': 'B', three: 3, four: 4 });
			}));
		},

		'contextual load with non-existent module fails'(this: any) {
			const def = this.async(5000);

			const result: () => Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).fail;
			result().then(function () {
				def.reject(new Error('load should not have succeeded'));
			}, def.callback(function (error: Error) {
				assert.instanceOf(error, Error);
			}));
		}
	};
}

registerSuite('load', suite);
