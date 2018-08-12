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
			outlet: 'foo',
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
			outlet: 'foo',
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
			outlet: 'foo',
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
			outlet: 'baz',
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
					outlet: 'quz',
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
			outlet: 'baz',
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
			outlet: 'foo',
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

	it('Should render nothing when if no router is available', () => {});
});
