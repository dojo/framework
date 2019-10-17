const { describe, it, before } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import global from '../../../src/shim/global';
import * as api from '../../../src/core/api';

describe('api', () => {
	before(() => {
		global.dojo_test_scope = {};
	});

	it('set rendering', () => {
		assert.strictEqual(global.dojo_test_scope.rendering, undefined);
		api.setRendering(true);
		assert.strictEqual(global.dojo_test_scope.rendering, true);
		api.setRendering(false);
		assert.strictEqual(global.dojo_test_scope.rendering, false);
	});

	it('block count', () => {
		assert.strictEqual(global.dojo_test_scope.blocksPending, undefined);
		api.incrementBlockCount();
		assert.strictEqual(global.dojo_test_scope.blocksPending, 1);
		api.incrementBlockCount();
		assert.strictEqual(global.dojo_test_scope.blocksPending, 2);
		api.decrementBlockCount();
		assert.strictEqual(global.dojo_test_scope.blocksPending, 1);
		api.decrementBlockCount();
		assert.strictEqual(global.dojo_test_scope.blocksPending, 0);
	});

	it('btr paths', () => {
		assert.strictEqual(global.dojo_test_scope.btrPaths, undefined);
		api.registerBtrPath('path1');
		assert.deepEqual(global.dojo_test_scope.btrPaths, ['path1']);
		api.registerBtrPath(['path2', 'path3']);
		assert.deepEqual(global.dojo_test_scope.btrPaths, ['path1', 'path2', 'path3']);
	});
});
