import Task from 'dojo-core/async/Task';
import Promise from 'dojo-shim/Promise';
import { beforeEach, suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';
import { stub, spy } from 'sinon';

import createRoute from '../../src/createRoute';
import createRouter, { DispatchResult, ErrorEvent, NavigationStartEvent } from '../../src/createRouter';
import createMemoryHistory from '../../src/history/createMemoryHistory';
import { DefaultParameters, Context, Request, Parameters } from '../../src/interfaces';

suite('createRouter', () => {
	test('dispatch resolves to unsuccessful result if no route was executed', () => {
		return createRouter().dispatch({} as Context, '/').then(result => {
			assert.deepEqual(result, { success: false });
		});
	});

	test('dispatch resolves to successful result if a route was executed', () => {
		const router = createRouter();
		router.append(createRoute());
		return router.dispatch({} as Context, '/').then(result => {
			assert.deepEqual(result, { success: true });
		});
	});

	test('dispatch rejects when errors occur', () => {
		const err = {};
		const router = createRouter();
		router.append(createRoute({ exec () { throw err; }}));
		return router.dispatch({} as Context, '/').then(() => {
			assert.fail('Should not be called');
		}, actual => {
			assert.strictEqual(actual, err);
		});
	});

	test('dispatch returns redirect', () => {
		const router = createRouter();
		router.append(createRoute({
			path: '/foo',
			guard() { return '/bar'; }
		}));

		return router.dispatch({} as Context, '/foo').then((result) => {
			assert.deepEqual(result, { redirect: '/bar', success: true });
		});
	});

	test('dispatch may return empty redirect', () => {
		const router = createRouter();
		router.append(createRoute({
			path: '/foo',
			guard() { return ''; }
		}));

		return router.dispatch({} as Context, '/foo').then((result) => {
			assert.deepEqual(result, { redirect: '', success: true });
		});
	});

	test('dispatch stops selecting routes once it has a redirect', () => {
		const router = createRouter();
		router.append(createRoute({
			path: '/foo',
			guard() { return '/bar'; }
		}));

		let executed = false;
		router.append(createRoute({
			path: '/foo',
			exec() { executed = true; }
		}));

		return router.dispatch({} as Context, '/foo').then((result) => {
			assert.deepEqual(result, { redirect: '/bar', success: true });
			assert.isFalse(executed);
		});
	});

	test('dispatch executes selected routes, providing context and extracted parameters', () => {
		const execs: { context: Context, params: Parameters }[] = [];

		const context = {} as Context;
		const router = createRouter();
		const root = createRoute({
			path: '/{foo}',
			exec ({ context, params }) {
				execs.push({ context, params });
			}
		});
		const deep = createRoute({
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

	test('dispatch calls index() on the final selected route, providing context and extracted parameters', () => {
		const calls: { method: string, context: Context, params: Parameters }[] = [];

		const context = {} as Context;
		const router = createRouter();
		const root = createRoute({
			path: '/{foo}',
			exec ({ context, params }) {
				calls.push({ method: 'exec', context, params });
			}
		});
		const deep = createRoute({
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

	test('dispatch calls fallback() on the deepest matching route, providing context and extracted parameters', () => {
		const calls: { method: string, context: Context, params: Parameters }[] = [];

		const context = {} as Context;
		const router = createRouter();
		const root = createRoute({
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

	test('dispatch selects routes in order of registration', () => {
		const order: string[] = [];

		const router = createRouter();
		router.append(createRoute({
			path: '/foo',
			guard () {
				order.push('first');
				return false;
			}
		}));
		router.append(createRoute({
			path: '/foo',
			exec () {
				order.push('second');
			}
		}));

		return router.dispatch({} as Context, '/foo').then(() => {
			assert.deepEqual(order, ['first', 'second']);
		});
	});

	test('dispatch emits navstart event', () => {
		const router = createRouter();

		let received: NavigationStartEvent = null!;
		router.on('navstart', event => {
			received = event;
		});

		router.dispatch({} as Context, '/foo');
		assert.equal(received.path, '/foo');
		assert.strictEqual(received.target, router);
	});

	test('navstart listeners can synchronously cancel routing', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));
		router.on('navstart', event => {
			event.cancel();
		});

		return router.dispatch({} as Context, '/foo').then(({ success: d }) => {
			assert.isFalse(d);
		});
	});

	test('navstart listeners can asynchronously cancel routing', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));
		router.on('navstart', event => {
			const { cancel } = event.defer();
			Promise.resolve().then(cancel);
		});

		return router.dispatch({} as Context, '/foo').then(({ success: d }) => {
			assert.isFalse(d);
		});
	});

	test('navstart listeners can asynchronously resume routing', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));
		router.on('navstart', event => {
			const { resume } = event.defer();
			Promise.resolve().then(resume);
		});

		return router.dispatch({} as Context, '/foo').then(({ success: d }) => {
			assert.isTrue(d);
		});
	});

	test('all deferring navstart listeners must resume before routing continues', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		const resumers: {(): void}[] = [];
		router.on('navstart', event => {
			const { resume } = event.defer();
			resumers.push(resume);
		});
		router.on('navstart', event => {
			const { resume } = event.defer();
			resumers.push(resume);
		});

		let dispatched: boolean | undefined = false;
		router.dispatch({} as Context, '/foo').then(({ success: d }) => {
			dispatched = d;
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

	test('dispatch can be canceled', () => {
		const router = createRouter();

		let executed = false;
		router.append(createRoute({
			path: '/foo',
			exec () { executed = true; }
		}));

		let resume: () => void = <any> undefined;
		router.on('navstart', event => {
			resume = event.defer().resume;
		});

		const task = router.dispatch({} as Context, '/foo');
		task.cancel();
		resume();

		return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
			assert.isFalse(executed);
		});
	});

	test('router can be created with a fallback route', () => {
		let received: Request<Context, Parameters>;

		const router = createRouter({
			fallback (request) {
				received = request;
			}
		});

		const context = {} as Context;
		return router.dispatch(context, '/foo').then(({ success: d }) => {
			assert.isTrue(d);
			assert.ok(received);
			assert.strictEqual(received.context, context);
			assert.deepEqual(received.params, {});
		});
	});

	test('can append several routes at once', () => {
		const order: string[] = [];

		const router = createRouter();
		router.append([
			createRoute({
				path: '/foo',
				guard () {
					order.push('first');
					return false;
				}
			}),
			createRoute({
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

	test('leading slashes are irrelevant', () => {
		const router = createRouter();
		const root = createRoute({ path: '/foo' });
		const deep = createRoute({ path: 'bar' });
		const deeper = createRoute({ path: 'baz' });
		root.append(deep);
		deep.append(deeper);
		router.append(root);

		return router.dispatch({} as Context, 'foo/bar/baz').then(({ success: d }) => {
			assert.isTrue(d);
		});
	});

	test('if present in route, there must be a trailing slash when selecting', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = createRouter();
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({ path: '/baz/' });
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as Context, `foo/bar/baz${withSlash ? '/' : ''}`).then(({ success: d }) => {
				assert.isTrue(d === withSlash, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('if not present in route, there must not be a trailing slash when selecting', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = createRouter();
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({ path: '/baz' });
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as Context, `foo/bar/baz${withSlash ? '/' : ''}`).then(({ success: d }) => {
				assert.isTrue(d !== withSlash, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('routes can be configured to ignore trailing slash discrepancies', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = createRouter();
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({
				path: `/baz${withSlash ? '' : '/'}`,
				trailingSlashMustMatch: false
			});
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as Context, `foo/bar/baz${withSlash ? '/' : ''}`).then(({ success: d }) => {
				assert.isTrue(d, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('search components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		return router.dispatch({} as Context, '/foo?bar').then(({ success: d }) => {
			assert.isTrue(d);
		});
	});

	test('hash components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		return router.dispatch({} as Context, '/foo#bar').then(({ success: d }) => {
			assert.isTrue(d);
		});
	});

	test('query & hash components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		return router.dispatch({} as Context, '/foo?bar#baz').then(({ success: d }) => {
			assert.isTrue(d, '/foo?bar#baz');

			return router.dispatch({} as Context, '/foo#bar?baz');
		}).then(({ success: d }) => {
			assert.isTrue(d);
		});
	});

	test('repeated slashes have no effect', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo/bar' }));

		return router.dispatch({} as Context, '//foo///bar').then(({ success: d }) => {
			assert.isTrue(d);
		});
	});

	test('query parameters are extracted', () => {
		const router = createRouter();

		let extracted: DefaultParameters = {};
		router.append(createRoute({
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

	test('#start is a noop if the router was created without a history manager', () => {
		assert.doesNotThrow(() => {
			const listener = createRouter().start();
			listener.pause();
			listener.resume();
			listener.destroy();
		});
	});

	test('#start wires dispatch to a history change event', () => {
		const history = createMemoryHistory();
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start({ dispatchCurrent: false });
		history.set('/foo');
		assert.isTrue(dispatch.calledWith({}, '/foo'));
	});

	test('#start returns a pausable handler', () => {
		const history = createMemoryHistory();
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		const listener = router.start({ dispatchCurrent: false });
		listener.pause();
		history.set('/foo');
		assert.isFalse(dispatch.called);

		listener.resume();
		history.set('/bar');
		assert.isTrue(dispatch.calledWith({}, '/bar'));
	});

	test('#start can immediately dispatch for the current history value', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start({ dispatchCurrent: true });
		assert.isTrue(dispatch.calledWith({}, '/foo'));
	});

	test('#start can be configured not to immediately dispatch for the current history value', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start({ dispatchCurrent: false });
		assert.isTrue(dispatch.notCalled);
	});

	test('#start dispatches immediately by default', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start();
		assert.isTrue(dispatch.calledOnce);
	});

	test('#start throws if already called', () => {
		const history = createMemoryHistory();
		const router = createRouter({ history });

		function start() {
			router.start();
		};

		start();

		assert.throws(start, /start can only be called once/);
	});

	test('#start ensures the previous dispatch is canceled', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		router.on('navstart', ({ defer }) => {
			// Defer the dispatch, so cancelation has effect.
			defer();
		});

		const dispatch = spy(router, 'dispatch');
		const assertCanceled = (task: Task<DispatchResult>) => {
			return new Promise((resolve) => {
				task.finally(resolve);
			});
		};

		router.start();

		assert.isTrue(dispatch.calledOnce);
		// Need to create this promise before changing the history due to <https://github.com/dojo/core/issues/205>.
		const assertionPromise = assertCanceled(dispatch.firstCall.returnValue);
		history.set('/bar');
		return assertionPromise
			.then(() => {
				assert.isTrue(dispatch.calledTwice);

				// Need to create this promise before changing the history due to <https://github.com/dojo/core/issues/205>.
				const assertionPromise = assertCanceled(dispatch.secondCall.returnValue);
				history.set('/baz');
				return assertionPromise;
			});
	});

	test('#start replaces history if the dispatch requested a redirect', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });

		const execs: string[] = [];
		router.append([
			createRoute({
				path: '/foo',
				guard() { return '/bar'; }
			}),
			createRoute({
				path: '/bar',
				exec() { execs.push('/bar'); }
			}),
			createRoute({
				path: '/baz',
				guard() { return ''; }
			}),
			createRoute({
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

	test('without a provided context, #start dispatches with an empty object as the context', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start();
		const { args: [ initialContext ] } = dispatch.firstCall;
		assert.deepEqual(initialContext, {});

		history.set('/bar');
		const { args: [ nextContext ] } = dispatch.secondCall;
		assert.notStrictEqual(nextContext, initialContext);
		assert.deepEqual(nextContext, {});
	});

	test('with a provided context, #start dispatches with that object as the context', () => {
		const context = {};
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ context, history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start();
		const { args: [ initialContext ] } = dispatch.firstCall;
		assert.strictEqual(initialContext, context);

		history.set('/bar');
		const { args: [ nextContext ] } = dispatch.secondCall;
		assert.strictEqual(nextContext, context);
	});

	test('with a provided context factory, #start dispatches with factory\'s value as the context', () => {
		const contexts = [ { first: true }, { second: true } ];
		const context = () => contexts.shift();
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ context, history });
		const dispatch = stub(router, 'dispatch').returns(new Task(() => {}));

		router.start();
		const { args: [ initialContext ] } = dispatch.firstCall;
		assert.deepEqual(initialContext, { first: true });

		history.set('/bar');
		const { args: [ nextContext ] } = dispatch.secondCall;
		assert.deepEqual(nextContext, { second: true });
	});

	suite('dispatch errors are emitted', () => {
		let context: Context = {};
		let dispatch = () => new Promise(() => {});
		let fallback: any = null;
		let events: ErrorEvent<Context>[] = [];
		const path = '/foo/bar';
		let router = createRouter();

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
			router = createRouter({
				fallback() {
					if (fallback) {
						return fallback();
					}
				}
			});
			router.on('error', (event) => { events.push(event); });
			dispatch = () => {
				return new Promise((resolve) => {
					router.dispatch(context, path).finally(resolve);
				});
			};
		});

		test('route selection throws', () => {
			const error = new Error();
			router.append(createRoute({
				path,
				guard(): boolean {
					throw error;
				}
			}));
			return verify(dispatch(), error);
		});

		test('route exec throws', () => {
			const error = new Error();
			router.append(createRoute({
				path,
				exec() {
					throw error;
				}
			}));
			return verify(dispatch(), error);
		});

		test('route fallback throws', () => {
			const error = new Error();
			router.append(createRoute({
				path: '/foo',
				fallback() {
					throw error;
				}
			}));
			return verify(dispatch(), error);
		});

		test('route index throws', () => {
			const error = new Error();
			router.append(createRoute({
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
			router.append(createRoute({
				path,
				exec() {
					return Promise.reject(error);
				}
			}));
			return verify(dispatch(), error);
		});

		test('route fallback returns a rejected thenable', () => {
			const error = new Error();
			router.append(createRoute({
				path: '/foo',
				fallback() {
					return Promise.reject(error);
				}
			}));
			return verify(dispatch(), error);
		});

		test('route index returns a rejected thenable', () => {
			const error = new Error();
			router.append(createRoute({
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
	});

	// This test is mostly there to verify the typings at compile time.
	test('createRouter takes a Context type', () => {
		interface Refined extends Context {
			refined: boolean;
		}
		const router = createRouter<Refined>({
			context: { refined: true },
			fallback({ context }) {
				assert.isTrue(context.refined);
			}
		});
		router.append(createRoute<Refined, any>({
			path: '/foo',
			exec({ context }) {
				assert.isTrue(context.refined);
			}
		}));
		router.dispatch({ refined: true }, '/foo');
		router.dispatch({ refined: true }, '/bar');
	});
});
