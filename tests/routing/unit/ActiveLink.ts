const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');

import { Registry } from '../../../src/core/Registry';

import { Router } from '../../../src/routing/Router';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';
import Link from '../../../src/routing/Link';
import ActiveLink from '../../../src/routing/ActiveLink';
import { registerRouterInjector } from '../../../src/routing/RouterInjector';
import { w, v } from '../../../src/core/d';
import { renderer } from '../../../src/core/vdom';
import WidgetBase from '../../../src/core/WidgetBase';
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

class BaseActiveLink extends ActiveLink {
	constructor() {
		super();
		this.registry.base = registry;
	}
}

describe('ActiveLink', () => {
	it('should invalidate when the outlet has been matched', () => {
		let invalidateCallCount = 0;

		class MyActiveLink extends BaseActiveLink {
			invalidate() {
				super.invalidate();
				invalidateCallCount++;
			}
		}

		const h = harness(() => w(MyActiveLink, { to: 'foo', activeClasses: ['foo'] }));
		h.expect(() => w(Link, { classes: [], to: 'foo' }));

		invalidateCallCount = 0;
		router.setPath('/foo');
		assert.strictEqual(invalidateCallCount, 1);
		router.setPath('/foo/bar');
		assert.strictEqual(invalidateCallCount, 1);
		router.setPath('/baz');
		assert.strictEqual(invalidateCallCount, 2);
	});

	it('Does not add active class when outlet is not active', () => {
		router.setPath('/other');
		const h = harness(() => w(BaseActiveLink, { to: 'foo', activeClasses: ['foo', undefined, null] }));
		h.expect(() => w(Link, { classes: [], to: 'foo' }));
	});

	it('Should add the active class when the outlet is active', () => {
		router.setPath('/foo');
		const h = harness(() => w(BaseActiveLink, { to: 'foo', activeClasses: ['foo', undefined, null] }));
		h.expect(() => w(Link, { classes: ['foo', undefined, null], to: 'foo' }));
	});

	it('Should render the ActiveLink children', () => {
		router.setPath('/foo');
		const h = harness(() => w(BaseActiveLink, { to: 'foo', activeClasses: ['foo'] }, ['hello']));
		h.expect(() => w(Link, { classes: ['foo'], to: 'foo' }, ['hello']));
	});

	it('Should mix the active class onto existing string class when the outlet is active', () => {
		router.setPath('/foo');
		const h = harness(() => w(BaseActiveLink, { to: 'foo', activeClasses: ['foo'], classes: 'bar' }));
		h.expect(() => w(Link, { classes: ['bar', 'foo'], to: 'foo' }));
	});

	it('Should mix the active class onto existing array of classes when the outlet is active', () => {
		router.setPath('/foo');
		const h = harness(() =>
			w(BaseActiveLink, { to: 'foo', activeClasses: ['foo', 'qux'], classes: ['bar', 'baz'] })
		);
		h.expect(() => w(Link, { classes: ['bar', 'baz', 'foo', 'qux'], to: 'foo' }));
	});

	it('Should invalidate and re-render when link becomes active', () => {
		let invalidateCount = 0;
		router.setPath('/foo');

		class TestActiveLink extends BaseActiveLink {
			invalidate() {
				invalidateCount++;
				super.invalidate();
			}
		}

		const h = harness(() => w(TestActiveLink, { to: 'foo', activeClasses: ['foo'] }));
		h.expect(() => w(Link, { to: 'foo', classes: ['foo'] }));

		invalidateCount = 0;
		router.setPath('/other');
		assert.strictEqual(invalidateCount, 1);
		h.expect(() => w(Link, { to: 'foo', classes: [] }));
		router.setPath('/foo');
		assert.strictEqual(invalidateCount, 2);
		h.expect(() => w(Link, { to: 'foo', classes: ['foo'] }));
	});

	it('Should support changing the target outlet', () => {
		let invalidateCount = 0;
		router.setPath('/foo');

		class TestActiveLink extends BaseActiveLink {
			invalidate() {
				invalidateCount++;
				super.invalidate();
			}
		}

		let properties: any = { to: 'foo', activeClasses: ['foo'] };

		const h = harness(() => w(TestActiveLink, properties));
		h.expect(() => w(Link, { to: 'foo', classes: ['foo'] }));

		invalidateCount = 0;
		properties = { to: 'other', activeClasses: ['foo'] };
		h.expect(() => w(Link, { to: 'other', classes: [] }));
		assert.strictEqual(invalidateCount, 1);

		router.setPath('/foo/bar');
		assert.strictEqual(invalidateCount, 1);
		h.expect(() => w(Link, { to: 'other', classes: [] }));

		router.setPath('/other');
		assert.strictEqual(invalidateCount, 2);
		h.expect(() => w(Link, { to: 'other', classes: ['foo'] }));
	});

	it('Should return link when the router injector is not available', () => {
		router.setPath('/foo');
		const h = harness(() =>
			w(BaseActiveLink, { to: 'foo', activeClasses: ['foo'], classes: 'bar', routerKey: 'other' })
		);
		h.expect(() => w(Link, { to: 'foo', classes: ['bar'], routerKey: 'other' }));
	});

	it('should look at route params when determining active', () => {
		router.setPath('/param/one');
		const h1 = harness(() =>
			w(BaseActiveLink, {
				to: 'suffixed-param',
				activeClasses: ['foo'],
				params: {
					suffix: 'one'
				}
			})
		);
		h1.expect(() => w(Link, { to: 'suffixed-param', classes: ['foo'], params: { suffix: 'one' } }));

		const h2 = harness(() =>
			w(BaseActiveLink, {
				to: 'suffixed-param',
				activeClasses: ['foo'],
				params: {
					suffix: 'two'
				}
			})
		);
		h2.expect(() => w(Link, { to: 'suffixed-param', classes: [], params: { suffix: 'two' } }));
	});

	jsdomDescribe('integration tests', () => {
		it('should render outlets correctly', () => {
			const registry = new Registry();
			const router = registerRouterInjector(
				[
					{
						path: 'foo',
						outlet: 'foo',
						defaultRoute: true
					},
					{
						path: 'bar',
						outlet: 'bar'
					},
					{
						path: 'baz',
						outlet: 'baz'
					}
				],
				registry,
				{ HistoryManager: MemoryHistory }
			);

			class App extends WidgetBase {
				protected render() {
					return v('div', [
						w(ActiveLink, { to: 'foo', activeClasses: ['foo'] }),
						w(ActiveLink, { to: 'bar', activeClasses: ['bar'] }),
						w(ActiveLink, { to: 'baz', activeClasses: ['baz'] })
					]);
				}
			}

			const root = document.createElement('div') as any;
			const r = renderer(() => w(App, {}));
			r.mount({ domNode: root, sync: true, registry });
			assert.strictEqual(root.childNodes[0].childNodes[0].getAttribute('class'), 'foo');
			assert.isNull(root.childNodes[0].childNodes[1].getAttribute('class'));
			assert.isNull(root.childNodes[0].childNodes[2].getAttribute('class'));
			router.setPath('/bar');
			assert.isNull(root.childNodes[0].childNodes[0].getAttribute('class'));
			assert.strictEqual(root.childNodes[0].childNodes[1].getAttribute('class'), 'bar');
			assert.isNull(root.childNodes[0].childNodes[2].getAttribute('class'));
			router.setPath('/baz');
			assert.isNull(root.childNodes[0].childNodes[0].getAttribute('class'));
			assert.isNull(root.childNodes[0].childNodes[1].getAttribute('class'));
			assert.strictEqual(root.childNodes[0].childNodes[2].getAttribute('class'), 'baz');
			router.setPath('/foo');
			assert.strictEqual(root.childNodes[0].childNodes[0].getAttribute('class'), 'foo');
			assert.isNull(root.childNodes[0].childNodes[1].getAttribute('class'));
			assert.isNull(root.childNodes[0].childNodes[2].getAttribute('class'));
		});
	});
});
