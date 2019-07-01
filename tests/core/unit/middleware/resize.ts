import global from '../../../../src/shim/global';
const { it, describe, afterEach, beforeEach, before, after } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox, SinonStub } from 'sinon';

import resizeMiddleware from '../../../../src/core/middleware/resize';
import icacheMiddleware from '../../../../src/core/middleware/icache';
import cacheMiddleware from '../../../../src/core/middleware/cache';

const sb = sandbox.create();
let resizeObserver: any;
let resizeCallback: ([]: any[]) => void;
const destroyStub = sb.stub();
let observer: {
	observe: SinonStub;
	disconnect: SinonStub;
};
let globalResizeObserver: any;
let nodeStub = {
	get: sb.stub()
};
let invalidatorStub = sb.stub();

describe('resize middleware', () => {
	before(() => {
		resizeObserver = sandbox
			.create()
			.stub()
			.callsFake(function(callback: any) {
				resizeCallback = callback;
				return observer;
			});
		globalResizeObserver = global.ResizeObserver;
		global.ResizeObserver = resizeObserver;
	});

	after(() => {
		global.ResizeObserver = globalResizeObserver;
	});

	beforeEach(() => {
		observer = {
			observe: sb.stub(),
			disconnect: sb.stub()
		};
	});

	afterEach(() => {
		sb.resetHistory();
	});

	it('Should observe node with with resize and invalidate when the resize callback is called ', () => {
		const cache = cacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { destroy: destroyStub }
		});
		const icache = icacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { invalidator: invalidatorStub, cache }
		});
		const { callback } = resizeMiddleware();
		const resize = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				icache,
				node: nodeStub
			},
			properties: {}
		});
		assert.isNull(resize.get('key'));
		const mockNode = sb.stub();
		nodeStub.get.returns(mockNode);
		assert.isNull(resize.get('key'));
		assert.isTrue(observer.observe.calledOnce);
		assert.isTrue(resizeObserver.calledOnce);
		assert.isNull(resize.get('key'));
		assert.isTrue(resizeObserver.calledOnce);
		let contentRect: any = {
			width: 10
		};
		resizeCallback([{ contentRect }]);
		assert.isTrue(invalidatorStub.calledOnce);
		assert.strictEqual(resize.get('key'), contentRect);
		contentRect = {
			width: 100
		};
		resizeCallback([{ contentRect }]);
		assert.isTrue(invalidatorStub.calledTwice);
		assert.strictEqual(resize.get('key'), contentRect);
	});

	it('Should register disconnect with destroy', () => {
		const cache = cacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { destroy: sb.stub() }
		});
		const icache = icacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { invalidator: invalidatorStub, cache }
		});
		const { callback } = resizeMiddleware();
		const resize = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				icache,
				node: nodeStub
			},
			properties: {}
		});

		const mockNode = sb.stub();
		nodeStub.get.returns(mockNode);
		assert.isNull(resize.get('key'));
		destroyStub.getCall(0).callArg(0);
		assert.isTrue(observer.disconnect.calledOnce);
	});
});
