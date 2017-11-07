const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { Base as MetaBase } from '../../../src/meta/Base';
import { stub, spy } from 'sinon';
import { createResolvers } from './../../support/util';
import NodeHandler, { NodeEventType } from '../../../src/NodeHandler';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { WidgetBase } from '../../../src/WidgetBase';

const resolvers = createResolvers();
const bindInstance = new WidgetBase();

registerSuite('meta base', {
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

			onSpy.reset();
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
			onSpy.reset();
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

			class TestWidget extends ProjectorMixin(WidgetBase) {
				render() {
					return v('div', { key: 'foo' }, [
						v('div', { key: 'bar' }, [ 'hello world' ])
					]);
				}

				getMeta() {
					return this.meta(MyMeta);
				}
			}

			const widget = new TestWidget();
			const meta = widget.getMeta();

			const nodeHandler = meta.getNodeHandler();
			const onFoo = stub();
			const onBar = stub();
			const onWidget = stub();

			nodeHandler.on('foo', onFoo);
			nodeHandler.on('bar', onBar);
			nodeHandler.on(NodeEventType.Widget, onWidget);

			const div = document.createElement('div');
			widget.append(div);
			resolvers.resolve();

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

			class TestWidget extends ProjectorMixin(WidgetBase) {
				render() {
					return [
						v('div', { key: 'foo' }),
						v('div', { key: 'bar' })
					];
				}

				getMeta() {
					return this.meta(MyMeta);
				}
			}

			const widget = new TestWidget();
			const meta = widget.getMeta();

			const nodeHandler = meta.getNodeHandler();
			const onFoo = stub();
			const onBar = stub();
			const onWidget = stub();

			nodeHandler.on('foo', onFoo);
			nodeHandler.on('bar', onBar);
			nodeHandler.on(NodeEventType.Widget, onWidget);

			const div = document.createElement('div');
			widget.append(div);
			resolvers.resolve();

			assert.isTrue(meta.has('foo'));
			assert.isTrue(meta.has('bar'));
			assert.isTrue(onFoo.calledOnce);
			assert.isTrue(onBar.calledOnce);
			assert.isTrue(onWidget.calledOnce);
			assert.isTrue(onFoo.calledBefore(onWidget));
		}
	}
});
