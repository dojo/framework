const { it, afterEach, before, after } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { sandbox, SinonStub, SinonSpy, stub } from 'sinon';
import global from '../../../../src/shim/global';
import cacheMiddleware from '../../../../src/core/middleware/cache';
import intersectionMiddleware from '../../../../src/core/middleware/intersection';

const sb = sandbox.create();
const destroyStub = sb.stub();

let intersectionObserver: any;
const observers: ([
	{
		observe: SinonStub;
		takeRecords: SinonStub;
		disconnect: SinonSpy;
	},
	Function
])[] = [];
let globalIntersectionObserver: any;
let nodeStub = {
	get: sb.stub()
};
let invalidatorStub = sb.stub();

describe('intersection middleware', () => {
	before(() => {
		globalIntersectionObserver = global.IntersectionObserver;
		intersectionObserver = stub().callsFake(function(callback: any) {
			const observer = {
				observe: sb.stub(),
				takeRecords: sb.stub().returns([]),
				disconnect: sb.spy()
			};
			observers.push([observer, callback]);
			return observer;
		});
		global.IntersectionObserver = intersectionObserver;
	});

	afterEach(() => {
		sb.resetHistory();
		sb.resetBehavior();
		intersectionObserver.resetHistory();
		observers.length = 0;
	});

	after(() => {
		global.IntersectionObserver = globalIntersectionObserver;
	});

	it('no intersection', () => {
		const cache = cacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { destroy: destroyStub }
		});
		const intersection = intersectionMiddleware().callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				cache,
				invalidator: invalidatorStub,
				node: nodeStub
			},
			properties: {}
		});

		const info = intersection.get('root');
		assert.deepEqual(info, {
			intersectionRatio: 0,
			isIntersecting: false
		});
	});

	it('no intersection with options', () => {
		const cache = cacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { destroy: destroyStub }
		});
		const intersection = intersectionMiddleware().callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				cache,
				invalidator: invalidatorStub,
				node: nodeStub
			},
			properties: {}
		});

		const info = intersection.get('root', { root: 'root' });
		assert.deepEqual(info, {
			intersectionRatio: 0,
			isIntersecting: false
		});
	});

	it('Should return the registered intersection', () => {
		const cache = cacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { destroy: destroyStub }
		});
		const intersection = intersectionMiddleware().callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				cache,
				invalidator: invalidatorStub,
				node: nodeStub
			},
			properties: {}
		});

		const mockNode = sb.stub();
		nodeStub.get.returns(mockNode);
		intersection.get('root');

		const [observer, callback] = observers[0];
		assert.isTrue(observer.observe.calledOnce);

		callback(
			[
				{
					target: mockNode,
					intersectionRatio: 0.1,
					isIntersecting: true
				}
			],
			observer
		);

		const info = intersection.get('root');
		assert.deepEqual(info, {
			intersectionRatio: 0.1,
			isIntersecting: true
		});
	});

	it('intersections calls waits for root node before invalidating', () => {
		const cache = cacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { destroy: destroyStub }
		});
		const intersection = intersectionMiddleware().callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				cache,
				invalidator: invalidatorStub,
				node: nodeStub
			},
			properties: {}
		});

		let info = intersection.get('foo', { root: 'root' });

		assert.lengthOf(observers, 0);
		assert.deepEqual(info, {
			intersectionRatio: 0,
			isIntersecting: false
		});

		const mockFoo = sb.stub();
		nodeStub.get.withArgs('foo').returns(mockFoo);

		info = intersection.get('foo', { root: 'root' });

		assert.lengthOf(observers, 0);
		assert.deepEqual(info, {
			intersectionRatio: 0,
			isIntersecting: false
		});

		const mockRoot = sb.stub();
		nodeStub.get.withArgs('root').returns(mockRoot);
		info = intersection.get('foo', { root: 'root' });

		assert.lengthOf(observers, 1);
		assert.deepEqual(info, {
			intersectionRatio: 0,
			isIntersecting: false
		});
		assert.isTrue(intersectionObserver.calledOnce);
		const [observer, callback] = observers[0];

		callback(
			[
				{
					target: mockFoo,
					intersectionRatio: 0.1,
					isIntersecting: true
				}
			],
			observer
		);

		const result = intersection.get('foo', { root: 'root' });
		assert.deepEqual(result, { intersectionRatio: 0.1, isIntersecting: true });
	});

	it('Should register disconnect with destroy', () => {
		const cache = cacheMiddleware().callback({
			properties: {},
			id: 'test-cache',
			middleware: { destroy: sb.stub() }
		});
		const intersection = intersectionMiddleware().callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				cache,
				invalidator: invalidatorStub,
				node: nodeStub
			},
			properties: {}
		});

		const mockNode = sb.stub();
		nodeStub.get.returns(mockNode);
		intersection.get('key');
		destroyStub.getCall(0).callArg(0);
		assert.lengthOf(observers, 1);
		const [observer] = observers[0];
		assert.isTrue(observer.disconnect.calledOnce);
	});
});
