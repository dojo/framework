import { RootRequire } from '@dojo/interfaces/loader';
import Promise from '@dojo/shim/Promise';
import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as sinon from 'sinon';
import has from '../../src/has';
import load, { isPlugin, useDefault } from '../../src/load';
import mockPlugin from '../support/load/plugin-default';
import global from '../../src/global';

declare const require: RootRequire;

const suite: any = {
	name: 'load',

	before() {
		return load('tests/support/load/a', 'tests/support/load/b', 'tests/support/load/c');
	},

	isPlugin() {
		assert.isFalse(isPlugin(null));
		assert.isFalse(isPlugin(2));
		assert.isFalse(isPlugin([]));
		assert.isFalse(isPlugin(/\s/));
		assert.isFalse(isPlugin({}));
		assert.isTrue(isPlugin({
			load() {}
		}));
	},

	useDefault: {
		'single es6 module'() {
			assert.strictEqual(useDefault({
				'__esModule': true,
				'default': 42
			}), 42, 'The default export should be returned.');
		},

		'single non-es6 module'() {
			const module = { value: 42 };
			assert.deepEqual(useDefault(module), module, 'The module itself should be returned.');
		},

		'all es6 modules'() {
			const modules = [ 42, 43 ].map((value: number) => {
				return { '__esModule': true, 'default': value };
			});
			assert.sameMembers(useDefault(modules), [ 42, 43 ], 'The default export should be returned for all modules.');
		},

		'mixed module types'() {
			const modules: any[] = [ 42, 43 ].map((value: number) => {
				return { '__esModule': true, 'default': value };
			});
			modules.push({ value: 44 });
			assert.sameDeepMembers(useDefault(modules), [ 42, 43, { value: 44 } ]);
		}
	},

	'global load'(this: any) {
		const def = this.async(5000);

		load('src/has', '@dojo/shim/Promise').then(def.callback(function ([ hasModule, promiseModule ]: [ any, any ]) {
			assert.strictEqual(hasModule.default, has);
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
			const resourceId = require.toUrl('some/resource');

			load(require, '../support/load/plugin!some/resource').then(dfd.callback(([ value ]: [ any ]) => {
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
};

if (has('host-node')) {
	const nodeRequire: any = global.require.nodeRequire;
	const path: any = nodeRequire('path');
	const buildDir: string = path.join(process.cwd(), '_build');

	suite.node = {
		'different than AMD load'() {
			const nodeLoad: typeof load = nodeRequire(path.join(buildDir, 'src', 'load')).default;
			assert.notStrictEqual(nodeLoad, load);
		},

		'global load succeeds'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).globalSucceed;
			result.then(def.callback(function ([ fs, path ]: [ any, any ]) {
				assert.strictEqual(fs, nodeRequire('fs'));
				assert.strictEqual(path, nodeRequire('path'));
			}));
		},

		'global load with relative path fails'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).globalFail;
			result.then(function () {
				def.reject(new Error('load should not have succeeded'));
			}, def.callback(function (error: Error) {
				assert.instanceOf(error, Error);
			}));
		},

		'contextual load succeeds'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).succeed;
			result.then(def.callback(function ([ a, b ]: [ any, any ]) {
				assert.deepEqual(a, { 'default': 'A', one: 1, two: 2 });
				assert.deepEqual(b, { 'default': 'B', three: 3, four: 4 });
			}));
		},

		'useDefault resolves es modules'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).succeedDefault;
			result.then(def.callback(function ([ a, b ]: [ any, any ]) {
				assert.deepEqual(a, 'A');
				assert.deepEqual(b, 'B');
			}));
		},

		'contextual load with non-existent module fails'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).fail;
			result.then(function () {
				def.reject(new Error('load should not have succeeded'));
			}, def.callback(function (error: Error) {
				assert.instanceOf(error, Error);
			}));
		}
	};
}

registerSuite(suite);
