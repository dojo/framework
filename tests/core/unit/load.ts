import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import has from '../../src/has';
import load, { useDefault } from '../../src/load';
import Promise from '@dojo/shim/Promise';
import { RootRequire } from '@dojo/interfaces/loader';
import global from '../../src/global';

declare const require: RootRequire;

const suite: any = {
	name: 'load',

	before() {
		return load('tests/support/load/a', 'tests/support/load/b');
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

	'error handling'() {
		return load('some/bogus/nonexistent/thing').then(() => {
			throw new Error('Should not resolve.');
		}, (error: Error) => {
			assert(error);
			assert.isTrue(error.message.indexOf('some/bogus/nonexistent/thing') > -1,
				'The error message contains the module id.');
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
