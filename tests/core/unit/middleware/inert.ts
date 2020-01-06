import global from '../../../../src/shim/global';
const { it } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import inertMiddleware from '../../../../src/core/middleware/inert';

const sb = sandbox.create();

jsdomDescribe('inert middleware', () => {
	it('should set node inert property', () => {
		const node = global.document.createElement('div');

		const inert = inertMiddleware().callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
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
				destroy: sb.stub(),
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
		const destroyStub = sb.stub();

		const inert = inertMiddleware().callback({
			id: 'test',
			middleware: {
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
});
