const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import * as sinon from 'sinon';

import global from '../../../src/shim/global';
import { Router } from '../../../src/routing/Router';
import { MemoryHistory as HistoryManager } from '../../../src/routing/history/MemoryHistory';

const routeConfig = [
	{
		path: '/',
		outlet: 'home',
		id: 'home'
	},
	{
		path: '/foo',
		outlet: 'foo',
		id: 'foo',
		children: [
			{
				path: '/bar',
				outlet: 'bar',
				id: 'bar'
			},
			{
				path: '/{baz}/baz',
				outlet: 'baz',
				id: 'baz',
				children: [
					{
						path: '/{qux}/qux',
						outlet: 'qux',
						id: 'qux'
					}
				]
			}
		]
	},
	{
		path: '/bar/*',
		outlet: 'bar',
		id: 'bar'
	}
];

const routeConfigNoRoot = [
	{
		path: '/foo',
		outlet: 'foo',
		id: 'foo'
	}
];

const routeConfigDefaultRoute = [
	{
		path: '/foo/{bar}',
		outlet: 'main',
		id: 'foo',
		defaultRoute: true,
		defaultParams: {
			bar: 'defaultBar'
		},
		children: [
			{
				path: 'bar/{foo}',
				outlet: 'main',
				id: 'bar',
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
		outlet: 'main',
		id: 'foo',
		defaultRoute: true
	}
];

const routeWithChildrenAndMultipleParams = [
	{
		path: '/foo/{foo}',
		outlet: 'foo',
		id: 'foo',
		children: [
			{
				path: '/bar/{bar}',
				outlet: 'bar',
				id: 'bar',
				children: [
					{
						path: '/baz/{baz}',
						outlet: 'baz',
						id: 'baz'
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
		id: 'foo',
		defaultParams: {
			foo: 'foo',
			fooQuery: 'fooQuery'
		},
		children: [
			{
				path: '/bar/{bar}?{barQuery}',
				outlet: 'bar',
				id: 'bar',
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
		id: 'partial',
		children: [
			{
				path: 'bar/{bar}',
				outlet: 'bar-with-param',
				id: 'bar-with-param'
			},
			{
				path: 'bar/bar',
				outlet: 'bar',
				id: 'bar'
			}
		]
	},
	{
		path: 'foo',
		id: 'foo',
		outlet: 'foo'
	},
	{
		path: '/',
		outlet: 'home',
		id: 'home'
	}
];

const config = [
	{
		path: 'foo',
		outlet: 'foo-one',
		id: 'foo-one'
	},
	{
		path: 'foo',
		outlet: 'foo-two',
		id: 'foo-two',
		children: [
			{
				path: 'baz',
				outlet: 'baz',
				id: 'baz'
			}
		]
	},
	{
		path: '{bar}',
		outlet: 'param',
		id: 'param'
	},
	{
		path: 'bar',
		outlet: 'bar',
		id: 'bar'
	}
];

describe('Router', () => {
	it('Navigates to current path if matches against a registered route', () => {
		const router = new Router(routeConfig, { HistoryManager });
		const context = router.getRoute('home');
		assert.isOk(context);
	});

	it('Navigates to default route if current path does not matches against a registered route', () => {
		const router = new Router(routeConfigDefaultRoute, { HistoryManager });
		const context = router.getRoute('foo');
		assert.isOk(context);
	});

	it('should match against the most exact route specified in the configuration based on the routes score', () => {
		const router = new Router(config, { HistoryManager });
		router.setPath('/bar');
		assert.isOk(router.getRoute('bar'));
		assert.isUndefined(router.getRoute('param'));
		router.setPath('/foo/baz');
		assert.isOk(router.getRoute('baz'));
		assert.isOk(router.getRoute('foo-two'));
		assert.isUndefined(router.getRoute('foo-one'));
	});

	it('Navigates to global "errorRoute" if current route does not match a registered route and no default route is configured', () => {
		const router = new Router(routeConfigNoRoot, { HistoryManager });
		const context = router.getRoute('errorRoute');
		assert.isOk(context);
		assert.deepEqual(context!.params, {});
		assert.deepEqual(context!.queryParams, {});
		assert.strictEqual(context!.type, 'error');
		assert.strictEqual(context!.isError(), true);
		assert.strictEqual(context!.isExact(), false);
	});

	it('Should navigates to global "errorRoute" if default route requires params but none have been provided', () => {
		const router = new Router(routeConfigDefaultRouteNoDefaultParams, { HistoryManager });
		const fooContext = router.getRoute('foo');
		assert.isNotOk(fooContext);
		const errorContext = router.getRoute('errorRoute');
		assert.isOk(errorContext);
		assert.deepEqual(errorContext!.params, {});
		assert.deepEqual(errorContext!.queryParams, {});
		assert.strictEqual(errorContext!.type, 'error');
		assert.strictEqual(errorContext!.isError(), true);
		assert.strictEqual(errorContext!.isExact(), false);
	});

	it('Should register as an index match for an route that index matches the route', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo');
		const context = router.getRoute('foo');
		assert.isOk(context);
		assert.deepEqual(context!.params, {});
		assert.deepEqual(context!.queryParams, {});
		assert.strictEqual(context!.type, 'index');
		assert.strictEqual(context!.isExact(), true);
	});

	it('should find the most specific match from the routing configuration', () => {
		const router = new Router(orderIndependentRouteConfig, { HistoryManager });
		router.setPath('/foo');
		const fooContext = router.getRoute('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'index');
		assert.strictEqual(fooContext!.isExact(), true);
		router.setPath('/foo/bar/bar');
		const barContext = router.getRoute('bar');
		assert.isOk(barContext);
		assert.deepEqual(barContext!.params, { foo: 'foo' });
		assert.deepEqual(barContext!.queryParams, {});
		assert.deepEqual(barContext!.type, 'index');
		assert.strictEqual(barContext!.isExact(), true);
		const partialContext = router.getRoute('partial');
		assert.isOk(partialContext);
		assert.deepEqual(partialContext!.params, { foo: 'foo' });
		assert.deepEqual(partialContext!.queryParams, {});
		assert.deepEqual(partialContext!.type, 'partial');
		assert.strictEqual(partialContext!.isExact(), false);
	});

	it('Should register as a partial match for a route that matches a section of the path', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/bar');
		const fooContext = router.getRoute('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		const barContext = router.getRoute('bar');
		assert.isOk(barContext);
		assert.deepEqual(barContext!.params, {});
		assert.deepEqual(barContext!.queryParams, {});
		assert.deepEqual(barContext!.type, 'index');
		assert.strictEqual(barContext!.isExact(), true);
	});

	it('Should register as a error match for an route that matches a section of the path with no further matching registered routes', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/unknown');
		const fooContext = router.getRoute('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'error');
		assert.strictEqual(fooContext!.isError(), true);
		const barContext = router.getRoute('bar');
		assert.isNotOk(barContext);
	});

	it('Matches against routes with params', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/baz/baz');
		const fooContext = router.getRoute('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		assert.strictEqual(fooContext!.isError(), false);
		const context = router.getRoute('baz');
		assert.isOk(context);
		assert.deepEqual(context!.params, { baz: 'baz' });
		assert.deepEqual(context!.queryParams, {});
		assert.deepEqual(context!.type, 'index');
		assert.strictEqual(context!.isExact(), true);
		assert.strictEqual(context!.isError(), false);
	});

	it('Should return params from all matching routes', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/baz/baz/qux/qux?hello=world');
		const fooContext = router.getRoute('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, { hello: 'world' });
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		assert.strictEqual(fooContext!.isError(), false);
		const bazContext = router.getRoute('baz');
		assert.isOk(bazContext);
		assert.deepEqual(bazContext!.params, { baz: 'baz' });
		assert.deepEqual(bazContext!.queryParams, { hello: 'world' });
		assert.deepEqual(bazContext!.type, 'partial');
		assert.strictEqual(bazContext!.isExact(), false);
		assert.strictEqual(bazContext!.isError(), false);
		const quxContext = router.getRoute('qux');
		assert.isOk(quxContext);
		assert.deepEqual(quxContext!.params, { baz: 'baz', qux: 'qux' });
		assert.deepEqual(quxContext!.queryParams, { hello: 'world' });
		assert.deepEqual(quxContext!.type, 'index');
		assert.strictEqual(quxContext!.isExact(), true);
		assert.strictEqual(quxContext!.isError(), false);
	});

	it('Should pass query params to all matched routes', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/bar?query=true');
		const fooContext = router.getRoute('foo');
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, { query: 'true' });
		assert.deepEqual(fooContext!.type, 'partial');
		assert.strictEqual(fooContext!.isExact(), false);
		assert.strictEqual(fooContext!.isError(), false);
		const barContext = router.getRoute('bar');
		assert.deepEqual(barContext!.params, {});
		assert.deepEqual(barContext!.queryParams, { query: 'true' });
		assert.deepEqual(barContext!.type, 'index');
		assert.strictEqual(barContext!.isExact(), true);
		assert.strictEqual(barContext!.isError(), false);
	});

	it('Should pass params and query params to all matched routes', () => {
		const config = [
			{
				path: 'view/{view}?{filter}',
				outlet: 'foo',
				id: 'foo'
			}
		];
		const router = new Router(config, { HistoryManager });
		router.setPath('/view/bar?filter=true');
		const fooContext = router.getRoute('foo');
		assert.deepEqual(fooContext!.params, { view: 'bar' });
		assert.deepEqual(fooContext!.queryParams, { filter: 'true' });
		assert.deepEqual(fooContext!.type, 'index');
		assert.strictEqual(fooContext!.isExact(), true);
		assert.strictEqual(fooContext!.isError(), false);
	});

	it('should emit route event when a route is entered and exited', () => {
		const router = new Router(routeConfig, { HistoryManager });
		let handle = router.on('route', () => {});
		handle.destroy();
		handle = router.on('route', ({ route, action }) => {
			if (action === 'exit') {
				assert.strictEqual(route.id, 'home');
			} else {
				assert.strictEqual(route.id, 'foo');
			}
		});
		router.setPath('/foo');
		handle.destroy();
		handle = router.on('route', ({ route, action }) => {
			assert.strictEqual(route.id, 'bar');
			assert.strictEqual(action, 'enter');
		});
		router.setPath('/foo/bar');
	});

	it('should reset scroll when emitting if resetScroll is true', () => {
		const window: any = { scroll: sinon.stub() };
		new Router(routeConfig, { HistoryManager, resetScroll: true, window });
		assert.isTrue(window.scroll.calledOnce);
		assert.deepEqual(window.scroll.args, [[0, 0]]);
	});

	it('should emit route event when a routes param changes', () => {
		const router = new Router(routeConfig, { HistoryManager });
		let handle = router.on('route', () => {});
		handle.destroy();
		handle = router.on('route', ({ route, action }) => {
			if (action === 'exit') {
				assert.strictEqual(route.id, 'home');
			} else {
				assert.strictEqual(route.id, 'foo');
			}
		});
		router.setPath('/foo');
		handle.destroy();
		handle = router.on('route', ({ route, action }) => {
			assert.strictEqual(route.id, 'baz');
			assert.strictEqual(action, 'enter');
		});
		router.setPath('/foo/baz/baz');
		handle.destroy();
		handle = router.on('route', ({ route, action }) => {
			if (action === 'exit') {
				assert.strictEqual(route.id, 'baz');
				assert.deepEqual(route.params, { baz: 'baz' });
			} else {
				assert.strictEqual(route.id, 'baz');
				assert.deepEqual(route.params, { baz: 'baaz' });
			}
		});
		router.setPath('/foo/baaz/baz');
	});

	it('should emit route event when wildcard paths change', () => {
		const router = new Router(routeConfig, { HistoryManager });
		let handle = router.on('route', () => {});
		handle.destroy();
		handle = router.on('route', ({ route, action }) => {
			if (action === 'exit') {
				assert.strictEqual(route.id, 'home');
			} else {
				assert.strictEqual(route.id, 'bar');
			}
		});
		router.setPath('/bar/baz');
		handle.destroy();
		let count = 0;
		handle = router.on('route', ({ route, action }) => {
			if (!count) {
				assert.strictEqual(action, 'enter');
				assert.deepEqual(route.wildcardSegments, ['baz', 'buzz']);
			} else {
				assert.strictEqual(action, 'exit');
				assert.deepEqual(route.wildcardSegments, ['baz']);
			}
			assert.strictEqual(route.id, 'bar');
			count++;
		});
		router.setPath('/bar/baz/buzz');
		handle.destroy();
		assert.strictEqual(count, 2);
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

	it('should return the current, most exact route context', () => {
		const router = new Router(routeConfig, { HistoryManager });
		router.setPath('/foo/');
		const routerContext = router.getMatchedRoute();
		assert.isOk(routerContext);
		assert.strictEqual(routerContext!.id, 'foo');
		assert.strictEqual(routerContext!.outlet, 'foo');
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
					id: 'foo',
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

	it('Cannot generate link for an unknown route', () => {
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

	describe('Document Title', () => {
		it('should set the title as defined in the routing config', () => {
			const router = new Router([{ id: 'foo', outlet: 'foo', path: 'foo/{id}?{query}', title: 'foo' }], {
				HistoryManager
			});
			router.setPath('/foo/id-value?query=queryValue');
			assert.strictEqual(global.document.title, 'foo');
		});

		it('should set the title as using the set document title callback', () => {
			const router = new Router([{ id: 'foo', outlet: 'foo', path: 'foo/{id}?{query}', title: 'static-foo' }], {
				HistoryManager,
				setDocumentTitle({ title, params, queryParams, id }) {
					return `${title}-${id}-${params.id}-${queryParams.query}`;
				}
			});
			router.setPath('/foo/id-value?query=queryValue');
			assert.strictEqual(global.document.title, 'static-foo-foo-id-value-queryValue');
		});
	});

	describe('outlets', () => {
		it('should match against all routes for an outlet', () => {
			const router = new Router(
				[
					{
						path: 'foo',
						id: 'foo',
						outlet: 'main',
						children: [
							{
								path: 'bar',
								id: 'bar',
								outlet: 'main'
							},
							{
								path: 'qux',
								id: 'qux',
								outlet: 'other'
							}
						]
					}
				],
				{ HistoryManager }
			);
			router.setPath('foo/bar');
			const contextMap = router.getOutlet('main');
			assert.isOk(contextMap);
			assert.strictEqual(contextMap!.size, 2);
		});
	});

	describe('redirect', () => {
		it('should redirect from a default route', () => {
			const router = new Router(
				[
					{
						path: '/',
						id: 'foo',
						outlet: 'main',
						redirect: '/foo/bar',
						defaultRoute: true
					},
					{
						path: 'foo/bar',
						id: 'bar',
						outlet: 'bar'
					}
				],
				{ HistoryManager }
			);
			const contextMap = router.getOutlet('bar');
			assert.isOk(contextMap);
			assert.strictEqual(contextMap!.size, 1);
		});

		it('should redirect to path on matched route', () => {
			const router = new Router(
				[
					{
						path: 'foo/{param}',
						id: 'foo',
						outlet: 'main',
						redirect: 'foo/{param}/bar',
						defaultParams: {
							param: 'default-param'
						},
						defaultRoute: true,
						children: [
							{
								path: 'bar',
								id: 'bar',
								outlet: 'bar'
							}
						]
					}
				],
				{ HistoryManager }
			);
			const contextMap = router.getOutlet('bar');
			assert.isOk(contextMap);
			assert.strictEqual(contextMap!.size, 1);
		});
	});
});
