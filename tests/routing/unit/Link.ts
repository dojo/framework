const { beforeEach, afterEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { spy, SinonSpy } from 'sinon';

import { add } from '../../../src/core/has';
import { v, w, create, getRegistry } from '../../../src/core/vdom';
import { Registry } from '../../../src/core/Registry';
import { Link } from '../../../src/routing/Link';
import { Router } from '../../../src/routing/Router';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';
import renderer, { assertion, wrap } from '../../../src/testing/renderer';

const registry = new Registry();

const router = new Router(
	[
		{
			path: 'foo',
			outlet: 'foo',
			id: 'foo'
		},
		{
			path: 'foo/{foo}',
			outlet: 'foo2',
			id: 'foo2'
		}
	],
	{ HistoryManager: MemoryHistory }
);

registry.defineInjector('router', () => () => router);

let routerSetPathSpy: SinonSpy;

function createMockEvent(
	options: { isRightClick?: boolean; metaKey?: boolean; ctrlKey?: boolean } = {
		isRightClick: false,
		metaKey: false,
		ctrlKey: false
	}
): MouseEvent {
	const { ctrlKey = false, metaKey = false, isRightClick = false } = options;

	return {
		defaultPrevented: false,
		preventDefault() {
			this.defaultPrevented = true;
		},
		button: isRightClick ? undefined : 0,
		metaKey,
		ctrlKey
	} as any;
}

const noop: any = () => {};

const factory = create();

const mockGetRegistry = factory(() => {
	return () => {
		return registry;
	};
});

describe('Link', () => {
	beforeEach(() => {
		routerSetPathSpy = spy(router, 'setPath');
	});

	afterEach(() => {
		routerSetPathSpy.restore();
		add('build-serve', false, true);
		add('build-time-rendered', false, true);
	});

	it('Generate link component for basic outlet', () => {
		const r = renderer(() => w(Link, { to: 'foo' }), { middleware: [[getRegistry, mockGetRegistry]] });
		r.expect(assertion(() => v('a', { href: 'foo', onclick: noop })));
	});

	it('Generate link component for outlet with specified params', () => {
		const r = renderer(() => w(Link, { to: 'foo2', params: { foo: 'foo' } }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		r.expect(assertion(() => v('a', { href: 'foo/foo', onclick: noop })));
	});

	it('Generate link component for fixed href', () => {
		const r = renderer(() => w(Link, { to: '#foo/static', isOutlet: false }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		r.expect(assertion(() => v('a', { href: '#foo/static', onclick: noop })));
	});

	it('Set router path on click', () => {
		const WrappedAnchor = wrap('a');
		const r = renderer(() => w(Link, { to: '#foo/static', isOutlet: false }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const template = assertion(() => v(WrappedAnchor.tag, { href: '#foo/static', onclick: noop }));
		r.expect(template);
		r.property(WrappedAnchor, 'onclick', createMockEvent());
		r.expect(template);
		assert.isTrue(routerSetPathSpy.calledWith('#foo/static'));
	});

	it('Custom onClick handler can prevent default', () => {
		const WrappedAnchor = wrap('a');
		const r = renderer(
			() =>
				w(Link, {
					to: 'foo',
					registry,
					onClick(event: MouseEvent) {
						event.preventDefault();
					}
				}),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		const template = assertion(() => v(WrappedAnchor.tag, { href: 'foo', registry, onclick: noop }));
		r.expect(template);
		r.property(WrappedAnchor, 'onclick', createMockEvent());
		r.expect(template);
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path when target attribute is set', () => {
		const WrappedAnchor = wrap('a');
		const r = renderer(() => w(Link, { to: 'foo', target: '_blank' }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const template = assertion(() => v(WrappedAnchor.tag, { href: 'foo', onclick: noop }));
		r.expect(template);
		r.property(WrappedAnchor, 'onclick', createMockEvent());
		r.expect(template);
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path on right click', () => {
		const WrappedAnchor = wrap('a');
		const r = renderer(() => w(Link, { to: 'foo' }), { middleware: [[getRegistry, mockGetRegistry]] });
		const template = assertion(() => v(WrappedAnchor.tag, { href: 'foo', onclick: noop }));
		r.expect(template);
		r.property(WrappedAnchor, 'onclick', createMockEvent({ isRightClick: true }));
		r.expect(template);
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path on ctrl click', () => {
		const WrappedAnchor = wrap('a');
		const r = renderer(() => w(Link, { to: 'foo' }), { middleware: [[getRegistry, mockGetRegistry]] });
		const template = assertion(() => v(WrappedAnchor.tag, { href: 'foo', onclick: noop }));
		r.expect(template);
		r.property(WrappedAnchor, 'onclick', createMockEvent({ isRightClick: true }));
		r.expect(template);
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path on meta click', () => {
		const WrappedAnchor = wrap('a');
		const r = renderer(() => w(Link, { to: 'foo' }), { middleware: [[getRegistry, mockGetRegistry]] });
		const template = assertion(() => v(WrappedAnchor.tag, { href: 'foo', onclick: noop }));
		r.expect(template);
		r.property(WrappedAnchor, 'onclick', createMockEvent({ isRightClick: true }));
		r.expect(template);
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('does not call router when build serve and build time rendered is detected', () => {
		add('build-serve', true, true);
		add('build-time-rendered', true, true);
		const WrappedAnchor = wrap('a');
		const r = renderer(() => w(Link, { to: '#foo/static', isOutlet: false }), {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		const template = assertion(() => v(WrappedAnchor.tag, { href: '#foo/static', onclick: noop }));
		r.expect(template);
		r.property(WrappedAnchor, 'onclick', createMockEvent());
		r.expect(template);
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('throw error if the injected router cannot be found with the router key', () => {
		try {
			renderer(() => w(Link, { to: '#foo/static', isOutlet: false, routerKey: 'fake-key' }), {
				middleware: [[getRegistry, mockGetRegistry]]
			});
			assert.fail('Should throw an error when the injected router cannot be found with the routerKey');
		} catch (err) {
			// nothing to see here
		}
	});
});
