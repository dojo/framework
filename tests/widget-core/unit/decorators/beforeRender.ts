const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { stub, SinonStub } from 'sinon';

import { v } from './../../../../src/widget-core/d';
import { DNode, Render } from './../../../../src/widget-core/interfaces';
import { beforeRender } from './../../../../src/widget-core/decorators/beforeRender';
import { WidgetBase } from './../../../../src/widget-core/WidgetBase';

let consoleStub: SinonStub;

registerSuite('decorators/beforeRender', {
	beforeEach() {
		consoleStub = stub(console, 'warn');
	},
	afterEach() {
		consoleStub.restore();
	},

	tests: {
		decorator() {
			let beforeRenderCount = 1;
			type RenderFunction = () => DNode;
			class TestWidget extends WidgetBase<any> {
				@beforeRender()
				firstAfterRender(renderFunction: RenderFunction, properties: any, children: DNode[]): RenderFunction {
					assert.strictEqual(beforeRenderCount++, 1);
					return () => {
						const rendered = renderFunction();
						const clonedProperties = { ...properties };
						return v('bar', clonedProperties, [rendered, ...children]);
					};
				}

				@beforeRender()
				secondAfterRender(renderFunction: RenderFunction, properties: any, children: DNode[]): RenderFunction {
					assert.strictEqual(beforeRenderCount++, 2);
					return () => {
						const rendered = renderFunction();
						properties.bar = 'foo';
						return v('qux', properties, [rendered]);
					};
				}
			}

			class ExtendedTestWidget extends TestWidget {
				@beforeRender()
				thirdAfterRender(renderFunction: RenderFunction, properties: any, children: DNode[]): RenderFunction {
					assert.strictEqual(beforeRenderCount, 3);
					return renderFunction;
				}

				render() {
					return v('foo', this.children);
				}
			}

			const widget = new ExtendedTestWidget();
			widget.__setChildren__([v('baz', { baz: 'qux' })]);
			widget.__setProperties__({ foo: 'bar' });
			const qux: any = widget.__render__();
			assert.equal(qux.tag, 'qux');
			assert.equal(qux.properties.bar, 'foo');
			assert.equal(qux.properties.foo, 'bar');
			assert.lengthOf(qux.children, 1);
			const bar = qux.children[0];
			assert.equal(bar.tag, 'bar');
			assert.deepEqual(bar.properties.foo, 'bar');
			assert.lengthOf(bar.children, 2);
			const foo = bar.children[0];
			assert.equal(foo.tag, 'foo');
			assert.lengthOf(foo.children, 1);
			const baz1 = foo.children[0];
			assert.equal(baz1.tag, 'baz');
			assert.deepEqual(baz1.properties.baz, 'qux');
			assert.isUndefined(baz1.children);
			const baz2 = bar.children[1];
			assert.equal(baz2.tag, 'baz');
			assert.deepEqual(baz2.properties.baz, 'qux');
			assert.isUndefined(baz2.children);
		},
		'class level decorator'() {
			let beforeRenderCount = 0;

			@beforeRender(function(renderFunc: Render) {
				beforeRenderCount++;
				return renderFunc;
			})
			class TestWidget extends WidgetBase<any> {}

			const widget = new TestWidget();
			widget.__render__();
			assert.strictEqual(beforeRenderCount, 1);
		},
		'Use previous render function when a beforeRender does not return a function'() {
			class TestWidget extends WidgetBase {
				@beforeRender()
				protected firstBeforeRender(renderFunc: Render) {
					return () => 'first render';
				}

				@beforeRender()
				protected secondBeforeRender(renderFunc: Render) {}
			}

			const widget = new TestWidget();
			const renderResult = widget.__render__();
			assert.strictEqual(renderResult, 'first render');
			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(
				consoleStub.calledWith('Render function not returned from beforeRender, using previous render')
			);
		}
	}
});
