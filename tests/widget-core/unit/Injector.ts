import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Injector, { BaseInjector } from './../../src/Injector';
import { DNode } from './../../src/interfaces';

class TestInjector<C> extends BaseInjector<C> {
	public render() {
		return super.render();
	}
}

registerSuite({
	name: 'Injector',
	injector() {
		const context = {
			foo: 1,
			bar: '2'
		};
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget<any>();
		injector.__setProperties__({
			render,
			properties: testProperties,
			getProperties: (inject: any, properties: any): any => {
				assert.deepEqual(inject, context);
				assert.deepEqual(properties, testProperties);
				return {};
			},
			children: testChildren,
			getChildren: (inject: any, children: DNode[]): DNode[] => {
				assert.deepEqual(inject, context);
				assert.deepEqual(children, testChildren);
				return [];
			}
		});

		const renderedNode = injector.render();
		assert.deepEqual(testProperties, { qux: 'baz' });
		assert.deepEqual(testChildren, [ 'child' ]);
		assert.strictEqual(renderedNode, 'Called Render');
	},
	'injector ignores constructor arguments'() {
		const context = {
			foo: 1,
			bar: '2'
		};
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget<any>();
		injector.__setProperties__({
			render,
			properties: testProperties,
			getProperties: (inject: any, properties: any): any => {
				assert.deepEqual(inject, context);
				assert.deepEqual(properties, testProperties);
				return {};
			},
			children: testChildren,
			getChildren: (inject: any, children: DNode[]): DNode[] => {
				assert.deepEqual(inject, context);
				assert.deepEqual(children, testChildren);
				return [];
			}
		});

		const renderedNode = injector.render();
		assert.deepEqual(testProperties, { qux: 'baz' });
		assert.deepEqual(testChildren, [ 'child' ]);
		assert.strictEqual(renderedNode, 'Called Render');
	},
	'injector mixes return of getProperties over properties'() {
		const context = {
			foo: 1,
			bar: '2'
		};
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget<any>();
		injector.__setProperties__({
			render,
			properties: testProperties,
			getProperties: (inject: any, properties: any): any => {
				assert.deepEqual(inject, context);
				assert.deepEqual(properties, testProperties);
				return {
					qux: 'foo',
					extra: true
				};
			},
			children: testChildren,
			getChildren: (inject: any, children: DNode[]): DNode[] => {
				assert.deepEqual(inject, context);
				assert.deepEqual(children, testChildren);
				return [];
			}
		});

		const renderedNode = injector.render();
		assert.deepEqual(testProperties, { qux: 'foo', extra: true });
		assert.deepEqual(testChildren, [ 'child' ]);
		assert.strictEqual(renderedNode, 'Called Render');
	},
	'injector adds return of getChildren to children'() {
		const context = {
			foo: 1,
			bar: '2'
		};
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget<any>();
		injector.__setProperties__({
			render,
			properties: testProperties,
			getProperties: (inject: any, properties: any): any => {
				assert.deepEqual(inject, context);
				assert.deepEqual(properties, testProperties);
				return {};
			},
			children: testChildren,
			getChildren: (inject: any, children: DNode[]): DNode[] => {
				assert.deepEqual(inject, context);
				assert.deepEqual(children, testChildren);
				return [ 'another child' ];
			}
		});

		const renderedNode = injector.render();
		assert.deepEqual(testProperties, { qux: 'baz' });
		assert.deepEqual(testChildren, [ 'child', 'another child' ]);
		assert.strictEqual(renderedNode, 'Called Render');
	},
	'injector defaults context to empty argument'() {
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, undefined);

		const injector = new InjectorWidget<any>();
		injector.__setProperties__({
			render,
			properties: testProperties,
			getProperties: (inject: any, properties: any): any => {
				assert.deepEqual(inject, {});
				assert.deepEqual(properties, testProperties);
				return {};
			},
			children: testChildren,
			getChildren: (inject: any, children: DNode[]): DNode[] => {
				assert.deepEqual(inject, {});
				assert.deepEqual(children, testChildren);
				return [];
			}
		});

		const renderedNode = injector.render();
		assert.deepEqual(testProperties, { qux: 'baz' });
		assert.deepEqual(testChildren, [ 'child' ]);
		assert.strictEqual(renderedNode, 'Called Render');
	}
});
