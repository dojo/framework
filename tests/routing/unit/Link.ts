const { beforeEach, afterEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { spy, SinonSpy } from 'sinon';

import { Registry } from '@dojo/widget-core/Registry';
import { Injector } from '@dojo/widget-core/Injector';
import { Link } from './../../src/Link';
import { Router } from './../../src/Router';
import { MemoryHistory } from './../../src/history/MemoryHistory';

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

registry.defineInjector('router', new Injector(router));

let routerSetPathSpy: SinonSpy;

function createMockEvent(isRightClick: boolean = false) {
	return {
		defaultPrevented: false,
		preventDefault() {
			this.defaultPrevented = true;
		},
		button: isRightClick ? undefined : 0
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
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: 'foo', registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
	});

	it('Generate link component for outlet with specified params', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: 'foo2', params: { foo: 'foo' }, registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo/foo');
	});

	it('Generate link component for fixed href', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: '#foo/static', isOutlet: false, registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, '#foo/static');
	});

	it('Set router path on click', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: '#foo/static', isOutlet: false, registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, '#foo/static');
		dNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.calledWith('#foo/static'));
	});

	it('Custom onClick handler can prevent default', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
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
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({
			to: 'foo',
			registry,
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
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({
			to: 'foo',
			registry
		});
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
		dNode.properties.onclick.call(link, createMockEvent(true));
		assert.isTrue(routerSetPathSpy.notCalled);
	});

	it('throw error if the injected router cannot be found with the router key', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: '#foo/static', isOutlet: false, routerKey: 'fake-key' });
		try {
			link.__render__();
			assert.fail('Should throw an error when the injected router cannot be found with the routerKey');
		} catch (err) {
			// nothing to see here
		}
	});
});
