import compose from '@dojo/compose/compose';
import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import themeable, { Themeable, BaseClasses } from '../../../src/mixins/themeable';
import createWidgetBase from '../../../src/createWidgetBase';
import { v } from '../../../src/d';
import { Widget, WidgetProperties, DNode } from '../../../src/interfaces';
import { stub, SinonStub } from 'sinon';

const baseClassesClasses = {
	class1: 'baseClass1',
	class2: 'baseClass2'
};

const baseClasses: BaseClasses = {
	key: 'testPath',
	classes: baseClassesClasses
};

const testTheme1 = {
	testPath: {
		class1: 'theme1Class1'
	}
};

const testTheme2 = {
	testPath: {
		class1: 'theme2Class1'
	}
};

const testTheme3 = {
	testPath: {
		class1: 'testTheme3Class1 testTheme3AdjoinedClass1'
	}
};

const overrideClasses1 = {
	class1: 'override1Class1'
};

const overrideClasses2 = {
	class1: 'override2Class1'
};

const themeableFactory = compose({
	properties: <any> {},
	baseClasses
}, (instance, options: any) => {
	if (options) {
		instance.properties = options.properties;
	}
}).mixin(themeable);

let themeableInstance: Themeable;
let consoleStub: SinonStub;

registerSuite({
	name: 'themeManager',
	'classes function': {
		beforeEach() {
			consoleStub = stub(console, 'warn');
		},
		afterEach() {
			consoleStub.restore();
		},
		'should return baseClasses flagged classes via the classes function'() {
			themeableInstance = themeableFactory();
			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'should return negated classes for those that are not passed'() {
			themeableInstance = themeableFactory();
			const { class1 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false
			});

			assert.isFalse(consoleStub.called);
		},
		'should ignore any new classes that do not exist in the baseClasses and show console error'() {
			themeableInstance = themeableFactory();
			const { class1 } = baseClassesClasses;
			const newClassName = 'newClassName';
			const flaggedClasses = themeableInstance.classes(class1, newClassName).get();

			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false
			});

			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.firstCall.args[0].indexOf(newClassName) > -1);
		},
		'should split adjoined classes into multiple classes'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme3 }
			});

			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				testTheme3Class1: true,
				testTheme3AdjoinedClass1: true,
				[ baseClassesClasses.class2 ]: true
			});
		},
		'should remove adjoined classes when they are no longer provided'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme3 }
			});

			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme1
				},
				changedPropertyKeys: [ 'theme' ]
			});

			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				testTheme3Class1: false,
				testTheme3AdjoinedClass1: false,
				[ baseClassesClasses.class2 ]: true
			});
		}
	},
	'classes.fixed chained function': {
		'should work without any classes passed to first function'() {
			themeableInstance = themeableFactory();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: false,
				[ baseClassesClasses.class2 ]: false,
				[ fixedClassName ]: true
			});
		},
		'should pass through new classes'() {
			themeableInstance = themeableFactory();
			const { class1 } = baseClassesClasses;
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				[ fixedClassName ]: true
			});
		},
		'should negate any new classes that are not requested on second call'() {
			themeableInstance = themeableFactory();
			const { class1 } = baseClassesClasses;
			const fixedClassName = 'fixedClassName';
			const flaggedClassesFirstCall = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				[ fixedClassName ]: true
			}, `${fixedClassName} should be true on first call`);

			const flaggedClassesSecondCall = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				[ fixedClassName ]: false
			}, `${fixedClassName} should be false on second call`);
		},
		'should split adjoined fixed classes into multiple classes'() {
			themeableInstance = themeableFactory();
			const { class1 } = baseClassesClasses;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClasses = themeableInstance.classes(class1).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			});
		},
		'should remove adjoined fixed classes when they are no longer provided'() {
			themeableInstance = themeableFactory();
			const { class1 } = baseClassesClasses;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClassesFirstCall = themeableInstance.classes(class1).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			}, 'adjoined classed should both be true on first call');

			const flaggedClassesSecondCall = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseClassesClasses.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				'adjoinedClassName1': false,
				'adjoinedClassName2': false
			}, `adjoiend class names should be false on second call`);
		}
	},
	'setting a theme': {
		'should override basetheme classes with theme classes'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme1 }
			});
			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseClassesClasses.class2 ]: true
			});
		},
		'should negate old theme class when a new theme is set'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme1 }
			});
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'theme' ]
			});

			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: false,
				[ testTheme2.testPath.class1 ]: true,
				[ baseClassesClasses.class2 ]: true
			});
		},
		'will not regenerate theme classes if theme changed property is not set'() {
			themeableInstance = themeableFactory({
				properties: { theme: testTheme1 }
			});
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'id' ]
			});

			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseClassesClasses.class2 ]: true
			}, 'theme2 classes should not be present');
		}
	},
	'setting override classes': {
		'should supplement basetheme classes with override classes'() {
			themeableInstance = themeableFactory({
				properties: { overrideClasses: overrideClasses1 }
			});
			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: true,
				[ overrideClasses1.class1 ]: true,
				[ baseClassesClasses.class2 ]: true
			});
		},
		'should set override classes to false when they are changed'() {
			themeableInstance = themeableFactory({
				properties: { overrideClasses: overrideClasses1 }
			});
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					overrideClasses: overrideClasses2
				},
				changedPropertyKeys: [ 'overrideClasses' ]
			});

			const { class1, class2 } = baseClassesClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClassesClasses.class1 ]: true,
				[ overrideClasses1.class1 ]: false,
				[ overrideClasses2.class1 ]: true,
				[ baseClassesClasses.class2 ]: true
			});
		}
	},
	'integration': {
		'should work as mixin to createWidgetBase'() {
			type ThemeableWidget = Widget<WidgetProperties> & Themeable;

			const fixedClassName = 'fixedClassName';
			const createThemeableWidget = createWidgetBase.mixin(themeable).mixin({
				mixin: {
					baseClasses,
					getChildrenNodes(this: ThemeableWidget ): DNode[] {
						const { class1 } = baseClassesClasses;
						return [
							v('div', { classes: this.classes(class1).fixed(fixedClassName).get() })
						];
					}
				}
			});

			const themeableWidget: ThemeableWidget = createThemeableWidget({
				properties: { theme: testTheme1 }
			});

			const result = <VNode> themeableWidget.__render__();
			assert.deepEqual(result.children![0].properties!.classes, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				[ fixedClassName ]: true
			});

			themeableWidget.setProperties({ theme: testTheme2 });

			const result2 = <VNode> themeableWidget.__render__();
			assert.deepEqual(result2.children![0].properties!.classes, {
				[ testTheme1.testPath.class1 ]: false,
				[ testTheme2.testPath.class1 ]: true,
				[ baseClassesClasses.class2 ]: false,
				[ fixedClassName ]: true
			});
		}
	}
});
