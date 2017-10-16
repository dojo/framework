import Promise from '@dojo/shim/Promise';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { Tests } from 'intern/lib/interfaces/object';
import has from '../../../src/has';
import { isPlugin, useDefault } from '../../../src/load/util';

const suite: Tests = {
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
	const nodeRequire: any = (<any> require).nodeRequire || require;
	const path: any = nodeRequire('path');
	const buildDir: string = path.join(process.cwd(), '_build');

	suite.node = {
		'useDefault resolves es modules'(this: any) {
			const def = this.async(5000);

			const result: () => Promise<any[]> = nodeRequire(path.join(buildDir, 'tests', 'support', 'load', 'node')).succeedDefault;
			result().then(def.callback(function ([ a, b ]: [ any, any ]) {
				assert.deepEqual(a, 'A');
				assert.deepEqual(b, 'B');
			}));
		}
	};
}

registerSuite('load/util', suite);
