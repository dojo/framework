const { suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v } from '@dojo/widget-core/d';
import { Registry } from '@dojo/widget-core/Registry';
import { WNode } from '@dojo/widget-core/interfaces';

import { registerRouterInjector } from '../../src/RouterInjector';
import { MatchType } from '../../src/interfaces';
import { MemoryHistory } from '../../src/history/MemoryHistory';
import { Outlet } from '../../src/Outlet';

const registry = new Registry();

class MainWidget extends WidgetBase {
	render() {
		return 'Main';
	}
}

class IndexWidget extends WidgetBase {
	render() {
		return 'Index';
	}
}

class ErrorWidget extends WidgetBase {
	render() {
		return 'Error';
	}
}

class ParamsWidget extends WidgetBase {
	render() {
		return v('div', this.properties, [ 'Params' ]);
	}
}

const routerConfig = [
	{
		path: 'main',
		children: [
			{
				path: 'next'
			},
			{
				path: '{param}',
				outlet: 'params'
			}
		]
	}
];
const history = new MemoryHistory();
const router = registerRouterInjector(routerConfig, registry, { history });
const otherRouter = registerRouterInjector(routerConfig, registry, { history, key: 'router-key' });
router.start();
otherRouter.start();

suite('Outlet', () => {

	test('renders main widget given a partial path match', () => {
		const TestOutlet = Outlet(MainWidget, 'main');

		return router.dispatch({}, '/main/next').then(() => {
			const outlet = new TestOutlet();
			outlet.__setCoreProperties__({ bind: outlet, baseRegistry: registry });
			outlet.__setProperties__({});
			const dNode = outlet.__render__() as WNode;
			assert.strictEqual(dNode.widgetConstructor, MainWidget);
		});
	});
	test('renders index widget given an exact path match', () => {
		const TestOutlet = Outlet({
			main: MainWidget,
			index: IndexWidget,
			error: ErrorWidget
		}, 'main');

		return router.dispatch({}, '/main').then(() => {
			const outlet = new TestOutlet();
			outlet.__setCoreProperties__({ bind: outlet, baseRegistry: registry });
			outlet.__setProperties__({});
			const dNode = outlet.__render__() as WNode;
			assert.strictEqual(dNode.widgetConstructor, IndexWidget);
		});
	});
	test('renders main widget given an exact path match and no index component', () => {
		const TestOutlet = Outlet({
			main: MainWidget,
			error: ErrorWidget
		}, 'main');

		return router.dispatch({}, '/main').then(() => {
			const outlet = new TestOutlet();
			outlet.__setCoreProperties__({ bind: outlet, baseRegistry: registry });
			outlet.__setProperties__({});
			const dNode = outlet.__render__() as WNode;
			assert.strictEqual(dNode.widgetConstructor, MainWidget);
		});
	});
	test('renders error widget given no path match and no index component', () => {
		const TestOutlet = Outlet({
			main: MainWidget,
			error: ErrorWidget
		}, 'next');

		return router.dispatch({}, '/main/next/other').then(() => {
			const outlet = new TestOutlet();
			outlet.__setCoreProperties__({ bind: outlet, baseRegistry: registry });
			outlet.__setProperties__({});
			const dNode = outlet.__render__() as WNode;
			assert.strictEqual(dNode.widgetConstructor, ErrorWidget);
		});
	});
	test('renders null given a partial path match and no main component', () => {
		const TestOutlet = Outlet({
			index: IndexWidget,
			error: ErrorWidget
		}, 'main');

		return router.dispatch({}, '/main/next').then(() => {
			const outlet = new TestOutlet();
			outlet.__setCoreProperties__({ bind: outlet, baseRegistry: registry });
			outlet.__setProperties__({});
			const dNode = outlet.__render__();
			assert.isNull(dNode);
		});
	});
	test('renders null when null outlet matches', () => {
		const TestOutlet = Outlet({
			index: IndexWidget,
			error: ErrorWidget
		}, 'main');

		return router.dispatch({}, '/other').then(() => {
			const outlet = new TestOutlet();
			outlet.__setCoreProperties__({ bind: outlet, baseRegistry: registry });
			outlet.__setProperties__({});
			const dNode = outlet.__render__();
			assert.isNull(dNode);
		});
	});
	test('params get passed to getProperties mapper and the returned object injected into widget as properties',
		() => {
			const TestOutlet = Outlet(ParamsWidget, 'params', (options) => {
				return options;
			}, 'router-key');

			return router.dispatch({}, '/main/my-param').then(() => {
				const outlet = new TestOutlet();
				outlet.__setCoreProperties__({ bind: outlet, baseRegistry: registry });
				outlet.__setProperties__({});
				const dNode: any = outlet.__render__();
				assert.strictEqual(dNode.properties.router, router);
				assert.strictEqual(dNode.properties.location, 'main/my-param');
				assert.deepEqual(dNode.properties.params, { param: 'my-param' });
				assert.strictEqual(dNode.properties.type, MatchType.INDEX);
			});
		});
});
