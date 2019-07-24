const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import { PropertyChangeRecord } from './../../../../src/core/interfaces';
import { always, ignore } from './../../../../src/core/diff';
import { diffProperty } from './../../../../src/core/decorators/diffProperty';
import { WidgetBase } from './../../../../src/core/WidgetBase';
import { widgetInstanceMap } from './../../../../src/core/vdom';

interface TestProperties {
	id?: string;
	foo: string;
}

registerSuite('decorators/diffProperty', {
	decorator: {
		'diff with no reaction'() {
			let callCount = 0;
			function diffFoo(previousProperty: any, newProperty: any) {
				callCount++;
				assert.equal(newProperty, 'bar');
				return {
					changed: true,
					value: newProperty
				};
			}

			@diffProperty('foo', diffFoo)
			@diffProperty('bar', diffFoo)
			class TestWidget extends WidgetBase<TestProperties> {}

			const testWidget = new TestWidget();

			testWidget.__setProperties__({ id: '', foo: 'bar' });
			assert.equal(callCount, 1);
		},
		'diff property with default diff'() {
			let callCount = 0;

			class TestWidget extends WidgetBase<TestProperties> {
				@diffProperty('foo')
				protected reaction() {
					callCount++;
				}
			}

			const testWidget = new TestWidget();

			testWidget.__setProperties__({ id: '', foo: 'bar' });
			assert.equal(callCount, 1);
			testWidget.__setProperties__({ id: '', foo: 'bar' });
			assert.equal(callCount, 1);
			testWidget.__setProperties__({ id: '', foo: 'foo' });
			assert.equal(callCount, 2);
		},
		'diff with reaction': {
			'reaction does not execute if no registered properties are changed'() {
				let callCount = 0;
				function customDiff(previousProperty: any, newProperty: any) {
					callCount++;
					return {
						changed: false,
						value: newProperty
					};
				}

				class TestWidget extends WidgetBase<TestProperties> {
					reactionCalled = false;

					@diffProperty('foo', customDiff)
					@diffProperty('id', customDiff)
					protected onFooOrBarChanged(): void {
						this.reactionCalled = true;
					}
				}
				const testWidget = new TestWidget();
				testWidget.__setProperties__({ id: '', foo: 'bar' });
				assert.strictEqual(callCount, 2);
				assert.isFalse(testWidget.reactionCalled);
			},
			'reaction executed when at least one registered properties is changed'() {
				let callCount = 0;
				function customDiff(previousProperty: any, newProperty: any) {
					callCount++;
					return {
						changed: newProperty === 'bar' ? true : false,
						value: newProperty
					};
				}

				class TestWidget extends WidgetBase<TestProperties> {
					callCount = 0;

					@diffProperty('foo', customDiff)
					@diffProperty('id', customDiff)
					protected onFooOrBarChanged(previousProperties: any, currentProperties: any): void {
						assert.isEmpty(previousProperties);
						assert.deepEqual(currentProperties, { id: '', foo: 'bar' });
						this.callCount++;
					}
				}
				const testWidget = new TestWidget();
				testWidget.__setProperties__({ id: '', foo: 'bar' });
				assert.strictEqual(callCount, 2);
				assert.strictEqual(testWidget.callCount, 1);
			}
		}
	},
	'non decorator': {
		'diff with no reaction'() {
			let callCount = 0;

			function diffPropertyFoo(previousProperty: string, newProperty: string): PropertyChangeRecord {
				callCount++;
				assert.equal(newProperty, 'bar');
				return {
					changed: false,
					value: newProperty
				};
			}

			class TestWidget extends WidgetBase<TestProperties> {
				constructor() {
					super();
					diffProperty('foo', diffPropertyFoo)(this);
				}
			}

			const testWidget = new TestWidget();
			testWidget.__setProperties__({ id: '', foo: 'bar' });
			assert.equal(callCount, 1);
		},
		'diff with reaction': {
			'reaction does not execute if no registered properties are changed'() {
				let callCount = 0;

				function diffPropertyFoo(previousProperty: string, newProperty: string): PropertyChangeRecord {
					callCount++;
					assert.equal(newProperty, 'bar');
					return {
						changed: false,
						value: newProperty
					};
				}

				class TestWidget extends WidgetBase<TestProperties> {
					reactionCalled = false;
					constructor() {
						super();
						diffProperty('foo', diffPropertyFoo, this.onFooPropertyChanged)(this);
					}

					onFooPropertyChanged(previousProperties: any, newProperties: any): void {
						this.reactionCalled = true;
					}
				}

				const testWidget = new TestWidget();
				testWidget.__setProperties__({ id: '', foo: 'bar' });
				assert.equal(callCount, 1);
				assert.isFalse(testWidget.reactionCalled);
			},
			'reaction executed when at least one registered properties is changed'() {
				let callCount = 0;

				function customDiffProperty(previousProperty: string, newProperty: string): PropertyChangeRecord {
					callCount++;
					return {
						changed: newProperty === 'bar' ? true : false,
						value: newProperty
					};
				}

				class TestWidget extends WidgetBase<TestProperties> {
					reactionCalled = false;
					constructor() {
						super();
						diffProperty('foo', customDiffProperty, this.onPropertyChanged)(this);
						diffProperty('id', customDiffProperty, this.onPropertyChanged)(this);
					}

					onPropertyChanged(previousProperties: any, newProperties: any): void {
						this.reactionCalled = true;
					}
				}

				const testWidget = new TestWidget();
				testWidget.__setProperties__({ id: '', foo: 'bar' });
				assert.equal(callCount, 2);
				assert.isTrue(testWidget.reactionCalled);
			}
		}
	},
	'multiple default decorators on the same method cause the first matching decorator to win'() {
		@diffProperty('foo', ignore)
		class TestWidget extends WidgetBase<TestProperties> {}

		@diffProperty('foo', always)
		class SubWidget extends TestWidget {}

		const widget = new SubWidget();
		const renderResult = widget.__render__();

		widget.__setProperties__({
			foo: 'bar'
		});

		assert.notStrictEqual(renderResult, widget.__render__());
	},
	'multiple custom decorators on the same method cause the first matching decorator to win'() {
		const calls: string[] = [];

		function diff1(prevProp: any, newProp: any): PropertyChangeRecord {
			calls.push('diff1');
			return {
				changed: false,
				value: newProp
			};
		}

		function diff2(prevProp: any, newProp: any): PropertyChangeRecord {
			calls.push('diff2');
			return {
				changed: false,
				value: newProp
			};
		}

		@diffProperty('foo', diff1)
		class TestWidget extends WidgetBase<TestProperties> {}

		@diffProperty('foo', diff2)
		class SubWidget extends TestWidget {}

		const widget = new SubWidget();
		widget.__setProperties__({
			id: '',
			foo: 'bar'
		});

		assert.deepEqual(calls, ['diff1', 'diff2']);
		assert.strictEqual(calls[0], 'diff1');
		assert.strictEqual(calls[1], 'diff2');
	},

	'diffProperty properties are excluded from catch-all'() {
		function customDiff() {
			return {
				changed: false,
				value: ''
			};
		}
		@diffProperty('foo', customDiff)
		@diffProperty('id', customDiff)
		class TestWidget extends WidgetBase<TestProperties> {}

		const widget = new TestWidget();
		widget.__render__();
		widget.__setProperties__({
			foo: '',
			id: ''
		});
		assert.isFalse(widgetInstanceMap.get(widget)!.dirty);
	},

	'properties that are deleted dont get returned'() {
		const widget = new WidgetBase<any>();
		widget.__setProperties__({
			a: 1,
			b: 2,
			c: 3
		});

		assert.deepEqual(widget.properties, { a: 1, b: 2, c: 3 });

		widget.__setProperties__({
			a: 4,
			c: 5
		});

		assert.deepEqual(widget.properties, { a: 4, c: 5 });
	}
});
