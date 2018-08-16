const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import { WidgetBase } from '../../../src/widget-core/WidgetBase';
import { w } from '../../../src/widget-core/d';
import { WNode } from '../../../src/widget-core/interfaces';
import { MemoryHistory as HistoryManager } from '../../../src/routing/history/MemoryHistory';
import { Outlet } from '../../../src/routing/Outlet';
import { Registry } from '../../../src/widget-core/Registry';
import { registerRouterInjector } from '../../../src/routing/RouterInjector';

class Widget extends WidgetBase {
	render() {
		return 'widget';
	}
}

const configOnEnter = stub();
const configOnExit = stub();
let registry: Registry;

const routeConfig = [
	{
		path: '/foo',
		outlet: 'foo',
		children: [
			{
				path: '/bar',
				outlet: 'bar'
			}
		]
	},
	{
		path: 'baz/{baz}',
		outlet: 'baz'
	}
];

describe('Outlet', () => {
	beforeEach(() => {
		registry = new Registry();
		configOnEnter.reset();
		configOnExit.reset();
	});

	it('Should render the result of the renderer when the outlet matches', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });

		router.setPath('/foo');
		const outlet = new Outlet();
		outlet.__setProperties__({
			id: 'foo',
			renderer() {
				return w(Widget, {});
			}
		});
		outlet.registry.base = registry;
		const renderResult = outlet.__render__() as WNode;
		assert.strictEqual(renderResult.widgetConstructor, Widget);
		assert.deepEqual(renderResult.children, []);
		assert.deepEqual(renderResult.properties, {});
	});

	it('Should set the type as index for exact matches', () => {
		let matchType: string | undefined;
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo');
		const outlet = new Outlet();
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				matchType = details.type;
				return null;
			}
		});
		outlet.registry.base = registry;
		outlet.__render__() as WNode;
		assert.strictEqual(matchType, 'index');
	});

	it('Should set the type as error for error matches', () => {
		let matchType: string | undefined;
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo/other');
		const outlet = new Outlet();
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				matchType = details.type;
				return null;
			}
		});
		outlet.registry.base = registry;
		outlet.__render__() as WNode;
		assert.strictEqual(matchType, 'error');
	});

	it('configuration onEnter called when the outlet is rendered', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				children: [
					{
						path: '/bar',
						outlet: 'bar'
					}
				]
			},
			{
				path: 'baz/{baz}',
				outlet: 'baz',
				onEnter: configOnEnter,
				onExit: configOnExit
			}
		];

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/baz/param');
		const outlet = new Outlet();
		outlet.__setProperties__({
			id: 'baz',
			renderer(details) {
				return w(Widget, {});
			}
		});
		outlet.registry.base = registry;
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledOnce);
		router.setPath('/baz/bar');
		outlet.__render__();
		assert.isTrue(configOnEnter.calledTwice);
		router.setPath('/baz/baz');
		outlet.__render__();
		assert.isTrue(configOnEnter.calledThrice);
	});

	it('configuration onEnter called when the outlet if params change', () => {
		class InnerWidget extends WidgetBase {
			render() {
				return 'inner';
			}
		}

		class OuterWidget extends WidgetBase {
			render() {
				return w(Outlet, {
					id: 'quz',
					renderer() {
						return w(InnerWidget, {});
					}
				});
			}
		}
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				children: [
					{
						path: '/bar',
						outlet: 'bar'
					}
				]
			},
			{
				path: 'baz/{baz}',
				outlet: 'baz',
				onEnter: configOnEnter,
				onExit: configOnExit,
				children: [
					{
						path: 'qux',
						outlet: 'qux'
					}
				]
			}
		];

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/baz/param');
		const outlet = new Outlet();
		outlet.__setProperties__({
			id: 'baz',
			renderer() {
				return w(OuterWidget, {});
			}
		});
		outlet.registry.base = registry;
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledOnce);
		router.setPath('/baz/bar');
		outlet.__render__();
		assert.isTrue(configOnEnter.calledTwice);
		router.setPath('/baz/bar/qux');
		outlet.__render__();
		assert.isTrue(configOnEnter.calledTwice);
		router.setPath('/baz/foo/qux');
		outlet.__render__();
		assert.isTrue(configOnEnter.calledThrice);
	});

	it('configuration onExit called when the outlet is rendered', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				onEnter: configOnEnter,
				onExit: configOnExit,
				children: [
					{
						path: '/bar',
						outlet: 'bar'
					}
				]
			},
			{
				path: 'baz/{baz}',
				outlet: 'baz'
			}
		];

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo');
		const outlet = new Outlet();
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				if (details.type === 'index') {
					return w(Widget, {});
				}
			}
		});
		outlet.registry.base = registry;
		outlet.__render__() as WNode;
		assert.isTrue(configOnExit.notCalled);
		router.setPath('/foo/bar');
		outlet.__render__();
		assert.isTrue(configOnExit.calledOnce);
		router.setPath('/baz');
		outlet.__render__();
		assert.isTrue(configOnExit.calledOnce);
		router.setPath('/foo');
		outlet.__render__();
		assert.isTrue(configOnExit.calledOnce);
	});

	it('Should connect the outlet on attach', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				onEnter: configOnEnter,
				onExit: configOnExit
			}
		];

		let invalidateCount = 0;
		class TestOutlet extends Outlet {
			onAttach() {
				super.onAttach();
			}

			invalidate() {
				invalidateCount++;
			}
		}

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo');
		const outlet = new TestOutlet();
		outlet.registry.base = registry;
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				if (details.type === 'index') {
					return w(Widget, {});
				}
			}
		});
		outlet.onAttach();
		invalidateCount = 0;
		router.setPath('/other');
		assert.strictEqual(invalidateCount, 1);
	});

	it('Should call onExit if matched when onDetach is called', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				onEnter: configOnEnter,
				onExit: configOnExit
			}
		];

		class TestOutlet extends Outlet {
			onDetach() {
				super.onDetach();
			}
		}

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo');
		const outlet = new TestOutlet();
		outlet.registry.base = registry;
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				if (details.type === 'index') {
					return w(Widget, {});
				}
			}
		});

		outlet.__render__() as WNode;
		outlet.onDetach();
		assert.isTrue(configOnExit.calledOnce);
	});

	it('Should not call onExit if not matched when onDetach is called', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				onEnter: configOnEnter,
				onExit: configOnExit
			}
		];

		class TestOutlet extends Outlet {
			onDetach() {
				super.onDetach();
			}
		}

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/other');
		const outlet = new TestOutlet();
		outlet.registry.base = registry;
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				if (details.type === 'index') {
					return w(Widget, {});
				}
			}
		});

		outlet.__render__() as WNode;
		outlet.onDetach();
		assert.isTrue(configOnExit.notCalled);
	});

	it('Should render nothing when if no router is available', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				onEnter: configOnEnter,
				onExit: configOnExit
			}
		];

		class TestOutlet extends Outlet {
			onDetach() {
				super.onDetach();
			}
		}

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/other');
		const outlet = new TestOutlet();
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				if (details.type === 'index') {
					return w(Widget, {});
				}
			}
		});

		assert.isNull(outlet.__render__());
	});

	it('Should change the invalidator if the router key changes', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				onEnter: configOnEnter,
				onExit: configOnExit
			}
		];

		let invalidateCount = 0;
		class TestOutlet extends Outlet {
			invalidate() {
				invalidateCount++;
			}
		}

		const routerOne = registerRouterInjector(routeConfig, registry, { HistoryManager, key: 'my-router' });
		const routerTwo = registerRouterInjector(routeConfig, registry, { HistoryManager });
		routerOne.setPath('/foo');
		const outlet = new TestOutlet();
		outlet.registry.base = registry;
		outlet.__setProperties__({
			id: 'foo',
			routerKey: 'my-router',
			renderer(details) {
				if (details.type === 'index') {
					return w(Widget, {});
				}
			}
		});
		invalidateCount = 0;
		routerOne.setPath('/bar');
		assert.strictEqual(invalidateCount, 1);
		routerTwo.setPath('/foo');
		assert.strictEqual(invalidateCount, 1);
		outlet.__setProperties__({
			id: 'foo',
			renderer(details) {
				if (details.type === 'index') {
					return w(Widget, {});
				}
			}
		});
		assert.strictEqual(invalidateCount, 3);
		routerOne.setPath('/bar');
		assert.strictEqual(invalidateCount, 3);
		routerTwo.setPath('/bar');
		assert.strictEqual(invalidateCount, 4);
	});
});
