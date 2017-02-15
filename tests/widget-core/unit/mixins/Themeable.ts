import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { ThemeableMixin, theme, ThemeableProperties } from '../../../src/mixins/Themeable';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { stub, SinonStub } from 'sinon';

const baseClasses = {
	[' _key']: 'testPath',
	class1: 'baseClass1',
	class2: 'baseClass2'
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

@theme(baseClasses)
class Test extends ThemeableMixin(WidgetBase)<ThemeableProperties> { }

let themeableInstance: Test;
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
			themeableInstance = new Test();
			const { class1, class2 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'should return negated classes for those that are not passed'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false
			});

			assert.isFalse(consoleStub.called);
		},
		'should ignore any new classes that do not exist in the baseClasses and show console error'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses;
			const newClassName = 'newClassName';
			const flaggedClasses = themeableInstance.classes(class1, newClassName).get();

			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false
			});

			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.firstCall.args[0].indexOf(newClassName) > -1);
		},
		'should split adjoined classes into multiple classes'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme3 });
			const { class1, class2 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				testTheme3Class1: true,
				testTheme3AdjoinedClass1: true,
				[ baseClasses.class2 ]: true
			});
		},
		'should remove adjoined classes when they are no longer provided'() {
			const { class1, class2 } = baseClasses;
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme3 });
			let flaggedClasses = themeableInstance.classes(class1, class2).get();
			themeableInstance.setProperties({ theme: testTheme1 });
			flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				testTheme3Class1: false,
				testTheme3AdjoinedClass1: false,
				[ baseClasses.class2 ]: true
			});
		},
		'should filter out null params passed to classes function'() {
			themeableInstance = new Test();
			const { class1, class2 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2, null).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		}
	},
	'classes.fixed chained function': {
		'should work without any classes passed to first function'() {
			themeableInstance = new Test();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: false,
				[ baseClasses.class2 ]: false,
				[ fixedClassName ]: true
			});
		},
		'should pass through new classes'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses;
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false,
				[ fixedClassName ]: true
			});
		},
		'should filter out null params passed to fixed function'() {
			themeableInstance = new Test();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName, null).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: false,
				[ baseClasses.class2 ]: false,
				[ fixedClassName ]: true
			});
		},
		'should negate any new classes that are not requested on second call'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses;
			const fixedClassName = 'fixedClassName';
			const flaggedClassesFirstCall = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false,
				[ fixedClassName ]: true
			}, `${fixedClassName} should be true on first call`);

			const flaggedClassesSecondCall = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false,
				[ fixedClassName ]: false
			}, `${fixedClassName} should be false on second call`);
		},
		'should split adjoined fixed classes into multiple classes'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClasses = themeableInstance.classes(class1).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			});
		},
		'should remove adjoined fixed classes when they are no longer provided'() {
			themeableInstance = new Test();
			const { class1 } = baseClasses;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClassesFirstCall = themeableInstance.classes(class1).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			}, 'adjoined classed should both be true on first call');

			const flaggedClassesSecondCall = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseClasses.class1 ]: true,
				[ baseClasses.class2 ]: false,
				'adjoinedClassName1': false,
				'adjoinedClassName2': false
			}, `adjoiend class names should be false on second call`);
		}
	},
	'setting a theme': {
		'should override basetheme classes with theme classes'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme1 });
			const { class1, class2 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseClasses.class2 ]: true
			});
		},
		'should negate old theme class when a new theme is set'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme1 });
			themeableInstance.classes().get();
			themeableInstance.setProperties({ theme: testTheme2 });

			const { class1, class2 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: false,
				[ testTheme2.testPath.class1 ]: true,
				[ baseClasses.class2 ]: true
			});
		},
		'will not regenerate theme classes if theme changed property is not set'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ theme: testTheme1 });
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'id' ]
			});

			const { class1, class2 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseClasses.class2 ]: true
			}, 'theme2 classes should not be present');
		}
	},
	'setting override classes': {
		'should supplement basetheme classes with override classes'() {
			themeableInstance = new Test();
			themeableInstance.setProperties({ overrideClasses: overrideClasses1 });
			const { class1, class2 } = baseClasses;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ overrideClasses1.class1 ]: true,
				[ baseClasses.class2 ]: true
			});
		},
		'should set override classes to false when they are changed'() {
			const { class1, class2 } = baseClasses;
			themeableInstance = new Test();
			themeableInstance.setProperties({ overrideClasses: overrideClasses1 });
			themeableInstance.classes(class1, class2).get();
			themeableInstance.setProperties({ overrideClasses: overrideClasses2 });
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseClasses.class1 ]: true,
				[ overrideClasses1.class1 ]: false,
				[ overrideClasses2.class1 ]: true,
				[ baseClasses.class2 ]: true
			});
		}
	},
	'integration': {
		'should work as mixin to createWidgetBase'() {
			const fixedClassName = 'fixedClassName';

			@theme(baseClasses)
			class IntegrationTest extends Test {
				constructor() {
					super();
				}

				render() {
					const { class1 } = baseClasses;
					return v('div', [
						v('div', { classes: this.classes(class1).fixed(fixedClassName).get() })
					]);
				}
			}

			const themeableWidget: any = new IntegrationTest();
			themeableWidget.setProperties({ theme: testTheme1 });

			const result = <VNode> themeableWidget.__render__();
			assert.deepEqual(result.children![0].properties!.classes, {
				[ testTheme1.testPath.class1 ]: true,
				[ baseClasses.class2 ]: false,
				[ fixedClassName ]: true
			});

			themeableWidget.setProperties({ theme: testTheme2 });

			const result2 = <VNode> themeableWidget.__render__();
			assert.deepEqual(result2.children![0].properties!.classes, {
				[ testTheme1.testPath.class1 ]: false,
				[ testTheme2.testPath.class1 ]: true,
				[ baseClasses.class2 ]: false,
				[ fixedClassName ]: true
			});
		}
	}
});
