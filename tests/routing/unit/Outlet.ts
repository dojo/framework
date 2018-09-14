const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

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

	it('Should connect the outlet on attach', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo'
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

	it('Should render nothing when if no router is available', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo'
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

		assert.isUndefined(outlet.__render__());
	});

	it('Should change the invalidator if the router key changes', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo'
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
