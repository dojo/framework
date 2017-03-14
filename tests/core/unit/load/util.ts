import Promise from '@dojo/shim/Promise';
import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import has from '../../../src/has';
import { isPlugin, useDefault } from '../../../src/load/util';
import global from '../../../src/global';

const suite: any = {
	name: 'load/util',

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
	}
};

if (has('host-node')) {
	const nodeRequire: any = global.require.nodeRequire;
	const path: any = nodeRequire('path');
	const buildDir: string = path.join(process.cwd(), '_build');

	suite.node = {
		'useDefault resolves es modules'(this: any) {
			const def = this.async(5000);

			const result: Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).succeedDefault;
			result.then(def.callback(function ([ a, b ]: [ any, any ]) {
				assert.deepEqual(a, 'A');
				assert.deepEqual(b, 'B');
			}));
		}
	};
}

registerSuite(suite);
