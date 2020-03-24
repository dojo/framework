const { describe, it } = intern.getInterface('bdd');
import { Registry } from '../../../src/core/Registry';

import { Router } from '../../../src/routing/Router';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';
import Link from '../../../src/routing/Link';
import ActiveLink from '../../../src/routing/ActiveLink';
import { w, create, getRegistry } from '../../../src/core/vdom';

import harness from '../../../src/testing/harness';

const registry = new Registry();

const router = new Router(
	[
		{
			path: 'foo',
			outlet: 'foo',
			children: [
				{
					path: 'bar',
					outlet: 'bar'
				}
			]
		},
		{
			path: 'other',
			outlet: 'other'
		},
		{
			path: 'query/{path}?{query}',
			outlet: 'query'
		},
		{
			path: 'param',
			outlet: 'param',
			children: [
				{
					path: '{suffix}',
					outlet: 'suffixed-param'
				}
			]
		}
	],
	{ HistoryManager: MemoryHistory }
);

registry.defineInjector('router', () => () => router);

const factory = create();

const mockGetRegistry = factory(() => {
	return () => {
		return registry;
	};
});

describe('ActiveLink', () => {
	it('Should add and remove active class as the outlet match status changes', () => {
		router.setPath('/other');
		const h = harness(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo', undefined, null] }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(() => w(Link, { classes: [], to: 'foo' }));
		router.setPath('/foo');
		h.expect(() => w(Link, { classes: ['foo', undefined, null], to: 'foo' }));
	});

	it('Should render the ActiveLink children', () => {
		router.setPath('/foo');
		const h = harness(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo'] }, ['hello']), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(() => w(Link, { classes: ['foo'], to: 'foo' }, ['hello']));
	});

	it('Should render the ActiveLink children when matching query params', () => {
		router.setPath('/query/path?query=query');
		const h = harness(
			() =>
				w(ActiveLink, { to: 'query', params: { path: 'path', query: 'query' }, activeClasses: ['foo'] }, [
					'hello'
				]),
			{
				middleware: [[getRegistry, mockGetRegistry]]
			}
		);
		h.expect(() => w(Link, { classes: ['foo'], to: 'query', params: { path: 'path', query: 'query' } }, ['hello']));
	});

	it('Should mix the active class onto existing string class when the outlet is active', () => {
		router.setPath('/foo');
		const h = harness(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo'], classes: 'bar' }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(() => w(Link, { classes: ['bar', 'foo'], to: 'foo' }));
	});

	it('Should mix the active class onto existing array of classes when the outlet is active', () => {
		router.setPath('/foo');
		const h = harness(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo', 'qux'], classes: ['bar', 'baz'] }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(() => w(Link, { classes: ['bar', 'baz', 'foo', 'qux'], to: 'foo' }));
	});

	it('Should support changing the target outlet', () => {
		router.setPath('/foo');

		let properties: any = { to: 'foo', activeClasses: ['foo'] };

		const h = harness(() => w(ActiveLink, properties), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(() => w(Link, { to: 'foo', classes: ['foo'] }));

		properties = { to: 'other', activeClasses: ['foo'] };
		h.expect(() => w(Link, { to: 'other', classes: [] }));

		router.setPath('/foo/bar');
		h.expect(() => w(Link, { to: 'other', classes: [] }));

		router.setPath('/other');
		h.expect(() => w(Link, { to: 'other', classes: ['foo'] }));
	});

	it('Should look at route params when determining active', () => {
		router.setPath('/param/one');
		const h1 = harness(
			() =>
				w(ActiveLink, {
					to: 'suffixed-param',
					activeClasses: ['foo'],
					params: {
						suffix: 'one'
					}
				}),
			{
				middleware: [[getRegistry, mockGetRegistry]]
			}
		);
		h1.expect(() => w(Link, { to: 'suffixed-param', classes: ['foo'], params: { suffix: 'one' } }));

		const h2 = harness(
			() =>
				w(ActiveLink, {
					to: 'suffixed-param',
					activeClasses: ['foo'],
					params: {
						suffix: 'two'
					}
				}),
			{
				middleware: [[getRegistry, mockGetRegistry]]
			}
		);
		h2.expect(() => w(Link, { to: 'suffixed-param', classes: [], params: { suffix: 'two' } }));
	});

	it('Should be able to check for an exact match', () => {
		router.setPath('/param/suffix');
		let h = harness(() => w(ActiveLink, { to: 'param', activeClasses: ['foo'] }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(() => w(Link, { classes: ['foo'], to: 'param' }));

		h = harness(() => w(ActiveLink, { to: 'param', activeClasses: ['foo'], isExact: true }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(() => w(Link, { classes: [], to: 'param' }));
	});
});
