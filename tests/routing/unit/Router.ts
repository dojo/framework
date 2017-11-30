import Task from '@dojo/core/async/Task';
const { beforeEach, suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');
import { spy, stub } from 'sinon';
import MemoryHistory from '../../src/history/MemoryHistory';

import {
	Context,
	DefaultParameters,
	ErrorEvent,
	MatchType,
	NavigationStartEvent,
	Parameters,
	Request
} from '../../src/interfaces';

import Route from '../../src/Route';
import Router from '../../src/Router';

suite('Router', () => {
	test('dispatch() resolves to unsuccessful result if no route was executed', () => {
		return new Router().dispatch({} as Context, '/').then(result => {
			assert.deepEqual(result, { success: false });
		});
	});

	test('dispatch() resolves to successful result if a route was executed', () => {
		const router = new Router();
		router.append(new Route());
		return router.dispatch({} as Context, '/').then(result => {
			assert.deepEqual(result, { success: true });
		});
	});

	test('dispatch() rejects when errors occur', () => {
		const err = {};
		const router = new Router();
		router.append(new Route({
			exec () {
				throw err;
			}
		}));
		return router.dispatch({} as Context, '/').then(() => {
			assert.fail('Should not be called');
		}, actual => {
			assert.strictEqual(actual, err);
		});
	});

	test('dispatch() returns redirect', () => {
		const router = new Router();
		router.append(new Route({
			path: '/foo',
			guard() { return '/bar'; }
		}));

		return router.dispatch({} as Context, '/foo').then((result) => {
			assert.deepEqual(result, { redirect: '/bar', success: true });
		});
	});

	test('dispatch() may return empty redirect', () => {
		const router = new Router();
		router.append(new Route({
			path: '/foo',
			guard() { return ''; }
		}));

		return router.dispatch({} as Context, '/foo').then((result) => {
			assert.deepEqual(result, { redirect: '', success: true });
		});
	});

	test('dispatch() stops selecting routes once it has a redirect', () => {
		const router = new Router();
		router.append(new Route({
			path: '/foo',
			guard() { return '/bar'; }
		}));

		let executed = false;
		router.append(new Route({
			path: '/foo',
			exec() { executed = true; }
		}));

		return router.dispatch({} as Context, '/foo').then((result) => {
			assert.deepEqual(result, { redirect: '/bar', success: true });
			assert.isFalse(executed);
		});
	});

	test('dispatch() executes selected routes, providing context and extracted parameters', () => {
		const execs: { context: Context, params: Parameters }[] = [];

		const context = {} as Context;
		const router = new Router();
		const root = new Route({
			path: '/{foo}',
			exec ({ context, params }) {
				execs.push({ context, params });
			}
		});
		const deep = new Route({
			path: '/{bar}',
			exec ({ context, params }) {
				execs.push({ context, params });
			}
		});
		router.append(root);
		root.append(deep);

		return router.dispatch(context, '/root/deep').then(() => {
			assert.lengthOf(execs, 2);
			assert.strictEqual(execs[0].context, context);
			assert.strictEqual(execs[1].context, context);
			assert.deepEqual(execs[0].params, { foo: 'root' });
			assert.deepEqual(execs[1].params, { bar: 'deep' });
		});
	});

	test('dispatch() calls index() on the final selected route, providing context and extracted parameters', () => {
		const calls: { method: string, context: Context, params: Parameters }[] = [];

		const context = {} as Context;
		const router = new Router();
		const root = new Route({
			path: '/{foo}',
			exec ({ context, params }) {
				calls.push({ method: 'exec', context, params });
			}
		});
		const deep = new Route({
			path: '/{bar}',
			exec ({ context, params }) {
				calls.push({ method: 'exec', context, params });
			},
			index ({ context, params }) {
				calls.push({ method: 'index', context, params });
			}
		});
		router.append(root);
		root.append(deep);

		return router.dispatch(context, '/root/deep').then(() => {
			assert.lengthOf(calls, 2);
			assert.strictEqual(calls[0].method, 'exec');
			assert.strictEqual(calls[1].method, 'index');
			assert.strictEqual(calls[0].context, context);
			assert.strictEqual(calls[1].context, context);
			assert.deepEqual(calls[0].params, { foo: 'root' });
			assert.deepEqual(calls[1].params, { bar: 'deep' });
		});
	});

	test('dispatch() calls fallback() on the deepest matching route, providing context and extracted parameters', () => {
		const calls: { method: string, context: Context, params: Parameters }[] = [];

		const context = {} as Context;
		const router = new Router();
		const root = new Route({
			path: '/{foo}',
			exec ({ context, params }) {
				calls.push({ method: 'exec', context, params });
			},
			fallback ({ context, params }) {
				calls.push({ method: 'fallback', context, params });
			}
		});
		router.append(root);

		return router.dispatch(context, '/root/deep').then(() => {
			assert.lengthOf(calls, 1);
			assert.strictEqual(calls[0].method, 'fallback');
			assert.strictEqual(calls[0].context, context);
			assert.deepEqual(calls[0].params, { foo: 'root' });
		});
	});

	test('dispatch() selects routes in order of registration', () => {
		const order: string[] = [];

		const router = new Router();
		router.append(new Route({
			path: '/foo',
			guard () {
				order.push('first');
				return false;
			}
		}));
		router.append(new Route({
			path: '/foo',
			exec () {
				order.push('second');
			}
		}));

		return router.dispatch({} as Context, '/foo').then(() => {
			assert.deepEqual(order, ['first', 'second']);
		});
	});

	test('dispatch() emits navstart event', () => {
		const router = new Router<any>();

		let received: NavigationStartEvent = null!;
		router.on('navstart', event => {
			received = event;
		});

		router.dispatch({} as Context, '/foo');
		assert.equal(received.path, '/foo');
		assert.strictEqual(received.target, router);
	});

	test('navstart listeners can synchronously cancel routing before dispatch', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo' }));
		router.on('navstart', event => {
			event.cancel && event.cancel();
		});

		return router.dispatch({} as Context, '/foo').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isFalse(success);
		});
	});

	test('navstart listeners can synchronously cancel routing after dispatch', () => {
		let cancel: Function | undefined = undefined;
		const router = new Router();
		router.append(new Route({ path: '/foo' }));
		router.on('navstart', event => {
			if (event.cancel) {
				cancel = event.cancel;
			}
		});

		const promise = router.dispatch({} as Context, '/foo');
		cancel && cancel();

		return promise.then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isFalse(success);
		});
	});

	test('navstart listeners can asynchronously cancel routing', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo' }));
		router.on('navstart', event => {
			if (event.defer) {
				const { cancel } = event.defer();
				Promise.resolve().then(cancel);
			}
		});

		return router.dispatch({} as Context, '/foo').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isFalse(success);
		});
	});

	test('navstart listeners can asynchronously resume routing', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo' }));
		router.on('navstart', event => {
			if (event.defer) {
				const { resume } = event.defer();
				Promise.resolve().then(resume);
			}
		});

		return router.dispatch({} as Context, '/foo').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isTrue(success);
		});
	});

	test('all deferring navstart listeners must resume before routing continues', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo' }));

		const resumers: {(): void}[] = [];
		router.on('navstart', event => {
			if (event.defer) {
				const { resume } = event.defer();
				resumers.push(resume);
			}
		});
		router.on('navstart', event => {
			if (event.defer) {
				const { resume } = event.defer();
				resumers.push(resume);
			}
		});

		let dispatched: boolean | undefined = false;
		router.dispatch({} as Context, '/foo').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			dispatched = success;
		});

		const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

		return Promise.resolve().then(() => {
			assert.isFalse(dispatched);
			(<any> resumers.shift())();
			return delay(10);
		}).then(() => {
			assert.isFalse(dispatched);
			(<any> resumers.shift())();
			return delay(10);
		}).then(() => {
			assert.isTrue(dispatched);
		});
	});

	test('dispatch() can be canceled', () => {
		const router = new Router();

		let executed = false;
		router.append(new Route({
			path: '/foo',
			exec () { executed = true; }
		}));

		router.on('navstart', event => {
			const task = new Router().dispatch({} as Context, '/foo');
			task.cancel();
			if (event.defer) {
				event.defer().resume();
			}
		});

		return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
			assert.isFalse(executed);
		});
	});

	test('register routing configuration', () => {
		const config = [
			{
				path: 'foo',
				outlet: 'another-name',
				children: [
					{
						path: 'bar',
						children: [
							{
								path: 'qux'
							}
						]
					}
				]

			}
		];

		const router = new Router({ config });
		return router.dispatch({}, '/foo/bar/qux').then((dispatchResult) => {
			assert.isTrue(dispatchResult.success);
			assert.isTrue(router.hasOutlet('another-name'));
			assert.isTrue(router.hasOutlet('bar'));
			assert.isTrue(router.hasOutlet('qux'));
		});
	});

	test('register routing configuration from a starting outlet', () => {
		const config = [
			{
				path: 'foo',
				outlet: 'another-name',
				children: [
					{
						path: 'bar',
						children: [
							{
								path: 'qux'
							}
						]
					}
				]

			}
		];

		const router = new Router({ config });

		router.register([{ path: 'baz' }], 'qux');
		return router.dispatch({}, '/foo/bar/qux/baz').then((dispatchResult) => {
			assert.isTrue(dispatchResult.success);
			assert.isTrue(router.hasOutlet('another-name'));
			assert.isTrue(router.hasOutlet('bar'));
			assert.isTrue(router.hasOutlet('qux'));
			assert.isTrue(router.hasOutlet('baz'));
		});
	});

	test('register routing configuration from a starting an unknown outlet appends to the router', () => {
		const config = [
			{
				path: 'foo',
				outlet: 'another-name',
				children: [
					{
						path: 'bar',
						children: [
							{
								path: 'qux'
							}
						]
					}
				]

			}
		];

		const router = new Router({ config });

		router.register([{ path: 'baz' }], 'fake');
		return router.dispatch({}, '/baz').then((dispatchResult) => {
			assert.isTrue(dispatchResult.success);
			assert.isTrue(router.hasOutlet('baz'));
		});
	});

	test('router registers "errorOutlet" for unsuccessful dispatches', () => {
		const config = [
			{
				path: 'foo'
			}
		];

		const router = new Router({ config });

		return router.dispatch({}, '/foo/bar').then((dispatchResult) => {
			assert.isTrue(dispatchResult.success);
			assert.isTrue(router.hasOutlet('errorOutlet'));
			assert.isTrue(router.hasOutlet('foo'));

			const fooOutletContext = router.getOutlet('foo');
			assert.deepEqual(fooOutletContext, {
				location: 'foo',
				params: {},
				type: MatchType.ERROR
			});
		});
	});

	test('params are added to the outlet context', () => {
		const config = [
			{
				path: 'foo/{foo}',
				outlet: 'another-name',
				children: [
					{
						path: 'bar/{bar}',
						children: [
							{
								path: 'qux/{qux}'
							}
						]
					}
				]

			}
		];

		const router = new Router({ config });

		return router.dispatch({}, '/foo/foo/bar/bar/qux/qux').then((dispatchResult) => {
			assert.isTrue(dispatchResult.success);
			assert.isTrue(router.hasOutlet('another-name'));
			assert.isTrue(router.hasOutlet('bar/{bar}'));
			assert.isTrue(router.hasOutlet('qux/{qux}'));

			const fooOutletContext = router.getOutlet('another-name');
			const barOutletContext = router.getOutlet('bar/{bar}');
			const quxOutletContext = router.getOutlet('qux/{qux}');

			assert.deepEqual(fooOutletContext, {
				location: 'foo/foo',
				params: {
					foo: 'foo'
				},
				type: MatchType.PARTIAL
			});
			assert.deepEqual(barOutletContext, {
				location: 'foo/foo/bar/bar',
				params: {
					bar: 'bar'
				},
				type: MatchType.PARTIAL
			});
			assert.deepEqual(quxOutletContext, {
				location: 'foo/foo/bar/bar/qux/qux',
				params: {
					qux: 'qux'
				},
				type: MatchType.INDEX
			});
		});
	});

	test('query for multiple outlets', async () => {
		const config = [{
			path: '/path-1',
			outlet: 'outlet-id-1'
		}, {
			path: '/path-2',
			outlet: 'outlet-id-2',
			children: [{
				path: '/nested-path',
				outlet: 'outlet-id-3',
				children: [{
					path: '/nested-path',
					outlet: 'outlet-id-4',
					children: [{
						path: '/nested-path',
						outlet: 'outlet-id-5'
					}]
				}]
			}]
		}, {
			path: '/path-3',
			outlet: 'outlet-id-5'
		}];

		const router = new Router({ config });

		await router.dispatch({}, '/path-2');

		const noMatchResult = router.getOutlet(['no', 'outlet-id-1', '', ' ']);

		assert.equal(noMatchResult, undefined);

		const matchingResult = router.getOutlet(['true', 'outlet-id-2']);

		assert.deepEqual(matchingResult, {
			location: '/path-2',
			type: MatchType.INDEX,
			params: {}
		});

		const emptyInput = router.getOutlet([]);
		assert.equal(emptyInput, undefined);

		await router.dispatch({}, '/path-2/nested-path');

		const multipleMatchingOutlets = router.getOutlet(['outlet-id-2', 'outlet-id-3']);

		assert.deepEqual(multipleMatchingOutlets, {
			location: '/path-2/nested-path',
			type: MatchType.INDEX,
			params: {}
		});

		await router.dispatch({}, '/path-2/nested-path/nested-path');

		assert.deepEqual(router.getOutlet(['outlet-id-4']), {
			location: '/path-2/nested-path/nested-path',
			type: MatchType.INDEX,
			params: {}
		});

		assert.deepEqual(router.getOutlet(['outlet-id-4', 'outlet-id-2']), {
			location: '/path-2/nested-path/nested-path',
			type: MatchType.INDEX,
			params: {}
		});
	});

	test('parameters are combined with multiple matching outlets', async () => {
		const config = [{
			path: '/path',
			outlet: 'outlet-id-1',
			children: [{
				path: '/nested-path/{outlet-2-param}',
				outlet: 'outlet-id-2',
				children: [{
					path: '/nested-path/{outlet-3-param}',
					outlet: 'outlet-id-3',
					children: [{
						path: '/nested-path/{outlet-4-param}',
						outlet: 'outlet-id-4'
					}]
				}]
			}]
		}];

		const router = new Router({ config });

		await router.dispatch({}, '/path/nested-path/param-2/nested-path/param-3/nested-path/param-4');

		assert.deepEqual(router.getOutlet(['outlet-id-3', 'outlet-id-2', 'outlet-id-4']), {
			location: '/path/nested-path/param-2/nested-path/param-3/nested-path/param-4',
			type: MatchType.INDEX,
			params: {
				'outlet-2-param': 'param-2',
				'outlet-3-param': 'param-3',
				'outlet-4-param': 'param-4'
			}
		});
	});

	test('register() throws error if more than one default route is attempted to be registered', () => {
		const config = [
			{
				path: 'foo',
				defaultRoute: true
			},
			{
				path: 'bar',
				defaultRoute: true
			}
		];
		try {
			new Router({ config });
			assert.fail('Should throw an error if multiple default routes are configured.');
		}
		catch (err) {
			// do nothing expected error
		}
	});

	test('router can be created with a fallback route', () => {
		let received: Request<Context, Parameters>;

		const router = new Router({
			fallback (request) {
				received = request;
			}
		});

		const context = {} as Context;
		return router.dispatch(context, '/foo').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isFalse(success);
			assert.ok(received);
			assert.strictEqual(received.context, context);
			assert.deepEqual(received.params, {});
		});
	});

	test('can append several routes at once', () => {
		const order: string[] = [];

		const router = new Router();
		router.append([
			new Route({
				path: '/foo',
				guard () {
					order.push('first');
					return false;
				}
			}),
			new Route({
				path: '/foo',
				exec () {
					order.push('second');
				}
			})
		]);

		return router.dispatch({} as Context, '/foo').then(() => {
			assert.deepEqual(order, ['first', 'second']);
		});
	});

	test('routes can only be appended once', () => {
		const router = new Router();
		const foo = new Route({ path: '/foo' });
		const bar = new Route({ path: '/bar' });
		const baz = new Route({ path: '/baz' });

		router.append(foo);
		assert.throws(() => {
			router.append(foo);
		}, Error, 'Cannot append route that has already been appended');
		assert.throws(() => {
			router.append([ foo, bar ]);
		}, Error, 'Cannot append route that has already been appended');

		foo.append(bar);
		assert.throws(() => {
			router.append(bar);
		}, Error, 'Cannot append route that has already been appended');

		router.append(baz);
		assert.throws(() => {
			router.append(baz);
		}, Error, 'Cannot append route that has already been appended');
	});

	test('leading slashes are irrelevant', () => {
		const router = new Router();
		const root = new Route({ path: '/foo' });
		const deep = new Route({ path: 'bar' });
		const deeper = new Route({ path: 'baz' });
		root.append(deep);
		deep.append(deeper);
		router.append(root);

		return router.dispatch({} as Context, 'foo/bar/baz').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isTrue(success);
		});
	});

	test('if present in route, there must be a trailing slash when selecting', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = new Router();
			const root = new Route({ path: '/foo/' });
			const deep = new Route({ path: '/bar/' });
			const deeper = new Route({ path: '/baz/' });
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as Context, `foo/bar/baz${withSlash ? '/' : ''}`).then((dispatchResult) => {
				const { success } = dispatchResult || { success: false };
				assert.isTrue(success === withSlash, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('if not present in route, there must not be a trailing slash when selecting', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = new Router();
			const root = new Route({ path: '/foo/' });
			const deep = new Route({ path: '/bar/' });
			const deeper = new Route({ path: '/baz' });
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as Context, `foo/bar/baz${withSlash ? '/' : ''}`).then((dispatchResult) => {
				const { success } = dispatchResult || { success: false };
				assert.isTrue(success !== withSlash, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('routes can be configured to ignore trailing slash discrepancies', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = new Router();
			const root = new Route({ path: '/foo/' });
			const deep = new Route({ path: '/bar/' });
			const deeper = new Route({
				path: `/baz${withSlash ? '' : '/'}`,
				trailingSlashMustMatch: false
			});
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as Context, `foo/bar/baz${withSlash ? '/' : ''}`).then((dispatchResult) => {
				const { success } = dispatchResult || { success: false };
				assert.isTrue(success, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('search components are ignored', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo' }));

		return router.dispatch({} as Context, '/foo?bar').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isTrue(success);
		});
	});

	test('hash components are ignored', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo' }));

		return router.dispatch({} as Context, '/foo#bar').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isTrue(success);
		});
	});

	test('query & hash components are ignored', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo' }));

		return router.dispatch({} as Context, '/foo?bar#baz').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isTrue(success, '/foo?bar#baz');

			return router.dispatch({} as Context, '/foo#bar?baz');
		}).then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isTrue(success);
		});
	});

	test('repeated slashes have no effect', () => {
		const router = new Router();
		router.append(new Route({ path: '/foo/bar' }));

		return router.dispatch({} as Context, '//foo///bar').then((dispatchResult) => {
			const { success } = dispatchResult || { success: false };
			assert.isTrue(success);
		});
	});

	test('query parameters are extracted', () => {
		const router = new Router();

		let extracted: DefaultParameters = {};
		router.append(new Route({
			path: '/foo?{bar}&{baz}',
			exec ({ params }) {
				extracted = <DefaultParameters> params;
			}
		}));

		return router.dispatch({} as Context, '/foo?bar=1&baz=2').then(() => {
			assert.deepEqual(extracted, {bar: '1', baz: '2'});

			extracted = {};
			return router.dispatch({} as Context, '/foo?bar=3#baz=4');
		}).then(() => {
			assert.deepEqual(extracted, {bar: '3'});

			extracted = {};
			return router.dispatch({} as Context, '/foo#bar=5?baz=6');
		}).then(() => {
			assert.deepEqual(extracted, {});
		});
	});

	test('replacePath() throws if the router was created without a history manager', () => {
		const router = new Router();
		assert.throws(() => {
			router.replacePath('/foo');
		}, Error, 'Cannot replace path, router was created without a history manager');
	});

	test('replacePath() sets the path on the history manager', () => {
		const history = new MemoryHistory();
		const replace = spy(history, 'replace');
		const router = new Router({ history });
		router.replacePath('/foo');
		assert.isTrue(replace.calledOnce);
		assert.deepEqual(replace.firstCall.args, [ '/foo' ]);
	});

	test('setPath() throws if the router was created without a history manager', () => {
		const router = new Router();
		assert.throws(() => {
			router.setPath('/foo');
		}, Error, 'Cannot set path, router was created without a history manager');
	});

	test('setPath() sets the path on the history manager', () => {
		const history = new MemoryHistory();
		const set = spy(history, 'set');
		const router = new Router({ history });
		router.setPath('/foo');
		assert.isTrue(set.calledOnce);
		assert.deepEqual(set.firstCall.args, [ '/foo' ]);
	});

	test('start() is a noop if the router was created without a history manager', () => {
		assert.doesNotThrow(() => {
			const listener = new Router().start();
			listener.pause();
			listener.resume();
			listener.destroy();
		});
	});

	test('start() wires dispatch to a history change event', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start({ dispatchCurrent: false });
		history.set('/foo');
		assert.isTrue(dispatch.calledWith({}, '/foo'));
	});

	test('start() returns a pausable handler', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		const listener = router.start({ dispatchCurrent: false });
		listener.pause();
		history.set('/foo');
		assert.isFalse(dispatch.called);

		listener.resume();
		history.set('/bar');
		assert.isTrue(dispatch.calledWith({}, '/bar'));
	});

	test('start() can immediately dispatch for the current history value', () => {
		const history = new MemoryHistory({ path: '/foo' });
		const router = new Router({ history });

		router.on('navstart', (event) => {
			assert.strictEqual(event.path, '/foo');
		});
		router.start({ dispatchCurrent: true });
	});

	test('start() falls back to default route if dispatching current route is not successful', () => {
		const history = new MemoryHistory({ path: '/foo' });
		const config = [
			{
				path: 'bar',
				defaultRoute: true
			}
		];
		const router = new Router({ history, config });
		const dispatchedPaths: string[] = [];

		router.on('navstart', (event) => {
			dispatchedPaths.push(event.path);
		});

		router.start({ dispatchCurrent: true });
		assert.deepEqual(dispatchedPaths, [ '/foo', 'bar' ]);
	});

	test('start() can be configured not to immediately dispatch for the current history value', () => {
		const history = new MemoryHistory({ path: '/foo' });
		const router = new Router({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start({ dispatchCurrent: false });
		assert.isTrue(dispatch.notCalled);
	});

	test('start() dispatches immediately by default', () => {
		const history = new MemoryHistory({ path: '/foo' });
		const router = new Router({ history });

		router.on('navstart', (event) => {
			assert.strictEqual(event.path, '/foo');
		});

		router.start();
	});

	test('start() throws if already called', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });

		function start() {
			router.start();
		}

		start();

		assert.throws(start, /start can only be called once/);
	});

	test('start() replaces history if the dispatch requested a redirect', () => {
		const history = new MemoryHistory({ path: '/foo' });
		const router = new Router({ history });

		const execs: string[] = [];
		router.append([
			new Route({
				path: '/foo',
				guard() { return '/bar'; }
			}),
			new Route({
				path: '/bar',
				exec() { execs.push('/bar'); }
			}),
			new Route({
				path: '/baz',
				guard() { return ''; }
			}),
			new Route({
				path: '/',
				exec() { execs.push('/'); }
			})
		]);

		const paths: string[] = [];
		router.on('navstart', ({ path }) => { paths.push(path); });

		router.start();
		return new Promise((resolve) => setTimeout(resolve, 50))
			.then(() => {
				assert.strictEqual(history.current, '/bar');
				assert.deepEqual(paths, [ '/foo', '/bar' ]);
				assert.deepEqual(execs, [ '/bar' ]);

				history.set('/baz');
				return new Promise((resolve) => setTimeout(resolve, 50));
			})
			.then(() => {
				assert.strictEqual(history.current, '');
				assert.deepEqual(paths, [ '/foo', '/bar', '/baz', '' ]);
				assert.deepEqual(execs, [ '/bar', '/' ]);
			});
	});

	test('start() handles up to 20 redirects', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });

		let count = 0;
		let ok: () => void;
		router.append([
			new Route({
				path: '/to',
				guard() {
					count++;
					return count === 20 || '/and/fro';
				},
				exec() {
					ok();
				}
			}),
			new Route({
				path: '/and/fro',
				guard() {
					count++;
					return count === 20 || '/to';
				},
				exec() {
					ok();
				}
			})
		]);

		router.start({ dispatchCurrent: false });
		return new Promise((resolve) => {
			ok = resolve;
			history.set('/to');
		}).then(() => {
			assert.equal(count, 20);
			count = 0;
			return new Promise((resolve) => {
				ok = resolve;
				history.set(history.current === '/to' ? '/and/fro' : '/to');
			});
		}).then(() => {
			assert.equal(count, 20);
		});
	});

	test('without a provided context, start() dispatches with an empty object as the context', () => {
		const history = new MemoryHistory({ path: '/foo' });
		const router = new Router({ history });
		const contexts: Context[] = [];

		router.on('navstart', (event) => {
			contexts.push(event.context);
		});
		router.start();

		assert.deepEqual(contexts[0], {});
		history.set('/bar');

		assert.notStrictEqual(contexts[0], contexts[1]);
		assert.deepEqual(contexts[1], {});
	});

	test('with a provided context, start() dispatches with that object as the context', () => {
		const context = {};
		const history = new MemoryHistory({ path: '/foo' });
		const router = new Router({ context, history });
		const contexts: Context[] = [];

		router.on('navstart', (event) => {
			contexts.push(event.context);
		});
		router.start();

		assert.strictEqual(contexts[0], context);
		history.set('/bar');
		assert.strictEqual(contexts[1], context);
	});

	test('with a provided context factory, start() dispatches with factory\'s value as the context', () => {
		const expectedContexts = [ { first: true }, { second: true } ];
		const context = () => expectedContexts.shift();
		const history = new MemoryHistory({ path: '/foo' });
		const router = new Router({ context, history });
		const contexts: Context[] = [];

		router.on('navstart', (event) => {
			contexts.push(event.context);
		});

		router.start();
		assert.deepEqual(contexts[0], { first: true });
		history.set('/bar');
		assert.deepEqual(contexts[1], { second: true });
	});

	test('link() throws if route has not been appended', () => {
		const router = new Router();
		assert.throws(() => {
			router.link(new Route({ path: '/' }));
		}, Error, 'Cannot generate link for route that is not in the hierarchy');
		assert.throws(() => {
			const foo = new Route({ path: '/foo' });
			const bar = new Route({ path: '/bar' });
			foo.append(bar);
			router.link(bar);
		}, Error, 'Cannot generate link for route that is not in the hierarchy');
		assert.throws(() => {
			const foo = new Route({ path: '/foo' });
			new Router().append(foo);
			router.link(foo);
		}, Error, 'Cannot generate link for route that is not in the hierarchy');
	});

	test('link() combines paths of route hierarchy (no parameters)', () => {
		const router = new Router();
		const routes = [ 'foo/', '/bar', 'baz/' ].map(path => new Route({ path }));
		routes.reduce<{ append(route: Route<Context, Parameters>): void }>((parent, route) => {
				parent.append(route);
				return route;
			}, router);

		assert.equal(router.link(routes[2]), 'foo/bar/baz/');
		assert.equal(router.link(routes[1]), 'foo/bar');
	});

	test('link() returns a prefixed path if history was provided', () => {
		const history = new MemoryHistory();
		history.prefix = (path) => `/prefixed/${path}`;
		const router = new Router({ history });
		const route = new Route({ path: 'foo' });
		router.append(route);

		assert.equal(router.link(route), '/prefixed/foo');
	});

	test('link() throws if parameters are missing', () => {
		const router = new Router();
		const route = new Route({ path: '/{foo}?{bar}' });
		router.append(route);

		assert.throws(() => {
			router.link(route);
		}, Error, 'Cannot generate link, missing parameter \'foo\'');
		assert.throws(() => {
			router.link(route, { foo: 'foo' });
		}, Error, 'Cannot generate link, missing search parameter \'bar\'');
	});

	test('link() throws if more than one value is provided for a path parameter', () => {
		const router = new Router();
		const route = new Route({ path: '/{foo}' });
		router.append(route);

		assert.equal(router.link(route, { foo: [ 'foo' ] }), '/foo');
		assert.throws(() => {
			router.link(route, { foo: [ 'foo', 'bar' ] });
		}, Error, 'Cannot generate link, multiple values for parameter \'foo\'');
	});

	test('link() fills in parameters', () => {
		const router = new Router();
		const routes = [ '{foo}', '{foo}?{bar}', 'end?{bar}&{baz}&{foo}' ].map(path => new Route({ path }));
		routes.reduce<{ append(route: Route<Context, Parameters>): void }>((parent, route) => {
				parent.append(route);
				return route;
			}, router);

		assert.equal(router.link(routes[2], {
			foo: 'foo',
			bar: 'bar',
			baz: [ 'baz1', 'baz2' ]
		}), 'foo/foo/end?bar=bar&baz=baz1&baz=baz2&foo=foo');
	});

	test('link() fills in parameters from currently selected, matching routes', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const routes = [ '/root/{foo}/deeper/{bar}', '{foo}?{bar}' ].map(path => new Route({ path }));
		const ready = new Promise((resolve) => {
			routes.push(new Route({ path: 'end?{bar}&{baz}&{foo}', exec: resolve }));
		});
		routes.reduce<{ append(route: Route<Context, Parameters>): void }>((parent, route) => {
				parent.append(route);
				return route;
			}, router);

		router.start({ dispatchCurrent: false });
		history.set('/root/FOO/deeper/BAR/foo/end?bar=bar&baz=baz1&baz=baz2&foo=f00');

		return ready.then(() => {
			assert.equal(router.link(routes[2]), '/root/FOO/deeper/BAR/foo/end?bar=bar&baz=baz1&baz=baz2&foo=f00');

			const route = new Route({ path: '{bar}' });
			routes[0].append(route);
			assert.equal(router.link(route, { bar: 'bar' }), '/root/FOO/deeper/bar/bar');
		});
	});

	test('link() lets you override parameters from currently selected, matching routes', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const routes = [ '/root/{foo}/deeper/{bar}', '{foo}?{bar}' ].map(path => new Route({ path }));
		const ready = new Promise((resolve) => {
			routes.push(new Route({ path: 'end?{bar}&{baz}&{foo}', exec: resolve }));
		});
		routes.reduce<{ append(route: Route<Context, Parameters>): void }>((parent, route) => {
				parent.append(route);
				return route;
			}, router);

		router.start({ dispatchCurrent: false });
		history.set('/root/FOO/deeper/BAR/foo/end?bar=bar&baz=baz1&baz=baz2&foo=f00');

		return ready.then(() => {
			assert.equal(router.link(routes[2], { foo: 'f00' }), '/root/f00/deeper/BAR/f00/end?bar=bar&baz=baz1&baz=baz2&foo=f00');
		});
	});

	test('link() is available when executing the currently selected route', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const initial = new Route({
			path: '/initial/{foo}',
			exec() {
				history.set('/foo');
			}
		});
		router.append(initial);

		const ready = new Promise((resolve) => {
			const links: string[] = [];
			const route = new Route({
				path: '/{foo}',
				guard() {
					links.push(router.link(initial));
					return true;
				},
				params() {
					links.push(router.link(initial));
					return {};
				},
				exec() {
					links.push(router.link(route));
					resolve(links);
				}
			});
			router.append(route);
		});

		router.start({ dispatchCurrent: false });
		history.set('/initial/foo');

		return ready.then((links) => {
			assert.deepEqual(links, [ '/initial/foo', '/initial/foo', '/foo' ]);
		});
	});

	test('there is no currently selected route for link() after a redirect is requested', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const initial = new Route({
			path: '/initial/{foo}',
			exec() {
				history.set('/redirect');
			}
		});
		const redirect = new Route({
			path: '/redirect',
			guard() {
				return '/foo';
			}
		});
		router.append([ initial, redirect ]);

		const ready = new Promise((resolve) => {
			const route = new Route({
				path: '/foo',
				guard() {
					resolve(new Promise((resolve) => {
						resolve(router.link(initial));
					}));
					return true;
				}
			});
			router.append(route);
		});

		router.start({ dispatchCurrent: false });
		history.set('/initial/foo');

		return ready
			.then(() => {
				throw new Error('Should have thrown');
			})
			.catch((err) => {
				assert.equal(err.message, 'Cannot generate link, missing parameter \'foo\'');
			});
	});

	test('there is no currently selected route for link() after a dispatch fails', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const initial = new Route({
			path: '/initial/{foo}',
			exec() {
				history.set('/missing');
				setTimeout(() => {
					history.set('/foo');
				}, 50);
			}
		});
		router.append(initial);

		const ready = new Promise((resolve) => {
			const route = new Route({
				path: '/foo',
				guard() {
					resolve(new Promise((resolve) => {
						resolve(router.link(initial));
					}));
					return true;
				}
			});
			router.append(route);
		});

		router.start({ dispatchCurrent: false });
		history.set('/initial/foo');

		return ready
			.then(() => {
				throw new Error('Should have thrown');
			})
			.catch((err) => {
				assert.equal(err.message, 'Cannot generate link, missing parameter \'foo\'');
			});
	});

	test('there is no currently selected route for link() after an unmanaged dispatch', () => {
		const history = new MemoryHistory();
		const router = new Router({ history });
		const initial = new Route({
			path: '/initial/{foo}',
			exec() {
				return router.dispatch({}, '/unmanaged').then(() => {
					history.set('/foo');
				});
			}
		});
		const unmanaged = new Route({ path: '/unmanaged' });
		router.append([ initial, unmanaged ]);

		const ready = new Promise((resolve) => {
			const route = new Route({
				path: '/foo',
				guard() {
					resolve(new Promise((resolve) => {
						resolve(router.link(initial));
					}));
					return true;
				}
			});
			router.append(route);
		});

		router.start({ dispatchCurrent: false });
		history.set('/initial/foo');

		return ready
			.then(() => {
				throw new Error('Should have thrown');
			})
			.catch((err) => {
				assert.equal(err.message, 'Cannot generate link, missing parameter \'foo\'');
			});
	});

	test('link() generated for a registered outlet', () => {
		const config = [
			{
				path: 'foo',
				outlet: 'foo',
				children: [
					{
						path: 'bar',
						outlet: 'bar'
					}
				]
			}
		];
		const router = new Router({ config });
		const link = router.link('bar');
		assert.strictEqual(link, 'foo/bar');
	});

	test('link() generated for a registered outlet uses passed params argument', () => {
		const config = [
			{
				path: 'foo/{foo}',
				outlet: 'foo',
				children: [
					{
						path: 'bar',
						outlet: 'bar'
					}
				]
			}
		];
		const router = new Router({ config });
		const link = router.link('bar', { foo: 'custom' });
		assert.strictEqual(link, 'foo/custom/bar');
	});

	test('link() generated for a registered outlet uses default params', () => {
		const config = [
			{
				path: 'foo',
				outlet: 'foo',
				children: [
					{
						path: 'bar/{bar}',
						outlet: 'bar',
						defaultParams: {
							bar: 'baz'
						}
					}
				]
			}
		];

		const router = new Router({ config });
		const link = router.link('bar');
		assert.strictEqual(link, 'foo/bar/baz');
	});

	test('link() generated for a registered outlet falls back to global default params', () => {
		const config = [
			{
				path: 'foo/{foo}?{query}',
				outlet: 'foo',
				defaultParams: {
					foo: 'qux',
					query: 'query'
				},
				children: [
					{
						path: 'bar/{bar}',
						outlet: 'bar',
						defaultParams: {
							bar: 'baz'
						}
					}
				]
			}
		];

		const router = new Router({ config });
		const link = router.link('bar');
		assert.strictEqual(link, 'foo/qux/bar/baz?query=query');
	});

	test('link() throws an error if outlet has not been registered', () => {
		const router = new Router({});
		try {
			router.link('bar');
			assert.fail('Link should throw an error if outlet has not been registered');
		}
		catch (e) {
		}
	});

	suite('dispatch errors are emitted', () => {
		let context: Context = {};
		let dispatch = () => new Promise(() => {});
		let events: ErrorEvent<Context>[] = [];
		let fallback: any = null;
		let history = new MemoryHistory();
		const path = '/foo/bar';
		let router = new Router();

		const verify = (promise: Promise<any>, ...errors: any[]) => {
			return promise.then(() => {
				assert.lengthOf(events, errors.length);
				errors.forEach((error, index) => {
					assert.strictEqual(events[index].context, context);
					assert.strictEqual(events[index].error, error);
					assert.strictEqual(events[index].path, path);
					assert.strictEqual(events[index].target, router);
				});
			});
		};

		beforeEach(() => {
			events = [];
			fallback = null;
			history = new MemoryHistory();
			router = new Router({
				context,
				fallback() {
					if (fallback) {
						return fallback();
					}
				},
				history
			});
			router.on('error', (event: any) => { events.push(event); });
			dispatch = () => {
				return new Promise((resolve) => {
					router.dispatch(context, path).finally(resolve);
				});
			};
		});

		test('route selection throws', () => {
			const error = new Error();
			router.append(new Route({
				path,
				guard(): boolean {
					throw error;
				}
			}));
			return verify(dispatch(), error);
		});

		test('route exec throws', () => {
			const error = new Error();
			router.append(new Route({
				path,
				exec() {
					throw error;
				}
			}));
			return verify(dispatch(), error);
		});

		test('route fallback throws', () => {
			const error = new Error();
			router.append(new Route({
				path: '/foo',
				fallback() {
					throw error;
				}
			}));
			return verify(dispatch(), error);
		});

		test('route index throws', () => {
			const error = new Error();
			router.append(new Route({
				path,
				index() {
					throw error;
				}
			}));
			return verify(dispatch(), error);
		});

		test('router fallback throws', () => {
			const error = new Error();
			fallback = () => { throw error; };
			return verify(dispatch(), error);
		});

		test('route exec returns a rejected thenable', () => {
			const error = new Error();
			router.append(new Route({
				path,
				exec() {
					return Promise.reject(error);
				}
			}));
			return verify(dispatch(), error);
		});

		test('route fallback returns a rejected thenable', () => {
			const error = new Error();
			router.append(new Route({
				path: '/foo',
				fallback() {
					return Promise.reject(error);
				}
			}));
			return verify(dispatch(), error);
		});

		test('route index returns a rejected thenable', () => {
			const error = new Error();
			router.append(new Route({
				path,
				index() {
					return Promise.reject(error);
				}
			}));
			return verify(dispatch(), error);
		});

		test('router fallback returns a rejected thenable', () => {
			const error = new Error();
			fallback = () => { return Promise.reject(error); };
			return verify(dispatch(), error);
		});

		test('when redirecting more than 20 times in a row', () => {
			let count: (path: string) => void;
			const promise = new Promise((resolve) => {
				let n = 0;
				count = (path) => {
					n++;
					if (n > 20) {
						resolve(path);
					}
				};
			});

			router.append([
				new Route({
					path: '/to',
					guard() {
						count('/to');
						return '/and/fro';
					}
				}),
				new Route({
					path: '/and/fro',
					guard() {
						count('/and/fro');
						return '/to';
					}
				})
			]);

			router.start({ dispatchCurrent: false });
			history.set('/to');
			return promise.then((path) => {
				// Allow the redirect to propagate through the dispatch promise chain before checking to see if the
				// error was emitted.
				return new Promise((resolve) => setTimeout(resolve, 10, path));
			}).then((path) => {
				assert.lengthOf(events, 1);
				const [ evt ] = events;
				assert.strictEqual(evt.context, context);
				assert.instanceOf(evt.error, Error);
				assert.equal(evt.error.message, 'More than 20 redirects, giving up');
				assert.strictEqual(evt.path, path);
				assert.strictEqual(evt.target, router);
			});
		});
	});

	// This test is mostly there to verify the typings at compile time.
	test('Router() takes a Context type', () => {
		interface Refined extends Context {
			refined: boolean;
		}
		const router = new Router<Refined>({
			context: { refined: true },
			fallback({ context }) {
				assert.isTrue(context.refined);
			}
		});
		router.append(new Route<Refined, any>({
			path: '/foo',
			exec({ context }) {
				assert.isTrue(context.refined);
			}
		}));
		router.dispatch({ refined: true }, '/foo');
		router.dispatch({ refined: true }, '/bar');
	});
});
