const { afterEach, beforeEach, suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');
import { spy, SinonSpy } from 'sinon';

import { Registry } from '@dojo/widget-core/Registry';
import { registerRouterInjector } from '../../src/RouterInjector';
import { Link } from '../../src/Link';
import MemoryHistory from '../../src/history/MemoryHistory';

const registry = new Registry();

const router = registerRouterInjector([
	{
		path: 'foo',
		outlet: 'foo'
	},
	{
		path: 'foo/{foo}',
		outlet: 'foo2'
	}
], registry, { history: new MemoryHistory() });
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

suite('Link', () => {
	beforeEach(function () {
		routerSetPathSpy = spy(router, 'setPath');
	});
	afterEach(function () {
		routerSetPathSpy.restore();
	});
	test('Generate link component for basic outlet', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: 'foo', registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo');
	});
	test('Generate link component for outlet with specified params', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: 'foo2', params: { foo: 'foo' }, registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, 'foo/foo');
	});
	test('Generate link component for fixed href', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: '#foo/static', isOutlet: false, registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, '#foo/static');
	});
	test('Set router path on click', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: '#foo/static', isOutlet: false, registry });
		const dNode: any = link.__render__();
		assert.strictEqual(dNode.tag, 'a');
		assert.strictEqual(dNode.properties.href, '#foo/static');
		dNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.calledWith('#foo/static'));
	});
	test('Custom onClick handler can prevent default', () => {
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
	test('Does not set router path when target attribute is set', () => {
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
	test('Does not set router path on right click', () => {
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
	test('throw error if the injected router cannot be found with the router key', () => {
		const link = new Link();
		link.__setCoreProperties__({ bind: link, baseRegistry: registry });
		link.__setProperties__({ to: '#foo/static', isOutlet: false, routerKey: 'fake-key' });
		try {
			link.__render__();
			assert.fail('Should throw an error when the injected router cannot be found with the routerKey');
		}
		catch (err) {
			// nothing to see here
		}
	});
});
