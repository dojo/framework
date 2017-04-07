import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { w, v } from '../../../src/d';
import { RegistryMixin, RegistryMixinProperties } from '../../../src/mixins/Registry';
import { WidgetBase } from '../../../src/WidgetBase';
import WidgetRegistry from '../../../src/WidgetRegistry';

class TestWithRegistry extends RegistryMixin(WidgetBase)<RegistryMixinProperties> {}

registerSuite({
	name: 'mixins/RegistryMixin',
	property: {
		'passed registry is available via getter'() {
			const registry = new WidgetRegistry();
			const instance: any = new TestWithRegistry();
			instance.setProperties({ registry });
			assert.equal(instance.registry, registry);
		},
		'no passed registry, nothing available via getter'() {
			const instance: any = new TestWithRegistry();
			instance.setProperties(<any> {});
			assert.equal(instance.registry, undefined);
		},
		'passed registry updated on property change'() {
			const registry = new WidgetRegistry();
			const newRegistry = new WidgetRegistry();
			const instance: any = new TestWithRegistry();
			instance.setProperties({ registry });
			assert.equal(instance.registry, registry);
			instance.emit({
				type: 'properties:changed',
				target: instance,
				properties: { registry: newRegistry },
				changedPropertyKeys: [ 'registry' ]
			});
			assert.equal(instance.registry, newRegistry);
		},
		'different property passed on property change should not affect registry'() {
			const registry = new WidgetRegistry();
			const instance: any = new TestWithRegistry();
			instance.setProperties({ registry });
			assert.equal(instance.registry, registry);
			instance.emit({
				type: 'properties:changed',
				target: instance,
				properties: { foo: true },
				changedPropertyKeys: [ 'foo' ]
			});
			assert.equal(instance.registry, registry);
		}
	},
	integration: {
		'works with widget base'() {
			class IntegrationTest extends TestWithRegistry {
				render() {
					return v('div', [
						w('test', { id: `${Math.random()}` })
					]);
				}
			}
			class Header extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}
			class Span extends WidgetBase<any> {
				render() {
					return v('span');
				}
			}

			const registry = new WidgetRegistry();
			registry.define('test', Header);

			const instance: any = new IntegrationTest();
			instance.setProperties({ registry });

			let result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');

			const newRegistry = new WidgetRegistry();
			newRegistry.define('test', Span);

			instance.setProperties({ registry: newRegistry });

			result = <VNode> instance.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'span');
		}
	}
});
