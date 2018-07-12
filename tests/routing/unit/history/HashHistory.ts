const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import { HashHistory } from '../../../src/history/HashHistory';

class MockLocation {
	private _hash = '#current';
	private _change: Function;

	constructor(change: Function) {
		this._change = change;
	}

	set hash(value: string) {
		const newHash = value[0] !== '#' ? `#${value}` : value;
		if (newHash !== this._hash) {
			this._hash = newHash;
			this._change();
		}
	}

	get hash() {
		return this._hash;
	}
}

class MockWindow {
	private _onhashchange: undefined | Function;
	onhashchange = () => {
		this._onhashchange && this._onhashchange();
	};
	public location = new MockLocation(this.onhashchange);
	addEventListener = (type: string, listener: Function) => {
		this._onhashchange = listener;
	};

	removeEventListener = stub();
}

let mockWindow: any;

describe('HashHistory', () => {
	beforeEach(() => {
		mockWindow = new MockWindow();
	});

	it('Calls onChange for current hash', () => {
		const onChange = stub();
		const history = new HashHistory({ onChange, window: mockWindow });
		assert.isTrue(onChange.calledWith('current'));
		assert.isTrue(onChange.calledOnce);
		assert.strictEqual(history.current, 'current');
	});

	it('Calls onChange on hash change', () => {
		const onChange = stub();
		const history = new HashHistory({ onChange, window: mockWindow });
		assert.isTrue(onChange.calledWith('current'));
		assert.isTrue(onChange.calledOnce);
		assert.strictEqual(history.current, 'current');
		mockWindow.location.hash = 'new';
		assert.isTrue(onChange.calledTwice);
		assert.isTrue(onChange.secondCall.calledWith('new'));
		assert.strictEqual(history.current, 'new');
	});

	it('Calls onChange on set', () => {
		const onChange = stub();
		const history = new HashHistory({ onChange, window: mockWindow });
		assert.isTrue(onChange.calledWith('current'));
		assert.isTrue(onChange.calledOnce);
		assert.strictEqual(history.current, 'current');
		history.set('new');
		assert.isTrue(onChange.calledTwice);
		assert.isTrue(onChange.secondCall.calledWith('new'));
		assert.strictEqual(history.current, 'new');
	});

	it('should add hash prefix', () => {
		const onChange = stub();
		const history = new HashHistory({ onChange, window: mockWindow });
		assert.strictEqual(history.prefix('hash'), '#hash');
	});

	it('should not add hash prefix if it already exists', () => {
		const onChange = stub();
		const history = new HashHistory({ onChange, window: mockWindow });
		assert.strictEqual(history.prefix('#hash'), '#hash');
	});

	it('destroying removes the hashchange event listener', () => {
		const onChange = stub();
		const history = new HashHistory({ onChange, window: mockWindow });
		assert.isTrue(mockWindow.removeEventListener.notCalled);
		history.destroy();
		assert.isTrue(mockWindow.removeEventListener.calledOnce);
	});
});
