const { beforeEach, afterEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { spy, SinonSpy } from 'sinon';

import { Registry } from '../../../src/widget-core/Registry';
import { Link } from '../../../src/routing/Link';
import { Router } from '../../../src/routing/Router';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';

const registry = new Registry();

const router = new Router(
	[
		{
			path: 'foo',
			outlet: 'foo'
		},
		{
			path: 'foo/{foo}',
			outlet: 'foo2'
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
) {
	const { ctrlKey = false, metaKey = false, isRightClick = false } = options;

	return {
		defaultPrevented: false,
		preventDefault() {
			this.defaultPrevented = true;
		},
		button: isRightClick ? undefined : 0,
		metaKey,
		ctrlKey
	};
}

describe('Link', () => {
	beforeEach(() => {
		routerSetPathSpy = spy(router, 'setPath');
	});

	afterEach(() => {
		routerSetPathSpy.restore();
	});

	it('Generate link component for basic outlet', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo' });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
	});

	it('Generate link component for outlet with specified params', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo2', params: { foo: 'foo' } });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo/foo');
	});

	it('Generate link component for fixed href', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({ to: '#foo/static', isOutlet: false });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, '#foo/static');
	});

	it('Set router path on click', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({ to: '#foo/static', isOutlet: false });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, '#foo/static');
		dNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.calledWith('#foo/static'));
	});

	it('Custom onClick handler can prevent default', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({
			to: 'foo',
			registry,
			onClick(event: MouseEvent) {
				event.preventDefault();
			}
		});
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
		dNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path when target attribute is set', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({
			to: 'foo',
			target: '_blank'
		});
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
		dNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path on right click', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({
			to: 'foo'
		});
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
		dNode.properties.onclick.call(link, createMockEvent({ isRightClick: true }));
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path on ctrl click', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({
			to: 'foo'
		});
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
		dNode.properties.onclick.call(link, createMockEvent({ ctrlKey: true }));
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('Does not set router path on meta click', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({
			to: 'foo'
		});
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
		dNode.properties.onclick.call(link, createMockEvent({ metaKey: true }));
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('throw error if the injected router cannot be found with the router key', () => {
		const link = new Link();
		link.registry.base = registry;
		link.__setProperties__({ to: '#foo/static', isOutlet: false, routerKey: 'fake-key' });
		try {
			link.__render__();
			assert.fail('Should throw an error when the injected router cannot be found with the routerKey');
		} catch (err) {
			// nothing to see here
		}
	});
});
