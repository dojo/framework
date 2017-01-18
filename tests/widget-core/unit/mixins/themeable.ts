import compose from '@dojo/compose/compose';
import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import themeable, { Themeable } from '../../../src/mixins/themeable';
import createWidgetBase from '../../../src/createWidgetBase';
import { v } from '../../../src/d';
import { Widget, WidgetProperties, DNode } from '../../../src/interfaces';

const baseTheme = {
	class1: 'baseClass1',
	class2: 'baseClass2'
};

const testTheme = {
	class1: 'themeClass1'
};

const testTheme2 = {
	class2: 'theme2Class2'
};

const testTheme3 = {
	class1: 'theme3Class1'
};

const overrideClasses = {
	class2: 'overrideClass2'
};

const overrideClasses2 = {
	class2: 'override2Class2'
};

const themeableFactory = compose({
	properties: <any> {},
	baseTheme
}, (instance, options: any) => {
	if (options) {
		instance.properties = options.properties;
	}
}).mixin(themeable);

let themeableInstance: Themeable<typeof baseTheme>;

registerSuite({
	name: 'themeManager',
	'no theme': {
		beforeEach() {
			themeableInstance = themeableFactory();
		},
		'should return only base classes when no theme is set'() {
			assert.deepEqual(themeableInstance.theme, {
				class1: { [ baseTheme.class1 ]: true },
				class2: { [ baseTheme.class2 ]: true }
			});
		}
	},
	'with a theme': {
		beforeEach() {
			themeableInstance = themeableFactory({ properties: { theme: testTheme }});
		},
		'should return theme class instead of base class when a theme is set'() {
			assert.deepEqual(themeableInstance.theme, {
				class1: { [ testTheme.class1 ]: true },
				class2: { [ baseTheme.class2 ]: true }
			});
		},
		'should regenerate and negate class names on theme change'() {
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'theme' ]
			});
			assert.deepEqual(themeableInstance.theme, {
				class1: { [ baseTheme.class1 ]: true, [ testTheme.class1 ]: false },
				class2: { [ baseTheme.class2 ]: false, [ testTheme2.class2 ]: true }
			});
		}
	},
	'with overrides and a theme': {
		beforeEach() {
			themeableInstance = themeableFactory({ properties: {
				theme: testTheme,
				overrideClasses: overrideClasses
			}});
		},
		'should return override class as well as baseclass'() {
			assert.deepEqual(themeableInstance.theme, {
				class1: { [ testTheme.class1 ]: true },
				class2: { [ baseTheme.class2 ]: true, [ overrideClasses.class2 ]: true }
			});
		},
		'should regenerate class names on overrides change'() {
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme,
					overrideClasses: overrideClasses2
				},
				changedPropertyKeys: [ 'overrideClasses' ]
			});
			assert.deepEqual(themeableInstance.theme, {
				class1: { [ testTheme.class1 ]: true },
				class2: { [ baseTheme.class2 ]: true, [ overrideClasses.class2 ]: false, [ overrideClasses2.class2 ]: true }
			});
		},
		'should regenerate class names on theme and overrides change'() {
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2,
					overrideClasses: overrideClasses2
				},
				changedPropertyKeys: [ 'theme', 'overrideClasses' ]
			});
			assert.deepEqual(themeableInstance.theme, {
				class1: { [ baseTheme.class1 ]: true, [ testTheme.class1 ]: false },
				class2: {
					[ testTheme2.class2 ]: true,
					[ baseTheme.class2 ]: false,
					[ overrideClasses.class2 ]: false,
					[ overrideClasses2.class2 ]: true
				}
			});
		}
	},
	'should only negate each class once'() {
		themeableInstance = themeableFactory();

		const theme1 = { class1: 'firstChange' };
		const theme2 = { class1: 'secondChange' };
		let themeClasses = themeableInstance.theme;

		assert.deepEqual(themeableInstance.theme.class1, {
			[ baseTheme.class1 ]: true
		}, 'should have base theme set to true');

		themeableInstance.emit({
			type: 'properties:changed',
			properties: { theme: theme1 },
			changedPropertyKeys: [ 'theme' ]
		});
		themeClasses = themeableInstance.theme;

		assert.deepEqual(themeableInstance.theme.class1, {
			[ baseTheme.class1 ]: false,
			[ theme1.class1 ]: true
		}, 'should have base theme set to false and theme1 class1 set to true');

		themeableInstance.emit({
			type: 'properties:changed',
			properties: { theme: theme2 },
			changedPropertyKeys: [ 'theme' ]
		});
		themeClasses = themeableInstance.theme;

		assert.deepEqual(themeableInstance.theme.class1, {
			[ theme1.class1 ]: false,
			[ theme2.class1 ]: true
		}, 'should have theme1 class1 set to false and theme2 class1 set to true');
	},
	'properties changing outside of the scope of theme should not change theme'() {
		themeableInstance = themeableFactory();
		const themeBeforeEmit = themeableInstance.theme;

		themeableInstance.emit({
			type: 'properties:changed',
			properties: {
				hello: 'world'
			},
			changedPropertyKeys: [ 'hello' ]
		});

		const themeAfterEmit = themeableInstance.theme;
		assert.strictEqual(themeBeforeEmit, themeAfterEmit);
	},
	integration: {
		'should work as mixin to createWidgetBase'() {
			type ThemeableWidget = Widget<WidgetProperties> & Themeable<typeof baseTheme>;

			const createThemeableWidget = createWidgetBase.mixin(themeable).mixin({
				mixin: {
					baseTheme,
					getChildrenNodes(this: ThemeableWidget ): DNode[] {
						return [
							v('div', { classes: this.theme.class1 })
						];
					}
				}
			});

			const themeableWidget: ThemeableWidget = createThemeableWidget({
				properties: { theme: testTheme }
			});

			const result = <VNode> themeableWidget.__render__();
			assert.deepEqual(result.children![0].properties!.classes, { [ testTheme.class1 ]: true });

			themeableWidget.setProperties({ theme: testTheme3 });

			const result2 = <VNode> themeableWidget.__render__();
			assert.deepEqual(result2.children![0].properties!.classes, { [ testTheme.class1 ]: false, [ testTheme3.class1 ]: true });
		}
	}
});
