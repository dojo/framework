import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { registry } from '@dojo/widget-core/d';

import { routerKey } from './../../src/RouterInjector';
import { Outlet } from './../../src/Outlet';

interface ComponentWidgetProperties {
	isComponent: boolean;
}

interface IndexWidgetProperties {
	isIndexComponent: boolean;
}

interface ErrorWidgetProperties {
	isErrorComponent: boolean;
}

class ComponentWidget extends WidgetBase<ComponentWidgetProperties> {
	render() {
		return 'Test Widget';
	}
}

class IndexWidget extends WidgetBase<IndexWidgetProperties> {
	render() {
		return 'Test Widget';
	}
}

class ErrorWidget extends WidgetBase<ErrorWidgetProperties> {
	render() {
		return 'Test Widget';
	}
}

let assertRender = (properties: any) => {};
let outlet: any;

class StubInjector extends WidgetBase<any> {
	render() {
		assertRender(this.properties);
		return this.properties.render();
	}
}
registry.define(routerKey, StubInjector);

registerSuite({
	name: 'Outlet',
	beforeEach() {
		assertRender = (properties: any) => {};
		outlet = undefined;
	},
	'No router injector defined'() {
		const TestOutlet = Outlet(ComponentWidget, 'test-outlet', () => {}, 'outletInjector');
		outlet = new TestOutlet();
		assert.isNull(outlet.__render__());
	},
	'Default mapper and router key'() {
		assertRender = (properties: any) => {
			assert.strictEqual(properties.scope, outlet);
			const injectedProperties = properties.getProperties();
			assert.strictEqual(injectedProperties.outlet, 'test-outlet');
			assert.strictEqual(injectedProperties.mainComponent, ComponentWidget);
			assert.isUndefined(injectedProperties.indexComponent);
			assert.isUndefined(injectedProperties.errorComponent);
			assert.deepEqual(injectedProperties.mapParams, undefined);
		};
		const TestOutlet = Outlet(ComponentWidget, 'test-outlet');
		outlet = new TestOutlet();
		outlet.__render__();
	},
	'main, index and error component'() {
		assertRender = (properties: any) => {
			assert.strictEqual(properties.scope, outlet);
			const injectedProperties = properties.getProperties();
			assert.strictEqual(injectedProperties.outlet, 'test-outlet');
			assert.strictEqual(injectedProperties.mainComponent, ComponentWidget);
			assert.strictEqual(injectedProperties.indexComponent, ComponentWidget);
			assert.strictEqual(injectedProperties.errorComponent, ComponentWidget);
		};
		const TestOutlet = Outlet({
			main: ComponentWidget,
			index: ComponentWidget,
			error: ComponentWidget
		}, 'test-outlet');

		outlet = new TestOutlet();
		outlet.__render__();
	},
	'provide custom mapParams function'() {
		assertRender = (properties: any) => {
			assert.strictEqual(properties.scope, outlet);
			const injectedProperties = properties.getProperties();
			assert.strictEqual(injectedProperties.outlet, 'test-outlet');
			assert.strictEqual(injectedProperties.mainComponent, ComponentWidget);
			assert.deepEqual(injectedProperties.mapParams(), { custom: true });
		};
		const TestOutlet = Outlet(ComponentWidget, 'test-outlet', () => { return { custom: true }; });
		outlet = new TestOutlet();
		outlet.__render__();
	},
	'Outlet interface is intersection of all components'() {
		const TestOutlet = Outlet({
			main: ComponentWidget,
			index: IndexWidget,
			error: ErrorWidget
		}, 'test-outlet');

		let outlet = new TestOutlet();
		// Tests for the property typings
		assert.isUndefined(outlet.properties.isComponent);
		assert.isUndefined(outlet.properties.isErrorComponent);
		assert.isUndefined(outlet.properties.isIndexComponent);
	}
});
