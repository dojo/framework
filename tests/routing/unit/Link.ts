import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import { WidgetRegistry } from '@dojo/widget-core/WidgetRegistry';
import { RegistryMixin } from '@dojo/widget-core/mixins/Registry';
import { registerRouterInjector } from './../../src/RouterInjector';
import { Link } from './../../src/Link';
import MemoryHistory from './../../src/history/MemoryHistory';

const registry = new WidgetRegistry();
class RegistryLink extends RegistryMixin(Link) {}

registerRouterInjector([{ path: 'foo', outlet: 'foo' }, { path: 'foo/{foo}', outlet: 'foo2' }], registry, new MemoryHistory());

registerSuite({
	name: 'Link',
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
