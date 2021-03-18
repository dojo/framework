import global from '../../../../src/shim/global';
const { it, beforeEach } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import { createICacheMiddleware } from '../../../../src/core/middleware/icache';
import inertMiddleware from '../../../../src/core/middleware/inert';

let invalidatorStub = stub();
const icacheMiddleware = createICacheMiddleware<any>();

jsdomDescribe('inert middleware', () => {
	let icache = icacheMiddleware().callback({
		properties: () => ({}),
		children: () => [],
		id: 'test-cache',
		middleware: { invalidator: invalidatorStub, destroy: stub() }
	});
	beforeEach(() => {
		icache = icacheMiddleware().callback({
			properties: () => ({}),
			children: () => [],
			id: 'test-cache',
			middleware: { invalidator: invalidatorStub, destroy: stub() }
		});
	});
	it('should set node inert property', () => {
		const node = global.document.createElement('div');

		const inert = inertMiddleware().callback({
			id: 'test',
			middleware: {
				icache,
				destroy: stub(),
				node: {
					get() {
						return node;
					}
				}
			},
			properties: () => ({}),
			children: () => []
		});
		inert.set('key', true);
		assert.strictEqual(node.inert, true);
		inert.set('key', false);
		assert.strictEqual(node.inert, false);
	});

	it('should set node inert property on all siblings when using invert', () => {
		const parent = global.document.createElement('div');
		const childOne = global.document.createElement('div');
		const childTwo = global.document.createElement('div');
		const childThree = global.document.createElement('div');
		const node = global.document.createElement('div');
		parent.appendChild(childOne);
		parent.appendChild(childTwo);
		parent.appendChild(childThree);
		parent.appendChild(node);

		const inert = inertMiddleware().callback({
			id: 'test',
			middleware: {
				icache,
				destroy: stub(),
				node: {
					get() {
						return node;
					}
				}
			},
			properties: () => ({}),
			children: () => []
		});
		inert.set('key', true, true);
		assert.strictEqual(node.inert, false);
		assert.strictEqual(childOne.inert, true);
		assert.strictEqual(childTwo.inert, true);
		assert.strictEqual(childThree.inert, true);
		inert.set('key', false, true);
		assert.strictEqual(node.inert, false);
		assert.strictEqual(childOne.inert, false);
		assert.strictEqual(childTwo.inert, false);
		assert.strictEqual(childThree.inert, false);
	});

	it('should reset inert and remove node from map on destroy', () => {
		const parent = global.document.createElement('div');
		const childOne = global.document.createElement('div');
		const childTwo = global.document.createElement('div');
		const childThree = global.document.createElement('div');
		const node = global.document.createElement('div');
		parent.appendChild(childOne);
		parent.appendChild(childTwo);
		parent.appendChild(childThree);
		parent.appendChild(node);
		const destroyStub = stub();

		const inert = inertMiddleware().callback({
			id: 'test',
			middleware: {
				icache,
				destroy: destroyStub,
				node: {
					get() {
						return node;
					}
				}
			},
			properties: () => ({}),
			children: () => []
		});
		inert.set('key', true, true);
		assert.strictEqual(node.inert, false);
		assert.strictEqual(childOne.inert, true);
		assert.strictEqual(childTwo.inert, true);
		assert.strictEqual(childThree.inert, true);
		destroyStub.callArg(0);
		assert.strictEqual(node.inert, false);
		assert.strictEqual(childOne.inert, false);
		assert.strictEqual(childTwo.inert, false);
		assert.strictEqual(childThree.inert, false);
	});

	it('should only set inert state when properties change', () => {
		const parent = global.document.createElement('div');
		const childOne = global.document.createElement('div');
		const childTwo = global.document.createElement('div');
		const childThree = global.document.createElement('div');
		const childFour = global.document.createElement('div');
		const node = global.document.createElement('div');
		parent.appendChild(childOne);
		parent.appendChild(childTwo);
		parent.appendChild(childThree);
		parent.appendChild(node);
		let _inert = false;
		const inertStub = stub();
		Object.defineProperty(childFour, 'inert', {
			get() {
				return _inert;
			},
			set(value: boolean) {
				_inert = value;
				inertStub();
			}
		});
		const destroyStub = stub();
		const inert = inertMiddleware().callback({
			id: 'test',
			middleware: {
				icache,
				destroy: destroyStub,
				node: {
					get() {
						return node;
					}
				}
			},
			properties: () => ({}),
			children: () => []
		});
		inert.set('key', true, true);
		assert.strictEqual(node.inert, false);
		assert.strictEqual(childOne.inert, true);
		assert.strictEqual(childTwo.inert, true);
		assert.strictEqual(childThree.inert, true);
		assert.strictEqual(inertStub.callCount, 0);
		parent.appendChild(childFour);
		inert.set('key', true, true);
		assert.strictEqual(node.inert, false);
		assert.strictEqual(childOne.inert, true);
		assert.strictEqual(childTwo.inert, true);
		assert.strictEqual(childThree.inert, true);
		assert.strictEqual(inertStub.callCount, 0);
	});
});
