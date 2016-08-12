import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import has from 'src/has';
import load from 'src/load';
import Promise from 'dojo-shim/Promise';
import { RootRequire } from 'src/loader';
import global from 'src/global';

declare const require: RootRequire;

const suite: any = {
	name: 'load',

	before() {
		return load('tests/unit/load/a', 'tests/unit/load/b');
	},

	'global load'(this: any) {
		const def = this.async(5000);

		load('src/has', 'dojo-shim/Promise').then(def.callback(function ([ hasModule, promiseModule ]: [ any, any ]) {
			assert.strictEqual(hasModule.default, has);
			assert.strictEqual(promiseModule.default, Promise);
		}));
	},

	'contextual load'(this: any) {
		const def = this.async(5000);

		load(require, './load/a', './load/b').then(def.callback(function ([ a, b ]: [ any, any ]) {
			assert.deepEqual(a, { one: 1, two: 2 });
			assert.deepEqual(b, { three: 3, four: 4 });
		}));
	}

	// TODO: once AMD error handling is figured out, add tests for the failure case
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

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'unit', 'load', 'node')).globalSucceed;
			result.then(def.callback(function ([ fs, path ]: [ any, any ]) {
				assert.strictEqual(fs, nodeRequire('fs'));
				assert.strictEqual(path, nodeRequire('path'));
			}));
		},

		'global load with relative path fails'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'unit', 'load', 'node')).globalFail;
			result.then(function () {
				def.reject(new Error('load should not have succeeded'));
			}, def.callback(function (error: Error) {
				assert.instanceOf(error, Error);
			}));
		},

		'contextual load succeeds'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'unit', 'load', 'node')).succeed;
			result.then(def.callback(function ([ a, b ]: [ any, any ]) {
				assert.deepEqual(a, { one: 1, two: 2 });
				assert.deepEqual(b, { three: 3, four: 4 });
			}));
		},

		'contextual load with non-existent module fails'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'unit', 'load', 'node')).fail;
			result.then(function () {
				def.reject(new Error('load should not have succeeded'));
			}, def.callback(function (error: Error) {
				assert.instanceOf(error, Error);
			}));
		}
	};
}

registerSuite(suite);
