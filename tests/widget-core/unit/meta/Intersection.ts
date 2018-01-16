const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import global from '@dojo/shim/global';
import { stub, spy } from 'sinon';
import Intersection from '../../../src/meta/Intersection';
import { NodeHandler } from './../../../src/NodeHandler';
import WidgetBase from '../../../src/WidgetBase';

let intersectionObserver: any;
const observers: ([object, Function])[] = [];
const bindInstance = new WidgetBase();

registerSuite('meta - Intersection', {
	beforeEach() {
		intersectionObserver = stub(global, 'IntersectionObserver').callsFake(function(callback: any) {
			const observer = {
				observe: stub(),
				takeRecords: stub().returns([])
			};
			observers.push([observer, callback]);
			return observer;
		});
	},

	afterEach() {
		intersectionObserver.restore();
		observers.length = 0;
	},

	tests: {
		has: {
			'no intersection'() {
				const nodeHandler = new NodeHandler();

				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});

				const hasIntersectionInfo = intersection.has('root');
				assert.isFalse(hasIntersectionInfo);
			},
			'no intersection with options'() {
				const nodeHandler = new NodeHandler();

				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});

				const hasIntersectionInfo = intersection.has('root', { root: 'root' });
				assert.isFalse(hasIntersectionInfo);
			},
			'with intersection'() {
				const nodeHandler = new NodeHandler();

				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});
				const element = document.createElement('div');
				nodeHandler.add(element, 'root');

				intersection.get('root');
				const [observer, callback] = observers[0];

				callback(
					[
						{
							target: element,
							intersectionRatio: 0.1,
							isIntersecting: true
						}
					],
					observer
				);

				const hasIntersectionInfo = intersection.has('root');
				assert.isTrue(hasIntersectionInfo);
			}
		},
		get: {
			intersections() {
				const nodeHandler = new NodeHandler();
				const onSpy = spy(nodeHandler, 'on');

				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});

				intersection.get('root');
				assert.isTrue(onSpy.calledOnce);
				assert.isTrue(onSpy.firstCall.calledWith('root'));
			},
			'intersections with number key'() {
				const nodeHandler = new NodeHandler();
				const onSpy = spy(nodeHandler, 'on');

				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});

				intersection.get(1234);
				assert.isTrue(onSpy.calledOnce);
				assert.isTrue(onSpy.firstCall.calledWith('1234'));
			},
			'intersection calls invalidate when node available'() {
				const nodeHandler = new NodeHandler();
				const onSpy = spy(nodeHandler, 'on');
				const invalidateStub = stub();

				const intersection = new Intersection({
					invalidate: invalidateStub,
					nodeHandler,
					bind: bindInstance
				});

				intersection.get('root');
				assert.isTrue(onSpy.calledOnce);
				assert.isTrue(onSpy.firstCall.calledWith('root'));

				const element = document.createElement('div');
				nodeHandler.add(element, 'root');
				assert.isTrue(invalidateStub.calledOnce);
				onSpy.reset();
				intersection.get('root');
				assert.isFalse(onSpy.called);
			},
			'intersections calls invalidate when node observer fires'() {
				const nodeHandler = new NodeHandler();
				const onSpy = spy(nodeHandler, 'on');
				const invalidateStub = stub();

				const intersection = new Intersection({
					invalidate: invalidateStub,
					nodeHandler,
					bind: bindInstance
				});

				intersection.get('root');
				assert.isTrue(onSpy.calledOnce);
				assert.isTrue(onSpy.firstCall.calledWith('root'));

				const element = document.createElement('div');
				nodeHandler.add(element, 'root');

				assert.isTrue(invalidateStub.calledOnce);

				onSpy.reset();
				intersection.get('root');

				assert.isFalse(onSpy.called);

				const [observer, callback] = observers[0];

				callback(
					[
						{
							target: element,
							intersectionRatio: 0.1,
							isIntersecting: true
						}
					],
					observer
				);

				assert.isTrue(invalidateStub.calledTwice);
				const result = intersection.get('root');
				assert.deepEqual(result, { intersectionRatio: 0.1, isIntersecting: true });

				callback(
					[
						{
							target: element,
							intersectionRatio: 0.1,
							isIntersecting: false
						}
					],
					observer
				);

				assert.isTrue(invalidateStub.calledThrice);
				const resultTwo = intersection.get('root');
				assert.deepEqual(resultTwo, { intersectionRatio: 0.1, isIntersecting: false });
			},
			'intersections calls waits for root node before invalidating'() {
				const nodeHandler = new NodeHandler();
				const onSpy = spy(nodeHandler, 'on');
				const invalidateStub = stub();

				const intersection = new Intersection({
					invalidate: invalidateStub,
					nodeHandler,
					bind: bindInstance
				});

				intersection.get('foo', { root: 'root' });
				assert.isTrue(onSpy.calledOnce);
				assert.isTrue(onSpy.firstCall.calledWith('root'));

				const element = document.createElement('div');
				nodeHandler.add(element, 'foo');

				assert.isTrue(invalidateStub.notCalled);

				const root = document.createElement('div');
				nodeHandler.add(root, 'root');

				assert.isTrue(invalidateStub.calledOnce);

				intersection.get('foo', { root: 'root' });

				assert.isTrue(intersectionObserver.calledOnce);
				assert.strictEqual(intersectionObserver.firstCall.args[1].root, root);
				assert.lengthOf(observers, 1);

				const [observer, callback] = observers[0];

				callback(
					[
						{
							target: element,
							intersectionRatio: 0.1,
							isIntersecting: true
						}
					],
					observer
				);

				assert.isTrue(invalidateStub.calledTwice);
				const result = intersection.get('foo', { root: 'root' });
				assert.deepEqual(result, { intersectionRatio: 0.1, isIntersecting: true });
			},
			'observers are cached for details'() {
				const nodeHandler = new NodeHandler();
				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});

				const root = document.createElement('div');
				nodeHandler.add(root, 'foo');
				nodeHandler.add(root, 'root');
				intersection.get('foo');
				assert.lengthOf(observers, 1);
				intersection.get('foo', { root: 'root' });
				assert.lengthOf(observers, 2);
				intersection.get('foo');
				assert.lengthOf(observers, 2);
				intersection.get('foo', { root: 'root' });
				assert.lengthOf(observers, 2);
			},
			'observing multiple elements with the same root'() {
				const nodeHandler = new NodeHandler();
				const observeStub = stub();
				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});
				const root = document.createElement('div');
				const bar = document.createElement('div');

				intersectionObserver.restore();
				intersectionObserver = stub(global, 'IntersectionObserver').callsFake(function(callback: any) {
					const observer = {
						observe: observeStub,
						takeRecords: stub().returns([])
					};
					observers.push([observer, callback]);
					return observer;
				});

				nodeHandler.add(root, 'foo');
				nodeHandler.add(bar, 'bar');
				nodeHandler.add(root, 'baz');
				nodeHandler.add(root, 'root');

				intersection.get('foo');
				assert.lengthOf(observers, 1);
				assert.equal(observeStub.callCount, 1, 'Should have observed node');
				intersection.get('foo', { root: 'root' });
				assert.equal(observeStub.callCount, 2, 'Should have observed node with different options');
				assert.lengthOf(observers, 2);
				intersection.get('bar');
				assert.equal(observeStub.callCount, 3, 'Should have observed new node');
				assert.lengthOf(observers, 2);
				intersection.get('bar', { root: 'root' });
				assert.lengthOf(observers, 2);
				assert.equal(observeStub.callCount, 4, 'Should have observed new node with different options');

				intersection.get('bar', { root: 'root' });
				intersection.get('bar');
				intersection.get('foo');
				intersection.get('foo', { root: 'root' });
				assert.lengthOf(observers, 2);
				assert.equal(observeStub.callCount, 4, 'Should not have observed the same nodes again');
			},
			'observation should be based on node, not key'() {
				const nodeHandler = new NodeHandler();
				const observeStub = stub();
				const intersection = new Intersection({
					invalidate: () => {},
					nodeHandler,
					bind: bindInstance
				});
				const root = document.createElement('div');

				intersectionObserver.restore();
				intersectionObserver = stub(global, 'IntersectionObserver').callsFake(function(callback: any) {
					const observer = {
						observe: observeStub,
						takeRecords: stub().returns([])
					};
					observers.push([observer, callback]);
					return observer;
				});

				nodeHandler.add(root, 'foo');
				nodeHandler.add(root, 'baz');
				nodeHandler.add(root, 'root');

				intersection.get('foo');
				assert.lengthOf(observers, 1);
				assert.equal(observeStub.callCount, 1, 'Should have observed node');
				intersection.get('foo', { root: 'root' });
				assert.equal(observeStub.callCount, 2, 'Should have observed node with different options');
				assert.lengthOf(observers, 2);
				intersection.get('baz');
				assert.equal(observeStub.callCount, 2, 'Should not have observed with the same node and options');
				assert.lengthOf(observers, 2);
				intersection.get('baz', { root: 'root' });
				assert.equal(observeStub.callCount, 2, 'Should not have observed with the same node and options');
				assert.lengthOf(observers, 2);
			}
		}
	}
});
