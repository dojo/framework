const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import { MemoryHistory } from '../../../src/history/MemoryHistory';

describe('MemoryHistory', () => {
	it('Calls onChange on set', () => {
		const onChange = stub();
		const history = new MemoryHistory({ onChange });
		assert.isTrue(onChange.calledWith('/'));
		assert.isTrue(onChange.calledOnce);
		assert.strictEqual(history.current, '/');
		history.set('new');
		assert.isTrue(onChange.calledTwice);
		assert.isTrue(onChange.secondCall.calledWith('new'));
		assert.strictEqual(history.current, 'new');
	});

	it('Does not call onChange on set if paths match', () => {
		const onChange = stub();
		const history = new MemoryHistory({ onChange });
		assert.isTrue(onChange.calledWith('/'));
		assert.isTrue(onChange.calledOnce);
		assert.strictEqual(history.current, '/');
		history.set('/');
		assert.isTrue(onChange.calledOnce);
	});

	it('should not add any prefix', () => {
		const onChange = stub();
		const history = new MemoryHistory({ onChange });
		assert.strictEqual(history.prefix('hash'), 'hash');
	});
});
