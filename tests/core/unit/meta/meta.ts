const { registerSuite } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { Base as MetaBase } from '../../../../src/core/meta/Base';
import { stub, spy } from 'sinon';
import { createResolvers } from './../../support/util';
import NodeHandler, { NodeEventType } from '../../../../src/core/NodeHandler';
import { WidgetBase } from '../../../../src/core/WidgetBase';
import { renderer, v, w } from '../../../../src/core/vdom';

const resolvers = createResolvers();
let bindInstance: WidgetBase;

registerSuite('meta base', {
	before() {
		bindInstance = new WidgetBase();
	},

	beforeEach() {
		resolvers.stub();
	},
	afterEach() {
		resolvers.restore();
	},

	tests: {
		'has checks nodehandler for nodes'() {
			const nodeHandler = new NodeHandler();
			const element = document.createElement('div');
			nodeHandler.add(element, 'foo');
			const meta = new MetaBase({
				invalidate: () => {},
				nodeHandler,
				bind: bindInstance
			});

			assert.isTrue(meta.has('foo'));
			assert.isFalse(meta.has('bar'));
		},
		'get node returns element from nodehandler'() {
			const nodeHandler = new NodeHandler();
			const invalidate = stub();
			const element = document.createElement('div');
			nodeHandler.add(element, 'foo');

			class MyMeta extends MetaBase {
				callGetNode(key: string) {
					return this.getNode(key);
				}
			}

			const meta = new MyMeta({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			const node = meta.callGetNode('foo');
			assert.equal(node, element);
		},
		'Will create event listener for node if not yet loaded'() {
			const nodeHandler = new NodeHandler();
			const invalidate = stub();
			const onSpy = spy(nodeHandler, 'on');

			class MyMeta extends MetaBase {
				callGetNode(key: string) {
					return this.getNode(key);
				}
			}

			const meta = new MyMeta({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			meta.callGetNode('foo');
			assert.isTrue(onSpy.calledOnce);
			assert.isTrue(onSpy.firstCall.calledWith('foo'));
		},
		'Will call invalidate when awaited node is available'() {
			const nodeHandler = new NodeHandler();
			const onSpy = spy(nodeHandler, 'on');
			const invalidate = stub();

			class MyMeta extends MetaBase {
				callGetNode(key: string) {
					return this.getNode(key);
				}
			}

			const meta = new MyMeta({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			meta.callGetNode('foo');
			assert.isTrue(onSpy.calledOnce);
			assert.isTrue(onSpy.firstCall.calledWith('foo'));

			const element = document.createElement('div');

			nodeHandler.add(element, 'foo');

			resolvers.resolve();
			assert.isTrue(invalidate.calledOnce);

			onSpy.resetHistory();
			meta.callGetNode('foo');

			assert.isFalse(onSpy.called);
		},
		'Will not add a second callback handle if one already exists'() {
			const nodeHandler = new NodeHandler();
			const onSpy = spy(nodeHandler, 'on');
			const invalidate = stub();

			class MyMeta extends MetaBase {
				callGetNode(key: string) {
					return this.getNode(key);
				}
			}

			const meta = new MyMeta({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			meta.callGetNode('foo');
			assert.isTrue(onSpy.calledOnce);
			assert.isTrue(onSpy.firstCall.calledWith('foo'));
			onSpy.resetHistory();
			meta.callGetNode('foo');
			assert.isTrue(onSpy.notCalled);
			assert.isTrue(invalidate.notCalled);
		},
		'invalidate calls passed in invalidate function'() {
			const nodeHandler = new NodeHandler();
			const invalidate = stub();

			class MyMeta extends MetaBase {
				callInvalidate() {
					this.invalidate();
				}
			}

			const meta = new MyMeta({
				invalidate,
				nodeHandler,
				bind: bindInstance
			});

			meta.callInvalidate();
			resolvers.resolve();
			assert.isTrue(invalidate.calledOnce);
		},
		'integration with single root node'() {
			class MyMeta extends MetaBase {
				callGetNode(key: string) {
					return this.getNode(key);
				}
				getNodeHandler() {
					return this.nodeHandler;
				}
			}

			const onFoo = stub();
			const onBar = stub();
			const onWidget = stub();
			let meta: any;
			class TestWidget extends WidgetBase {
				constructor() {
					super();
					meta = this.meta(MyMeta);
					const nodeHandler = meta.getNodeHandler();
					nodeHandler.on('foo', onFoo);
					nodeHandler.on('bar', onBar);
					nodeHandler.on(NodeEventType.Widget, onWidget);
				}
				render() {
					return v('div', { key: 'foo' }, [v('div', { key: 'bar' }, ['hello world'])]);
				}

				getMeta() {
					return this.meta(MyMeta);
				}
			}

			const div = document.createElement('div');
			const r = renderer(() => w(TestWidget, {}));
			r.mount({ domNode: div, sync: true });

			assert.isTrue(meta.has('foo'), '1');
			assert.isTrue(meta.has('bar'), '2');
			assert.isTrue(onFoo.calledOnce, '3');
			assert.isTrue(onBar.calledOnce, '4');
			assert.isTrue(onWidget.calledOnce, '5');
			assert.isTrue(onFoo.calledBefore(onWidget), '6');
		},
		'integration with multiple root node'() {
			class MyMeta extends MetaBase {
				callGetNode(key: string) {
					return this.getNode(key);
				}
				getNodeHandler() {
					return this.nodeHandler;
				}
			}

			const onFoo = stub();
			const onBar = stub();
			const onWidget = stub();
			let meta: any;
			class TestWidget extends WidgetBase {
				constructor() {
					super();
					meta = this.meta(MyMeta);
					const nodeHandler = meta.getNodeHandler();
					nodeHandler.on('foo', onFoo);
					nodeHandler.on('bar', onBar);
					nodeHandler.on(NodeEventType.Widget, onWidget);
				}

				render() {
					return [v('div', { key: 'foo' }), v('div', { key: 'bar' })];
				}

				getMeta() {
					return this.meta(MyMeta);
				}
			}
			const div = document.createElement('div');
			const r = renderer(() => w(TestWidget, {}));
			r.mount({ domNode: div, sync: true });

			assert.isTrue(meta.has('foo'));
			assert.isTrue(meta.has('bar'));
			assert.isTrue(onFoo.calledOnce);
			assert.isTrue(onBar.calledOnce);
			assert.isTrue(onWidget.calledOnce);
			assert.isTrue(onFoo.calledBefore(onWidget));
		}
	}
});
