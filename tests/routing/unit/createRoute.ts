import UrlSearchParams from 'dojo-core/UrlSearchParams';
import { suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import {
	Context as C,
	createRoute,
	DefaultParameters,
	Parameters,
	Request,
	Route
} from '../../src/main';

interface R extends Request<Parameters> {};

suite('createRoute', () => {
	test('can create route without options', () => {
		assert.doesNotThrow(() => {
			createRoute();
		});
	});

	test('exec() can be customized', () => {
		let wasCustomized = false;
		createRoute({
			exec (request: R) {
				wasCustomized = true;
			}
		}).exec({} as R);
		assert.isTrue(wasCustomized);
	});

	test('if not customized, exec() is a noop', () => {
		assert.doesNotThrow(() => {
			createRoute().exec({} as R);
		});
	});

	test('index() can be specified', () => {
		assert.isUndefined(createRoute().index);
		const index = () => {};
		assert.strictEqual(createRoute({ index }).index, index);
	});

	test('fallback() can be specified', () => {
		assert.isUndefined(createRoute().fallback);
		const fallback = () => {};
		assert.strictEqual(createRoute({ fallback }).fallback, fallback);
	});

	test('guard() can be customized', () => {
		let wasCustomized = false;
		createRoute({
			guard (request: R) {
				return wasCustomized = true;
			}
		}).guard({} as R);
		assert.isTrue(wasCustomized);
	});

	test('if not customized, guard() returns true', () => {
		assert.isTrue(createRoute().guard({} as R));
	});

	test('a route is not matched if guard() returns false', () => {
		const route = createRoute({
			guard () {
				return false;
			}
		});

		const selections = route.select({} as C, [], false, new UrlSearchParams());
		assert.lengthOf(selections, 0);
	});

	test('guard() receives the context', () => {
		const context: C = {};
		let received: C;
		const route = createRoute({
			guard ({ context }: R) {
				received = context;
				return true;
			}
		});

		route.select(context, [], false, new UrlSearchParams());
		assert.strictEqual(received, context);
	});

	test('path must not contain #', () => {
		assert.throws(() => {
			createRoute({ path: '/foo#' });
		}, TypeError, 'Path must not contain \'#\'');
	});

	test('path segments cannot contain &', () => {
		assert.throws(() => {
			createRoute({ path: '/&/bar' });
		}, TypeError, 'Path segment must not contain \'&\'');
	});

	test('path segments cannot be empty', () => {
		assert.throws(() => {
			createRoute({ path: '/foo//bar' });
		}, TypeError, 'Path segment must not be empty');
	});

	test('path parameters are extracted', () => {
		const route = <Route<DefaultParameters>> createRoute({
			path: '/{foo}/{bar}?{baz}&{qux}'
		});
		const [{ params }] = route.select({} as C, ['quux', 'corge'], false, new UrlSearchParams('baz=grault&qux=garply'));
		assert.deepEqual(params, {
			foo: 'quux',
			bar: 'corge',
			baz: 'grault',
			qux: 'garply'
		});
	});

	test('search parameters are optional', () => {
		const route = <Route<DefaultParameters>> createRoute({
			path: '/{foo}/{bar}?{baz}&{qux}'
		});
		const [{ params }] = route.select({} as C, ['quux', 'corge'], false, new UrlSearchParams('baz=grault'));
		assert.deepEqual(params, {
			foo: 'quux',
			bar: 'corge',
			baz: 'grault'
		});
	});

	test('only the first search parameter value is extracted', () => {
		const route = <Route<DefaultParameters>> createRoute({
			path: '/{foo}/{bar}?{baz}&{qux}'
		});
		const [{ params }] = route.select({} as C, ['quux', 'corge'], false, new UrlSearchParams('baz=grault&baz=garply'));
		assert.deepEqual(params, {
			foo: 'quux',
			bar: 'corge',
			baz: 'grault'
		});
	});

	test('path parameters cannot contain {, & or :', () => {
		assert.throws(() => {
			createRoute({ path: '/{{}' });
		}, TypeError, 'Parameter name must not contain \'{\', \'&\' or \':\'');

		assert.throws(() => {
			createRoute({ path: '/{&}' });
		}, TypeError, 'Parameter name must not contain \'{\', \'&\' or \':\'');

		assert.throws(() => {
			createRoute({ path: '/{:}' });
		}, TypeError, 'Parameter name must not contain \'{\', \'&\' or \':\'');
	});

	test('path parameters must be named', () => {
		assert.throws(() => {
			createRoute({ path: '/{}/' });
		}, TypeError, 'Parameter must have a name');
	});

	test('path parameters must be closed', () => {
		assert.throws(() => {
			createRoute({ path: '/{foo/' });
		}, TypeError, 'Parameter name must be followed by \'}\', got \'/\'');
	});

	test('path parameters must be separated by /', () => {
		assert.throws(() => {
			createRoute({ path: '/{foo}{bar}' });
		}, TypeError, 'Parameter must be followed by \'/\' or \'?\', got \'{\'');
	});

	test('search parameters must be separated by &', () => {
		assert.throws(() => {
			createRoute({ path: '/?{foo}{bar}' });
		}, TypeError, 'Search parameter must be followed by \'&\', got \'{\'');
	});

	test('search component must only contain parameters', () => {
		assert.throws(() => {
			createRoute({ path: '/?foo=bar' });
		}, TypeError, 'Expected parameter in search component, got \'foo=bar\'');

		assert.throws(() => {
			createRoute({ path: '/?{foo}&/bar' });
		}, TypeError, 'Expected parameter in search component, got \'/\'');

		assert.throws(() => {
			createRoute({ path: '/?{foo}&?bar' });
		}, TypeError, 'Expected parameter in search component, got \'?\'');

		assert.throws(() => {
			createRoute({ path: '/?{foo}&&bar' });
		}, TypeError, 'Expected parameter in search component, got \'&\'');
	});

	test('path parameters must have unique names', () => {
		assert.throws(() => {
			createRoute({ path: '/{foo}/{foo}' });
		}, TypeError, 'Parameter must have a unique name, got \'foo\'');

		assert.throws(() => {
			createRoute({ path: '/{foo}?{foo}' });
		}, TypeError, 'Parameter must have a unique name, got \'foo\'');
		assert.throws(() => {
			createRoute({ path: '?{foo}&{foo}' });
		}, TypeError, 'Parameter must have a unique name, got \'foo\'');
	});

	test('guard() receives the extracted parameters', () => {
		let received: Parameters;
		const route = <Route<DefaultParameters>> createRoute({
			path: '/{foo}/{bar}?{baz}&{qux}',
			guard ({ params }: R) {
				received = params;
				return true;
			}
		});
		route.select({} as C, ['quux', 'corge'], false, new UrlSearchParams('baz=grault&qux=garply'));
		assert.deepEqual(received, {
			foo: 'quux',
			bar: 'corge',
			baz: 'grault',
			qux: 'garply'
		});
	});

	test('parameter extraction can be customized', () => {
		interface Customized {
			upper: string;
			barIsQux: boolean;
		}
		const route = <Route<Customized>> createRoute({
			path: '/{foo}/{bar}',
			params (fromPath) {
				const [foo, bar] = fromPath;
				return {
					upper: foo.toUpperCase(),
					barIsQux: bar === 'qux'
				};
			}
		});
		const [{ params }] = route.select({} as C, ['baz', 'qux'], false, new UrlSearchParams());
		assert.deepEqual(params, {
			upper: 'BAZ',
			barIsQux: true
		});
	});

	test('search parameter extraction can be customized', () => {
		interface Customized {
			fooArr: string[];
			barIsQux: boolean;
		}
		const route = <Route<Customized>> createRoute({
			path: '/?{foo}&{bar}',
			params (fromPath, searchParams) {
				return {
					fooArr: searchParams.getAll('foo'),
					barIsQux: searchParams.get('bar') === 'qux'
				};
			}
		});
		const [{ params }] = route.select({} as C, [], false, new UrlSearchParams('foo=baz&bar=qux&foo=BAZ'));
		assert.deepEqual(params, {
			fooArr: ['baz', 'BAZ'],
			barIsQux: true
		});
	});

	test('parameter extraction cannot be customized if the path doesn\'t contain parameters', () => {
		assert.throws(() => {
			createRoute({
				path: '/foo/bar',
				params () {
					return {};
				}
			});
		}, TypeError, 'Can\'t specify params() if path doesn\'t contain any');
	});

	test('parameter extraction can cause a route not to match', () => {
		const route = createRoute({
			path: '/{foo}',
			params () {
				return null;
			}
		});

		const selections = route.select({} as C, ['foo'], false, new UrlSearchParams());
		assert.lengthOf(selections, 0);
	});

	test('without a path, is selected for zero segments', () => {
		const route = createRoute();
		const selections = route.select({} as C, [], false, new UrlSearchParams());
		assert.lengthOf(selections, 1);
		assert.strictEqual(selections[0].route, route);
	});

	test('without a path or nested routes, is not selected for segments', () => {
		const route = createRoute();
		const selections = route.select({} as C, ['foo'], false, new UrlSearchParams());
		assert.lengthOf(selections, 0);
	});

	test('with a path, is selected if segments match', () => {
		const route = createRoute({ path: '/foo/bar' });
		const selections = route.select({} as C, ['foo', 'bar'], false, new UrlSearchParams());
		assert.lengthOf(selections, 1);
		assert.strictEqual(selections[0].route, route);
	});

	test('with a path, is not selected if segments do not match', () => {
		{
			const route = createRoute({ path: '/foo/bar' });
			const selections = route.select({} as C, ['baz', 'qux'], false, new UrlSearchParams());
			assert.lengthOf(selections, 0);
		}

		{
			const route = createRoute({ path: '/foo/bar' });
			const selections = route.select({} as C, ['foo'], false, new UrlSearchParams());
			assert.lengthOf(selections, 0);
		}
	});

	test('selects nested routes', () => {
		const root = createRoute({ path: '/foo' });
		const deep = createRoute({ path: '/bar' });
		const deeper = createRoute({ path: '/baz' });
		root.append(deep);
		deep.append(deeper);

		const selections = root.select({} as C, ['foo', 'bar', 'baz'], false, new UrlSearchParams());
		assert.lengthOf(selections, 3);
		const [{ route: first }, { route: second }, { route: third }] = selections;
		assert.strictEqual(first, root);
		assert.strictEqual(second, deep);
		assert.strictEqual(third, deeper);
	});

	test('selects nested routes in order of registration', () => {
		{
			const root = createRoute({ path: '/foo' });
			const deep = createRoute({ path: '/bar' });
			const altDeep = createRoute({ path: '/bar/baz' });
			const deeper = createRoute({ path: '/baz' });
			root.append(deep);
			root.append(altDeep);
			deep.append(deeper);

			const selections = root.select({} as C, ['foo', 'bar', 'baz'], false, new UrlSearchParams());
			assert.lengthOf(selections, 3);
		}

		{
			const root = createRoute({ path: '/foo' });
			const deep = createRoute({ path: '/bar' });
			const altDeep = createRoute({ path: '/bar/baz' });
			const deeper = createRoute({ path: '/baz' });
			root.append(altDeep);
			root.append(deep);
			deep.append(deeper);

			const selections = root.select({} as C, ['foo', 'bar', 'baz'], false, new UrlSearchParams());
			assert.lengthOf(selections, 2);
		}
	});

	test('leading slashes are irrelevant', () => {
		const root = createRoute({ path: 'foo' });
		const deep = createRoute({ path: '/bar' });
		const deeper = createRoute({ path: 'baz' });
		root.append(deep);
		deep.append(deeper);

		const selections = root.select({} as C, ['foo', 'bar', 'baz'], false, new UrlSearchParams());
		assert.lengthOf(selections, 3);
	});

	test('if present in route, there must be a trailing slash when selecting', () => {
		[true, false].forEach(withSlash => {
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({ path: '/baz/' });
			root.append(deep);
			deep.append(deeper);

			const selections = root.select({} as C, ['foo', 'bar', 'baz'], withSlash, new UrlSearchParams());
			assert.lengthOf(selections, withSlash ? 3 : 0, `there is ${withSlash ? 'a' : 'no'} trailing slash when selecting`);
		});
	});

	test('if not present in route, there must not be a trailing slash when selecting', () => {
		[true, false].forEach(withSlash => {
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({ path: '/baz' });
			root.append(deep);
			deep.append(deeper);

			const selections = root.select({} as C, ['foo', 'bar', 'baz'], withSlash, new UrlSearchParams());
			assert.lengthOf(selections, withSlash ? 0 : 3, `there is ${withSlash ? 'a' : 'no'} trailing slash when selecting`);
		});
	});

	test('routes can be configured to ignore trailing slash discrepancies', () => {
		[true, false].forEach(withSlash => {
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({
				path: `/baz${withSlash ? '' : '/'}`,
				trailingSlashMustMatch: false
			});
			root.append(deep);
			deep.append(deeper);

			const selections = root.select({} as C, ['foo', 'bar', 'baz'], withSlash, new UrlSearchParams());
			assert.lengthOf(selections, 3, `there is ${withSlash ? 'a' : 'no'} trailing slash when selecting`);
		});
	});

	test('all segments must match for a route hierarchy to be selected', () => {
		const root = createRoute({ path: 'foo' });
		const deep = createRoute({ path: '/bar' });
		root.append(deep);

		const selections = root.select({} as C, ['foo', 'bar', 'baz'], false, new UrlSearchParams());
		assert.lengthOf(selections, 0);
	});

	test('extracts path parameters for each nested route', () => {
		const root = createRoute({ path: '/foo/{param}' });
		const deep = createRoute({ path: '/bar/{param}' });
		const deeper = createRoute({ path: '/baz/{param}' });
		root.append(deep);
		deep.append(deeper);

		const selections = root.select({} as C, ['foo', 'root', 'bar', 'deep', 'baz', 'deeper'], false, new UrlSearchParams());
		assert.lengthOf(selections, 3);
		const [{ params: first }, { params: second }, { params: third }] = selections;
		assert.deepEqual(first, { param: 'root' });
		assert.deepEqual(second, { param: 'deep' });
		assert.deepEqual(third, { param: 'deeper' });
	});

	test('guard() is not called unnecessarily', () => {
		let called: string[];
		const root = createRoute({
			path: '/root',
			guard () {
				called.push('root');
				return true;
			}
		});
		const deep = createRoute({
			path: '/deep',
			guard () {
				called.push('deep');
				return true;
			}
		});
		root.append(deep);

		called = [];
		root.select({} as C, ['root'], false, new UrlSearchParams());
		assert.deepEqual(called, ['root'], '/root');

		called = [];
		root.select({} as C, ['root', 'deep'], false, new UrlSearchParams());
		assert.deepEqual(called, ['root', 'deep'], '/root/deep');

		called = [];
		root.select({} as C, ['root', 'deep', 'deeper'], false, new UrlSearchParams());
		assert.deepEqual(called, ['root'], '/root/deep/deeper (deep isn’t selected because it doesn’t have a fallback)');
	});

	test('can append several routes at once', () => {
		const root = createRoute({ path: '/foo' });
		const deep = createRoute({ path: '/bar' });
		const altDeep = createRoute({ path: '/bar/baz' });
		root.append([altDeep, deep]);

		const selections = root.select({} as C, ['foo', 'bar', 'baz'], false, new UrlSearchParams());
		assert.lengthOf(selections, 2);
	});
});
