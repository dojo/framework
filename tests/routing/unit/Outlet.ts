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
	});

	it('Should render the main component for index matches when no index component is set', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });

		router.setPath('/foo');
		const TestOutlet = Outlet(() => w(Widget, {}), { outlet: 'foo' });
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		const renderResult = outlet.__render__() as WNode;
		assert.strictEqual(renderResult.widgetConstructor, Widget);
		assert.deepEqual(renderResult.children, []);
		assert.deepEqual(renderResult.properties, {});
	});

	it('Should render the main component for partial matches', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo/bar');
		const TestOutlet = Outlet(() => w(Widget, {}), { outlet: 'foo' });
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		const renderResult = outlet.__render__() as WNode;
		assert.strictEqual(renderResult.widgetConstructor, Widget);
		assert.deepEqual(renderResult.children, []);
		assert.deepEqual(renderResult.properties, {});
	});

	it('Should render the index component only for index matches', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo');
		const TestOutlet = Outlet(
			(properties, outletProperties) => {
				if (outletProperties.type === 'index') {
					return w(Widget, {});
				}
			},
			{ outlet: 'foo' }
		);
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		let renderResult = outlet.__render__() as WNode;
		assert.strictEqual(renderResult.widgetConstructor, Widget);
		assert.deepEqual(renderResult.children, []);
		assert.deepEqual(renderResult.properties, {});
		router.setPath('/foo/bar');
		renderResult = outlet.__render__() as WNode;
		assert.isNull(renderResult);
	});

	it('Should render the error component only for error matches', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo/other');
		const TestOutlet = Outlet(
			(properties, outletProperties) => {
				if (outletProperties.type === 'error') {
					return w(Widget, {});
				}
			},
			{ outlet: 'foo' }
		);
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		let renderResult = outlet.__render__() as WNode;
		assert.strictEqual(renderResult.widgetConstructor, Widget);
		assert.deepEqual(renderResult.children, []);
		assert.deepEqual(renderResult.properties, {});
	});

	it('Should render the index component only for error matches when there is no error component', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo/other');
		const TestOutlet = Outlet(
			(properties, outletProperties) => {
				if (outletProperties.type === 'error') {
					return w(Widget, {});
				}
			},
			{ outlet: 'foo' }
		);
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		let renderResult = outlet.__render__() as WNode;
		assert.strictEqual(renderResult.widgetConstructor, Widget);
		assert.deepEqual(renderResult.children, []);
		assert.deepEqual(renderResult.properties, {});
	});

	it('Map params is called with params, queryParams, match type and router', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/baz/bazParam?bazQuery=true');
		const TestOutlet = Outlet(
			(properties, outletProperties) => {
				assert.deepEqual(outletProperties.params, { baz: 'bazParams' });
				assert.deepEqual(outletProperties.queryParams, { bazQuery: 'true' });
				assert.strictEqual(outletProperties.router, router);
				assert.strictEqual(outletProperties.type, 'index');

				if (outletProperties.type === 'index') {
					return w(Widget, {});
				}
			},
			{ outlet: 'foo' }
		);
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		outlet.__render__() as WNode;
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
		const TestOutlet = Outlet(
			(properties, outletProperties) => {
				if (outletProperties.type === 'index') {
					return w(Widget, {});
				}
			},
			{ outlet: 'baz' }
		);
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledOnce);
		router.setPath('/baz/bar');
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledTwice);
		router.setPath('/baz/baz');
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledThrice);
	});

	it('configuration onEnter called when the outlet if params change', () => {
		class InnerWidget extends WidgetBase {
			render() {
				return 'inner';
			}
		}
		const InnerOutlet = Outlet(
			(properties, outletProperties) => {
				if (outletProperties.type === 'index') {
					return w(InnerWidget, {});
				}
			},
			{ outlet: 'qux' }
		);
		class OuterWidget extends WidgetBase {
			render() {
				return w(InnerOutlet, {});
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
		const TestOutlet = Outlet(
			(properties, outletProperties) => {
				return w(OuterWidget, {});
			},
			{ outlet: 'baz' }
		);
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledOnce);
		router.setPath('/baz/bar');
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledTwice);
		router.setPath('/baz/bar/qux');
		outlet.__render__() as WNode;
		assert.isTrue(configOnEnter.calledTwice);
		router.setPath('/baz/foo/qux');
		outlet.__render__() as WNode;
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
		const TestOutlet = Outlet(
			(properties, outletProperties) => {
				if (outletProperties.type === 'index') {
					return w(Widget, {});
				}
			},
			{ outlet: 'foo' }
		);
		const outlet = new TestOutlet();
		outlet.__setCoreProperties__({ baseRegistry: registry, bind: outlet });
		outlet.__render__() as WNode;
		assert.isTrue(configOnExit.notCalled);
		router.setPath('/foo/bar');
		outlet.__render__() as WNode;
		assert.isTrue(configOnExit.calledOnce);
		router.setPath('/baz');
		outlet.__render__() as WNode;
		assert.isTrue(configOnExit.calledOnce);
		router.setPath('/foo');
		outlet.__render__() as WNode;
		assert.isTrue(configOnExit.calledOnce);
	});
});
