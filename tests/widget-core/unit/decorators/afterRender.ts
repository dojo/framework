const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import { DNode } from './../../../src/interfaces';
import { afterRender } from './../../../src/decorators/afterRender';
import { WidgetBase } from './../../../src/WidgetBase';

registerSuite('decorators/afterRender', {
	decorator() {
		let afterRenderCount = 1;
		class TestWidget extends WidgetBase<any> {
			@afterRender()
			firstAfterRender(result: DNode): DNode {
				assert.strictEqual(afterRenderCount++, 1);
				return result;
			}

			@afterRender()
			secondAfterRender(result: DNode): DNode {
				assert.strictEqual(afterRenderCount++, 2);
				return result;
			}
		}

		class ExtendedTestWidget extends TestWidget {
			@afterRender()
			thirdAfterRender(result: DNode): DNode {
				assert.strictEqual(afterRenderCount, 3);
				return result;
			}
		}

		const widget = new ExtendedTestWidget();
		widget.__render__();
		assert.strictEqual(afterRenderCount, 3);
	},
	'non decorator'() {
		let afterRenderCount = 1;
		class TestWidget extends WidgetBase<any> {
			constructor() {
				super();
				afterRender()(this, 'firstAfterRender');
				afterRender()(this, 'secondAfterRender');
			}

			firstAfterRender(result: DNode): DNode {
				assert.strictEqual(afterRenderCount++, 1);
				return result;
			}

			secondAfterRender(result: DNode): DNode {
				assert.strictEqual(afterRenderCount++, 2);
				return result;
			}
		}

		class ExtendedTestWidget extends TestWidget {
			constructor() {
				super();
				afterRender(this.thirdAfterRender)(this);
			}

			thirdAfterRender(result: DNode): DNode {
				assert.strictEqual(afterRenderCount, 3);
				return result;
			}
		}

		const widget = new ExtendedTestWidget();
		widget.__render__();
		assert.strictEqual(afterRenderCount, 3);
	},
	'class level decorator'() {
		let afterRenderCount = 0;

		@afterRender(function(node: any) {
			afterRenderCount++;
			return node;
		})
		class TestWidget extends WidgetBase<any> {}

		const widget = new TestWidget();
		widget.__render__();
		assert.strictEqual(afterRenderCount, 1);
	},
	'class level without decorator'() {
		let afterRenderCount = 0;

		function afterRenderFn(node: any) {
			afterRenderCount++;

			return node;
		}

		class TestWidget extends WidgetBase<any> {
			constructor() {
				super();
				afterRender(afterRenderFn)(this);
			}
		}

		const widget = new TestWidget();
		widget.__render__();
		assert.strictEqual(afterRenderCount, 1);
	}
});
