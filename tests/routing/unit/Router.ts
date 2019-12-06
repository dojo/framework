const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { Router } from '../../../src/routing/Router';
import { MemoryHistory as HistoryManager } from '../../../src/routing/history/MemoryHistory';

const routeConfig = [
	{
		path: '/',
		outlet: 'home'
	},
	{
		path: '/foo',
		outlet: 'foo',
		children: [
			{
				path: '/bar',
				outlet: 'bar'
			},
			{
				path: '/{baz}/baz',
				outlet: 'baz',
				children: [
					{
						path: '/{qux}/qux',
						outlet: 'qux'
					}
				]
			}
		]
	}
];

const routeConfigNoRoot = [
	{
		path: '/foo',
		outlet: 'foo'
	}
];

const routeConfigDefaultRoute = [
	{
		path: '/foo/{bar}',
		outlet: 'foo',
		defaultRoute: true,
		defaultParams: {
			bar: 'defaultBar'
		},
		children: [
			{
				path: 'bar/{foo}',
				outlet: 'bar',
				defaultParams: {
					foo: 'defaultFoo'
				}
			}
		]
	}
];

const routeConfigDefaultRouteNoDefaultParams = [
	{
		path: '/foo/{bar}',
		outlet: 'foo',
		defaultRoute: true
	}
];

const routeWithChildrenAndMultipleParams = [
	{
		path: '/foo/{foo}',
		outlet: 'foo',
		children: [
			{
				path: '/bar/{bar}',
				outlet: 'bar',
				children: [
					{
						path: '/baz/{baz}',
						outlet: 'baz'
					}
				]
			}
		]
	}
];

const routeConfigWithParamsAndQueryParams = [
	{
		path: '/foo/{foo}?{fooQuery}',
		outlet: 'foo',
		defaultParams: {
			foo: 'foo',
			fooQuery: 'fooQuery'
		},
		children: [
			{
				path: '/bar/{bar}?{barQuery}',
				outlet: 'bar',
				defaultParams: {
					bar: 'bar',
					barQuery: 'barQuery'
				}
			}
		]
	}
];

const orderIndependentRouteConfig = [
	{
		path: '{foo}',
		outlet: 'partial',
		children: [
			{
				path: 'bar/{bar}',
				outlet: 'bar-with-param'
			},
			{
				path: 'bar/bar',
				outlet: 'bar'
			}
		]
	},
	{
		path: 'foo',
		outlet: 'foo'
	},
	{
		path: '/',
		outlet: 'home'
	}
];

const config = [
	{
		path: 'foo',
		outlet: 'foo-one'
	},
	{
		path: 'foo',
		outlet: 'foo-two',
		children: [
			{
				path: 'baz',
				outlet: 'baz'
			}
		]
	},
	{
		path: '{bar}',
		outlet: 'param'
	},
	{
		path: 'bar',
		outlet: 'bar'
	}
];

describe('Router', () => {
	it('Navigates to current route if matches against a registered outlet', () => {
		const router = new Router(routeConfig, { HistoryManager });
		const context = router.getOutlet('home');
		assert.isOk(context);
	});

	it('Navigates to default route if current route does not matches against a registered outlet', () => {
		const router = new Router(routeConfigDefaultRoute, { HistoryManager });
		const context = router.getOutlet('foo');
		assert.isOk(context);
	});

	it('should match against the most exact outlet specified in the configuration based on the outlets score', () => {
		const router = new Router(config, { HistoryManager });
		router.setPath('/bar');
		assert.isOk(router.getOutlet('bar'));
		assert.isUndefined(router.getOutlet('param'));
		router.setPath('/foo/baz');
		assert.isOk(router.getOutlet('baz'));
		assert.isOk(router.getOutlet('foo-two'));
		assert.isUndefined(router.getOutlet('foo-one'));
	});

	it('Navigates to global "errorOutlet" if current route does not match a registered outlet and no default route is configured', () => {
		const router = new Router(routeConfigNoRoot, { HistoryManager });
		const context = router.getOutlet('errorOutlet');
		assert.isOk(context);
		assert.deepEqual(context!.params, {});
		assert.deepEqual(context!.queryParams, {});
		assert.strictEqual(context!.type, 'error');
		assert.strictEqual(context!.isError(), true);
		assert.strictEqual(context!.isExact(), false);
	});

	it('Should navigates to global "errorOutlet" if default route requires params but none have been provided', () => {
		const router = new Router(routeConfigDefaultRouteNoDefaultParams, { HistoryManager });
		const fooContext = router.getOutlet('foo');
		assert.isNotOk(fooContext);
		const errorContext = router.getOutlet('errorOutlet');
		assert.isOk(errorContext);
		assert.deepEqual(errorContext!.params, {});
		assert.deepEqual(errorContext!.queryParams, {});
		assert.strictEqual(errorContext!.type, 'error');
		assert.strictEqual(errorContext!.isError(), true);
		assert.strictEqual(errorContext!.isExact(), false);
	});

	it('Should register as an index match for an outlet that index matches the route', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo');
		const context = router.getOutlet('foo');
		assert.isOk(context);
		assert.deepEqual(context!.params, {});
		assert.deepEqual(context!.queryParams, {});
		assert.strictEqual(context!.type, 'index');
		assert.strictEqual(context!.isExact(), true);
	});

	it('should find the most specific match from the routing configuration', () => {
		const router = new Router(orderIndependentRouteConfig, { HistoryManager });
		router.setPath('/foo');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'index');
		assert.strictEqual(fooContext!.isExact(), true);
		router.setPath('/foo/bar/bar');
		const barContext = router.getOutlet('bar');
		assert.isOk(barContext);
		assert.deepEqual(barContext!.params, { foo: 'foo' });
		assert.deepEqual(barContext!.queryParams, {});
		assert.deepEqual(barContext!.type, 'index');
		assert.strictEqual(barContext!.isExact(), true);
		const partialContext = router.getOutlet('partial');
		assert.isOk(partialContext);
		assert.deepEqual(partialContext!.params, { foo: 'foo' });
		assert.deepEqual(partialContext!.queryParams, {});
		assert.deepEqual(partialContext!.type, 'partial');
		assert.strictEqual(partialContext!.isExact(), false);
	});

	it('Should register as a partial match for an outlet that matches a section of the route', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/bar');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		const barContext = router.getOutlet('bar');
		assert.isOk(barContext);
		assert.deepEqual(barContext!.params, {});
		assert.deepEqual(barContext!.queryParams, {});
		assert.deepEqual(barContext!.type, 'index');
		assert.strictEqual(barContext!.isExact(), true);
	});

	it('Should register as a error match for an outlet that matches a section of the route with no further matching registered outlets', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/unknown');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'error');
		assert.strictEqual(fooContext!.isError(), true);
		const barContext = router.getOutlet('bar');
		assert.isNotOk(barContext);
	});

	it('Matches routes against outlets with params', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/baz/baz');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		assert.strictEqual(fooContext!.isError(), false);
		const context = router.getOutlet('baz');
		assert.isOk(context);
		assert.deepEqual(context!.params, { baz: 'baz' });
		assert.deepEqual(context!.queryParams, {});
		assert.deepEqual(context!.type, 'index');
		assert.strictEqual(context!.isExact(), true);
		assert.strictEqual(context!.isError(), false);
	});

	it('Should return params from all matching outlets', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/baz/baz/qux/qux?hello=world');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, { hello: 'world' });
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		assert.strictEqual(fooContext!.isError(), false);
		const bazContext = router.getOutlet('baz');
		assert.isOk(bazContext);
		assert.deepEqual(bazContext!.params, { baz: 'baz' });
		assert.deepEqual(bazContext!.queryParams, { hello: 'world' });
		assert.deepEqual(bazContext!.type, 'partial');
		assert.strictEqual(bazContext!.isExact(), false);
		assert.strictEqual(bazContext!.isError(), false);
		const quxContext = router.getOutlet('qux');
		assert.isOk(quxContext);
		assert.deepEqual(quxContext!.params, { baz: 'baz', qux: 'qux' });
		assert.deepEqual(quxContext!.queryParams, { hello: 'world' });
		assert.deepEqual(quxContext!.type, 'index');
		assert.strictEqual(quxContext!.isExact(), true);
		assert.strictEqual(quxContext!.isError(), false);
	});

	it('Should pass query params to all matched outlets', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/bar?query=true');
		const fooContext = router.getOutlet('foo');
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, { query: 'true' });
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		assert.strictEqual(fooContext!.isError(), false);
		const barContext = router.getOutlet('bar');
		assert.deepEqual(barContext!.params, {});
		assert.deepEqual(barContext!.queryParams, { query: 'true' });
		assert.deepEqual(barContext!.type, 'index');
		assert.strictEqual(barContext!.isExact(), true);
		assert.strictEqual(barContext!.isError(), false);
	});

	it('Should pass params and query params to all matched outlets', () => {
		const config = [
			{
				path: 'view/{view}?{filter}',
				outlet: 'foo'
			}
		];
		const router = new Router(config, { HistoryManager });
		router.setPath('/view/bar?filter=true');
		const fooContext = router.getOutlet('foo');
		assert.deepEqual(fooContext!.params, { view: 'bar' });
		assert.deepEqual(fooContext!.queryParams, { filter: 'true' });
		assert.deepEqual(fooContext!.type, 'index');
		assert.strictEqual(fooContext!.isExact(), true);
		assert.strictEqual(fooContext!.isError(), false);
	});

	it('should emit outlet event when a route is entered and exited', () => {
		const router = new Router(routeConfig, { HistoryManager });
		let handle = router.on('outlet', () => {});
		handle.destroy();
		handle = router.on('outlet', ({ outlet, action }) => {
			if (action === 'exit') {
				assert.strictEqual(outlet.id, 'home');
			} else {
				assert.strictEqual(outlet.id, 'foo');
			}
		});
		router.setPath('/foo');
		handle.destroy();
		handle = router.on('outlet', ({ outlet, action }) => {
			assert.strictEqual(outlet.id, 'bar');
			assert.strictEqual(action, 'enter');
		});
		router.setPath('/foo/bar');
	});

	it('should emit outlet event when a routes param changes', () => {
		const router = new Router(routeConfig, { HistoryManager });
		let handle = router.on('outlet', () => {});
		handle.destroy();
		handle = router.on('outlet', ({ outlet, action }) => {
			if (action === 'exit') {
				assert.strictEqual(outlet.id, 'home');
			} else {
				assert.strictEqual(outlet.id, 'foo');
			}
		});
		router.setPath('/foo');
		handle.destroy();
		handle = router.on('outlet', ({ outlet, action }) => {
			assert.strictEqual(outlet.id, 'baz');
			assert.strictEqual(action, 'enter');
		});
		router.setPath('/foo/baz/baz');
		handle.destroy();
		handle = router.on('outlet', ({ outlet, action }) => {
			if (action === 'exit') {
				assert.strictEqual(outlet.id, 'baz');
				assert.deepEqual(outlet.params, { baz: 'baz' });
			} else {
				assert.strictEqual(outlet.id, 'baz');
				assert.deepEqual(outlet.params, { baz: 'baaz' });
			}
		});
		router.setPath('/foo/baaz/baz');
	});

	it('Should return all params for a route', () => {
		const router = new Router(routeWithChildrenAndMultipleParams, { HistoryManager });
		router.setPath('/foo/foo/bar/bar/baz/baz');
		assert.deepEqual(router.currentParams, {
			foo: 'foo',
			bar: 'bar',
			baz: 'baz'
		});
	});

	it('Should prefix links based on the history manager', () => {
		class TestHistoryManager extends HistoryManager {
			prefix(value: string) {
				return `test-${value}`;
			}
		}
		const router = new Router(routeWithChildrenAndMultipleParams, { HistoryManager: TestHistoryManager });
		router.setPath('/foo/foo/bar/bar/baz/baz');
		const link = router.link('baz');
		assert.strictEqual(link, 'test-foo/foo/bar/bar/baz/baz');
	});

	it('Should create link using current params', () => {
		const router = new Router(routeWithChildrenAndMultipleParams, { HistoryManager });
		router.setPath('/foo/foo/bar/bar/baz/baz');
		const link = router.link('baz');
		assert.strictEqual(link, 'foo/foo/bar/bar/baz/baz');
	});

	it('Should generate link with multiple params and query params', () => {
		const router = new Router(
			[
				{
					path: 'foo/{foo}/{bar}?{baz}&{qux}',
					outlet: 'foo',
					defaultParams: {
						foo: 'defaultFoo',
						bar: 'defaultBar',
						baz: 'defaultBaz',
						qux: 'defaultQux'
					}
				}
			],
			{ HistoryManager }
		);
		assert.strictEqual(
			router.link('foo', {
				foo: 'foo',
				bar: 'bar',
				baz: 'baz',
				qux: 'qux'
			}),
			'foo/foo/bar?baz=baz&qux=qux'
		);
		assert.strictEqual(router.link('foo'), 'foo/defaultFoo/defaultBar?baz=defaultBaz&qux=defaultQux');
	});

	it('Will not generate a link if params are not available', () => {
		const router = new Router(routeWithChildrenAndMultipleParams, { HistoryManager });
		const link = router.link('baz');
		assert.isUndefined(link);
	});

	it('Should use params passed to generate link', () => {
		const router = new Router(routeWithChildrenAndMultipleParams, { HistoryManager });
		router.setPath('/foo/foo/bar/bar/baz/baz');
		const link = router.link('baz', { bar: 'bar1' });
		assert.strictEqual(link, 'foo/foo/bar/bar1/baz/baz');
	});

	it('Should return undefined from link if there is a missing param', () => {
		const router = new Router(routeWithChildrenAndMultipleParams, { HistoryManager });
		const link = router.link('baz', { bar: 'bar1' });
		assert.isUndefined(link);
	});

	it('Should fallback to default params if params are not passed and no matching current params', () => {
		const router = new Router(routeConfigDefaultRoute, { HistoryManager });
		const link = router.link('foo');
		assert.strictEqual(link, 'foo/defaultBar');
	});

	it('Should fallback to full routes default params to generate link', () => {
		const router = new Router(routeConfigDefaultRoute, { HistoryManager });
		const link = router.link('bar');
		assert.strictEqual(link, 'foo/defaultBar/bar/defaultFoo');
	});

	it('Should create link with params and query params with default params', () => {
		const router = new Router(routeConfigWithParamsAndQueryParams, { HistoryManager });
		assert.strictEqual(router.link('foo'), 'foo/foo?fooQuery=fooQuery');
		assert.strictEqual(router.link('bar'), 'foo/foo/bar/bar?fooQuery=fooQuery&barQuery=barQuery');
	});

	it('Should create link with params and query params with current params', () => {
		const router = new Router(routeConfigWithParamsAndQueryParams, { HistoryManager });
		router.setPath('foo/bar/bar/foo?fooQuery=bar&barQuery=foo');
		assert.strictEqual(router.link('foo'), 'foo/bar?fooQuery=bar');
		assert.strictEqual(router.link('bar'), 'foo/bar/bar/foo?fooQuery=bar&barQuery=foo');
	});

	it('Should create link with params and query params with specified params', () => {
		const router = new Router(routeConfigWithParamsAndQueryParams, { HistoryManager });
		assert.strictEqual(router.link('foo', { foo: 'qux', fooQuery: 'quxQuery' }), 'foo/qux?fooQuery=quxQuery');
		assert.strictEqual(
			router.link('bar', { foo: 'qux', bar: 'baz', fooQuery: 'quxQuery', barQuery: 'bazQuery' }),
			'foo/qux/bar/baz?fooQuery=quxQuery&barQuery=bazQuery'
		);
	});

	it('Cannot generate link for an unknown outlet', () => {
		const router = new Router(routeConfigDefaultRoute, { HistoryManager });
		const link = router.link('unknown');
		assert.isUndefined(link);
	});

	it('The router will not start automatically if autostart is set to false', () => {
		let initialNavEvent = false;
		let historyManagerCount = 0;
		class TestHistoryManager extends HistoryManager {
			constructor(args: any) {
				super(args);
				historyManagerCount++;
			}
		}
		const router = new Router(routeConfigDefaultRoute, { HistoryManager: TestHistoryManager, autostart: false });
		let navCount = 0;
		router.on('nav', (event) => {
			navCount++;
			if (navCount > 1) {
				assert.strictEqual(event.type, 'nav');
				assert.strictEqual(event.outlet, 'foo');
				assert.deepEqual(event.context!.queryParams, {});
				assert.deepEqual(event.context!.params, { bar: 'defaultBar' });
				assert.deepEqual(event.context!.type, 'index');
				assert.isTrue(event.context!.isExact());
				assert.isFalse(event.context!.isError());
				initialNavEvent = true;
			}
		});
		router.start();
		assert.strictEqual(historyManagerCount, 1);
		assert.isTrue(initialNavEvent);
	});
});
