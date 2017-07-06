import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { spy, SinonSpy } from 'sinon';

import { WidgetRegistry } from '@dojo/widget-core/WidgetRegistry';
import { RegistryMixin } from '@dojo/widget-core/mixins/Registry';
import { registerRouterInjector } from './../../src/RouterInjector';
import { Link } from './../../src/Link';
import MemoryHistory from './../../src/history/MemoryHistory';

const registry = new WidgetRegistry();
class RegistryLink extends RegistryMixin(Link) {}

const router = registerRouterInjector([{ path: 'foo', outlet: 'foo' }, { path: 'foo/{foo}', outlet: 'foo2' }], registry, new MemoryHistory());
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

registerSuite({
	name: 'Link',
	beforeEach() {
		routerSetPathSpy = spy(router, 'setPath');
	},
	afterEach() {
		routerSetPathSpy.restore();
	},
	'Generate link component for basic outlet'() {
		const link = new RegistryLink();
		link.__setProperties__({ to: 'foo', registry });
		const vNode: any = link.__render__();
		assert.strictEqual(vNode.vnodeSelector, 'a');
		assert.strictEqual(vNode.properties.href, 'foo');
	},
	'Generate link component for outlet with specified params'() {
		const link = new RegistryLink();
		link.__setProperties__({ to: 'foo2', params: { foo: 'foo' }, registry });
		const vNode: any = link.__render__();
		assert.strictEqual(vNode.vnodeSelector, 'a');
		assert.strictEqual(vNode.properties.href, 'foo/foo');
	},
	'Generate link component for fixed href'() {
		const link = new RegistryLink();
		link.__setProperties__({ to: '#foo/static', isOutlet: false, registry });
		const vNode: any = link.__render__();
		assert.strictEqual(vNode.vnodeSelector, 'a');
		assert.strictEqual(vNode.properties.href, '#foo/static');
	},
	'Set router path on click'() {
		const link = new RegistryLink();
		link.__setProperties__({ to: '#foo/static', isOutlet: false, registry });
		const vNode: any = link.__render__();
		assert.strictEqual(vNode.vnodeSelector, 'a');
		assert.strictEqual(vNode.properties.href, '#foo/static');
		vNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.calledWith('#foo/static'));
	},
	'Custom onClick handler can prevent default'() {
		const link = new RegistryLink();
		link.__setProperties__({
			to: 'foo',
			registry,
			onClick(event: MouseEvent) {
				event.preventDefault();
			}
		});
		const vNode: any = link.__render__();
		assert.strictEqual(vNode.vnodeSelector, 'a');
		assert.strictEqual(vNode.properties.href, 'foo');
		vNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.notCalled);
	},
	'Does not set router path when target attribute is set'() {
		const link = new RegistryLink();
		link.__setProperties__({
			to: 'foo',
			registry,
			target: '_blank'
		});
		const vNode: any = link.__render__();
		assert.strictEqual(vNode.vnodeSelector, 'a');
		assert.strictEqual(vNode.properties.href, 'foo');
		vNode.properties.onclick.call(link, createMockEvent());
		assert.isTrue(routerSetPathSpy.notCalled);
	},
	'Does not set router path on right click'() {
		const link = new RegistryLink();
		link.__setProperties__({
			to: 'foo',
			registry
		});
		const vNode: any = link.__render__();
		assert.strictEqual(vNode.vnodeSelector, 'a');
		assert.strictEqual(vNode.properties.href, 'foo');
		vNode.properties.onclick.call(link, createMockEvent(true));
		assert.isTrue(routerSetPathSpy.notCalled);
	},
	'throw error if the injected router cannot be found with the router key'() {
		const link = new Link();
		link.__setProperties__({ to: '#foo/static', isOutlet: false, routerKey: 'fake-key' });
		try {
			link.__render__();
			assert.fail('Should throw an error when the injected router cannot be found with the routerKey');
		}
		catch (err) {
			// nothing to see here
		}
	}
});
