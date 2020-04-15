const { describe, it } = intern.getInterface('bdd');
import { Registry } from '../../../src/core/Registry';

import { Router } from '../../../src/routing/Router';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';
import Link from '../../../src/routing/Link';
import ActiveLink from '../../../src/routing/ActiveLink';
import { w, create, getRegistry } from '../../../src/core/vdom';

import renderer, { assertion, wrap } from '../../../src/testing/renderer';

const registry = new Registry();

const router = new Router(
	[
		{
			path: 'foo',
			outlet: 'foo',
			id: 'foo',
			children: [
				{
					path: 'bar',
					outlet: 'bar',
					id: 'bar'
				}
			]
		},
		{
			path: 'other',
			outlet: 'other',
			id: 'other'
		},
		{
			path: 'query/{path}?{query}',
			outlet: 'query',
			id: 'query'
		},
		{
			path: 'param',
			outlet: 'param',
			id: 'param',
			children: [
				{
					path: '{suffix}',
					id: 'suffixed-param',
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
		const r = renderer(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo', undefined, null] }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const WrappedLink = wrap(Link);
		const template = assertion(() => w(WrappedLink, { classes: [], to: 'foo' }));
		r.expect(template);
		router.setPath('/foo');
		r.expect(template.setProperty(WrappedLink, 'classes', ['foo', undefined, null]));
	});

	it('Should render the ActiveLink children', () => {
		router.setPath('/foo');
		const r = renderer(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo'] }, ['hello']), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const template = assertion(() => w(Link, { classes: ['foo'], to: 'foo' }, ['hello']));
		r.expect(template);
	});

	it('Should render the ActiveLink children when matching query params', () => {
		router.setPath('/query/path?query=query');
		const r = renderer(
			() =>
				w(ActiveLink, { to: 'query', params: { path: 'path', query: 'query' }, activeClasses: ['foo'] }, [
					'hello'
				]),
			{
				middleware: [[getRegistry, mockGetRegistry]]
			}
		);
		const template = assertion(() =>
			w(Link, { classes: ['foo'], to: 'query', params: { path: 'path', query: 'query' } }, ['hello'])
		);
		r.expect(template);
	});

	it('Should mix the active class onto existing string class when the outlet is active', () => {
		router.setPath('/foo');
		const r = renderer(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo'], classes: 'bar' }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const template = assertion(() => w(Link, { classes: ['bar', 'foo'], to: 'foo' }));
		r.expect(template);
	});

	it('Should mix the active class onto existing array of classes when the outlet is active', () => {
		router.setPath('/foo');
		const r = renderer(() => w(ActiveLink, { to: 'foo', activeClasses: ['foo', 'qux'], classes: ['bar', 'baz'] }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const template = assertion(() => w(Link, { classes: ['bar', 'baz', 'foo', 'qux'], to: 'foo' }));
		r.expect(template);
	});

	it('Should support changing the target outlet', () => {
		router.setPath('/foo');

		let properties: any = { to: 'foo', activeClasses: ['foo'] };
		const WrappedLink = wrap(Link);
		const r = renderer(() => w(ActiveLink, properties), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const template = assertion(() => w(WrappedLink, { to: 'foo', classes: ['foo'] }));
		r.expect(template);

		properties = { to: 'other', activeClasses: ['foo'] };
		r.expect(template.setProperties(WrappedLink, { to: 'other', classes: [] }));

		router.setPath('/foo/bar');
		r.expect(template.setProperties(WrappedLink, { to: 'other', classes: [] }));

		router.setPath('/other');
		r.expect(template.setProperties(WrappedLink, { to: 'other', classes: ['foo'] }));
	});

	it('Should look at route params when determining active', () => {
		router.setPath('/param/one');
		const r1 = renderer(
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
		r1.expect(assertion(() => w(Link, { to: 'suffixed-param', classes: ['foo'], params: { suffix: 'one' } })));

		const r2 = renderer(
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
		r2.expect(assertion(() => w(Link, { to: 'suffixed-param', classes: [], params: { suffix: 'two' } })));
	});

	it('Should be able to check for an exact match', () => {
		router.setPath('/param/suffix');
		let r = renderer(() => w(ActiveLink, { to: 'param', activeClasses: ['foo'] }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		r.expect(assertion(() => w(Link, { classes: ['foo'], to: 'param' })));

		r = renderer(() => w(ActiveLink, { to: 'param', activeClasses: ['foo'], isExact: true }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		r.expect(assertion(() => w(Link, { classes: [], to: 'param' })));
	});
});
