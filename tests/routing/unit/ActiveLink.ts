const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');

import { Registry } from '../../../src/widget-core/Registry';

import { Router } from '../../../src/routing/Router';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';
import { WNode } from '../../../src/widget-core/interfaces';
import Link from '../../../src/routing/Link';
import ActiveLink from '../../../src/routing/ActiveLink';
import { registerRouterInjector } from '../../../src/routing/RouterInjector';
import { w, v } from '../../../src/widget-core/d';
import { renderer } from '../../../src/widget-core/vdom';
import WidgetBase from '../../../src/widget-core/WidgetBase';

const registry = new Registry();

const router = new Router(
	[
		{
			path: 'foo',
			outlet: 'foo',
			children: [
				{
					path: 'bar',
					outlet: 'bar'
				}
			]
		},
		{
			path: 'other',
			outlet: 'other'
		},
		{
			path: 'param',
			outlet: 'param',
			children: [
				{
					path: '{suffix}',
					outlet: 'suffixed-param'
				}
			]
		}
	],
	{ HistoryManager: MemoryHistory }
);

registry.defineInjector('router', () => () => router);

describe('ActiveLink', () => {
	it('should invalidate when the outlet has been matched', () => {
		let invalidateCallCount = 0;

		class MyActiveLink extends ActiveLink {
			invalidate() {
				super.invalidate();
				invalidateCallCount++;
			}
		}

		const link = new MyActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'foo');
		invalidateCallCount = 0;
		router.setPath('/foo');
		assert.strictEqual(invalidateCallCount, 1);
		router.setPath('/foo/bar');
		assert.strictEqual(invalidateCallCount, 1);
		router.setPath('/baz');
		assert.strictEqual(invalidateCallCount, 2);
	});

	it('Does not add active class when outlet is not active', () => {
		router.setPath('/other');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should add the active class when the outlet is active', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo', undefined, null] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo', undefined, null]);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should render the ActiveLink children', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		link.__setChildren__(['hello']);
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
		assert.deepEqual(dNode.children[0] as any, {
			children: undefined,
			properties: {},
			tag: '',
			text: 'hello',
			type: '__VNODE_TYPE'
		});
	});

	it('Should mix the active class onto existing string class when the outlet is active', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'], classes: 'bar' });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['bar', 'foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should mix the active class onto existing array of classes when the outlet is active', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo', 'qux'], classes: ['bar', 'baz'] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['bar', 'baz', 'foo', 'qux']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should invalidate and re-render when link becomes active', () => {
		let invalidateCount = 0;
		router.setPath('/foo');

		class TestActiveLink extends ActiveLink {
			invalidate() {
				invalidateCount++;
				super.invalidate();
			}
		}

		const link = new TestActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		let dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
		invalidateCount = 0;
		router.setPath('/other');
		assert.strictEqual(invalidateCount, 1);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'foo');
		router.setPath('/foo');
		assert.strictEqual(invalidateCount, 2);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should support changing the target outlet', () => {
		let invalidateCount = 0;
		router.setPath('/foo');

		class TestActiveLink extends ActiveLink {
			invalidate() {
				invalidateCount++;
				super.invalidate();
			}
		}

		const link = new TestActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		let dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
		invalidateCount = 0;
		link.__setProperties__({ to: 'other', activeClasses: ['foo'] });
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(invalidateCount, 1);
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'other');
		router.setPath('/foo/bar');
		assert.strictEqual(invalidateCount, 1);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'other');
		router.setPath('/other');
		assert.strictEqual(invalidateCount, 2);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'other');
	});

	it('Should return link when the router injector is not available', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'], classes: 'bar', routerKey: 'other' });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['bar']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('should look at route params when determining active', () => {
		router.setPath('/param/one');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({
			to: 'suffixed-param',
			activeClasses: ['foo'],
			params: {
				suffix: 'one'
			}
		});
		const dNode = link.__render__() as WNode<Link>;

		assert.deepEqual(dNode.properties.classes, ['foo']);

		const link2 = new ActiveLink();
		link2.registry.base = registry;
		link2.__setProperties__({
			to: 'suffixed-param',
			activeClasses: ['foo'],
			params: {
				suffix: 'two'
			}
		});
		const dNode2 = link2.__render__() as WNode<Link>;

		assert.deepEqual(dNode2.properties.classes, []);
	});

	jsdomDescribe('integration tests', () => {
		it('should render outlets correctly', () => {
			const registry = new Registry();
			const router = registerRouterInjector(
				[
					{
						path: 'foo',
						outlet: 'foo',
						defaultRoute: true
					},
					{
						path: 'bar',
						outlet: 'bar'
					},
					{
						path: 'baz',
						outlet: 'baz'
					}
				],
				registry,
				{ HistoryManager: MemoryHistory }
			);

			class App extends WidgetBase {
				protected render() {
					return v('div', [
						w(ActiveLink, { to: 'foo', activeClasses: ['foo'] }),
						w(ActiveLink, { to: 'bar', activeClasses: ['bar'] }),
						w(ActiveLink, { to: 'baz', activeClasses: ['baz'] })
					]);
				}
			}

			const root = document.createElement('div') as any;
			const r = renderer(() => w(App, {}));
			r.mount({ domNode: root, sync: true, registry });
			assert.strictEqual(root.childNodes[0].childNodes[0].getAttribute('class'), 'foo');
			assert.isNull(root.childNodes[0].childNodes[1].getAttribute('class'));
			assert.isNull(root.childNodes[0].childNodes[2].getAttribute('class'));
			router.setPath('/bar');
			assert.isNull(root.childNodes[0].childNodes[0].getAttribute('class'));
			assert.strictEqual(root.childNodes[0].childNodes[1].getAttribute('class'), 'bar');
			assert.isNull(root.childNodes[0].childNodes[2].getAttribute('class'));
			router.setPath('/baz');
			assert.isNull(root.childNodes[0].childNodes[0].getAttribute('class'));
			assert.isNull(root.childNodes[0].childNodes[1].getAttribute('class'));
			assert.strictEqual(root.childNodes[0].childNodes[2].getAttribute('class'), 'baz');
			router.setPath('/foo');
			assert.strictEqual(root.childNodes[0].childNodes[0].getAttribute('class'), 'foo');
			assert.isNull(root.childNodes[0].childNodes[1].getAttribute('class'));
			assert.isNull(root.childNodes[0].childNodes[2].getAttribute('class'));
		});
	});
});
