import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Injector, { BaseInjector, Context } from './../../src/Injector';
import { DNode } from './../../src/interfaces';
import { WidgetBase } from './../../src/WidgetBase';
import { v, w } from './../../src/d';

class TestInjector extends BaseInjector {
	public render() {
		return super.render();
	}
}

const bind = {
	foo: 'bar'
};

registerSuite({
	name: 'Injector',
	injector() {
		const context = new Context({
			foo: 1,
			bar: '2'
		});
		const testProperties = {
			qux: 'baz'
		};

		class TestWidget extends WidgetBase<any> {
			render() {
				return v('div', { testFunction: this.properties.testFunction });
			}
		}

		function testFunction(this: any) {
			assert.strictEqual(this, bind);
		}

		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return v('div', {}, [
				w(TestWidget, { testFunction }),
				v('span'),
				v('div')
			]);
		};
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget();
		injector.__setProperties__({
			render,
			bind,
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

		const renderedNode: any = injector.__render__();
		assert.deepEqual(testProperties, { qux: 'baz' });
		assert.deepEqual(testChildren, [ 'child' ]);
		assert.deepEqual(renderedNode.properties, { bind });
		assert.deepEqual(renderedNode.children[1].properties, { bind });
		assert.deepEqual(renderedNode.children[2].properties, { bind });
		renderedNode.children[0].properties.testFunction();
	},
	'uses default mappers'() {
		const context = new Context({
			foo: 1,
			bar: '2'
		});
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget();
		injector.__setProperties__({
			bind: context,
			render,
			properties: testProperties,
			children: testChildren
		});

		const renderedNode = injector.render();
		assert.deepEqual(testProperties, { qux: 'baz' });
		assert.deepEqual(testChildren, [ 'child' ]);
		assert.strictEqual(renderedNode, 'Called Render');
	},
	'injector ignores constructor arguments'() {
		const context = new Context({
			foo: 1,
			bar: '2'
		});
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget();
		injector.__setProperties__({
			bind,
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
		const context = new Context({
			foo: 1,
			bar: '2'
		});
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget();
		injector.__setProperties__({
			bind,
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
		const context = new Context({
			foo: 1,
			bar: '2'
		});
		const testProperties = {
			qux: 'baz'
		};
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => { return 'Called Render'; };
		const InjectorWidget = Injector(TestInjector, context);

		const injector = new InjectorWidget();
		injector.__setProperties__({
			bind,
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
		const InjectorWidget = Injector(TestInjector, <any> undefined);

		const injector = new InjectorWidget();
		injector.__setProperties__({
			bind,
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
	},
	'render property is always considered changed'() {
		const testProperties = {
			qux: 'baz'
		};
		let rendered = 0;
		const testChildren: DNode[] = [ 'child' ];
		const render = (): DNode => {
			rendered++;
			return 'Called Render';
		};
		const InjectorWidget = Injector(TestInjector, new Context());
		const properties = {
			bind,
			render,
			properties: testProperties,
			getProperties: (inject: Context, properties: any): any => {
				assert.deepEqual(inject.get(), {});
				assert.deepEqual(properties, testProperties);
				return {};
			},
			children: testChildren,
			getChildren: (inject: Context, children: DNode[]): DNode[] => {
				assert.deepEqual(inject.get(), {});
				assert.deepEqual(children, testChildren);
				return [];
			}
		};

		const injector = new InjectorWidget();
		injector.__setProperties__(properties);
		injector.__render__();
		assert.strictEqual(rendered, 1);
		injector.__setProperties__(properties);
		injector.__render__();
		assert.strictEqual(rendered, 2);
	},
	'Injector invalidates when the context is set'() {
		let invalidated = false;
		const context = new Context();

		const InjectorWidget = Injector(TestInjector, context);
		const injector = new InjectorWidget();
		injector.on('invalidated', () => {
			invalidated = true;
		});
		context.set({});
		assert.isTrue(invalidated);
	}
});
