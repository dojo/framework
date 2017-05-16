import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import {
	ThemeableMixin,
	theme,
	ThemeableProperties,
	INJECTED_THEME_KEY,
	ThemeInjector,
	ThemeInjectorContext,
	registerThemeInjector
} from '../../../src/mixins/Themeable';
import { Injector } from './../../../src/Injector';
import { WidgetBase } from '../../../src/WidgetBase';
import { WidgetRegistry } from '../../../src/WidgetRegistry';
import { WidgetProperties } from '../../../src/interfaces';
import { RegistryMixin } from './../../../src/mixins/Registry';
import { v, w, registry } from '../../../src/d';
import { stub, SinonStub } from 'sinon';

import * as baseThemeClasses1 from './../../support/styles/testWidget1.css';
import * as baseThemeClasses2 from './../../support/styles/testWidget2.css';
import * as baseThemeClasses3 from './../../support/styles/baseTheme3.css';
import * as extraClasses1 from './../../support/styles/extraClasses1.css';
import * as extraClasses2 from './../../support/styles/extraClasses2.css';
import testTheme1 from './../../support/styles/theme1.css';
import testTheme2 from './../../support/styles/theme2.css';
import testTheme3 from './../../support/styles/theme3.css';

(<any> baseThemeClasses1)[' _key'] = 'testPath1';
(<any> baseThemeClasses2)[' _key'] = 'testPath2';
(<any> baseThemeClasses3)[' _key'] = 'testPath3';

let testRegistry: WidgetRegistry;

@theme(baseThemeClasses1)
class TestWidget extends RegistryMixin(ThemeableMixin(WidgetBase))<ThemeableProperties & { registry?: any }> { }

@theme(baseThemeClasses2)
class SubClassTestWidget extends TestWidget { }

@theme(baseThemeClasses1)
@theme(baseThemeClasses2)
class StackedTestWidget extends ThemeableMixin(WidgetBase)<ThemeableProperties> { }

@theme(baseThemeClasses3)
@theme(baseThemeClasses1)
class DuplicateThemeClassWidget extends ThemeableMixin(WidgetBase)<ThemeableProperties> { }

class NonDecoratorDuplicateThemeClassWidget extends ThemeableMixin(WidgetBase)<ThemeableProperties> {
	constructor() {
		super();
		theme(baseThemeClasses1)(this);
		theme(baseThemeClasses3)(this);
	}
}

let themeableInstance: TestWidget;
let consoleStub: SinonStub;

registerSuite({
	name: 'themeManager',
	beforeEach() {
		testRegistry = new WidgetRegistry();
		consoleStub = stub(console, 'warn');
	},
	afterEach() {
		consoleStub.restore();
	},
	'classes function': {
		'should return baseThemeClasses1 flagged classes via the classes function'() {
			themeableInstance = new TestWidget();
			const { class1, class2 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'should return negated classes for those that are not passed'() {
			themeableInstance = new TestWidget();
			const { class1 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'should ignore any new classes that do not exist in the baseThemeClasses1 and show console error'() {
			themeableInstance = new TestWidget();
			const { class1 } = baseThemeClasses1;
			const newClassName = 'newClassName';
			const flaggedClasses = themeableInstance.classes(class1, newClassName).get();

			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true
			});

			assert.isTrue(consoleStub.calledOnce);
			assert.strictEqual(consoleStub.firstCall.args[0], `Class name: ${newClassName} not found, use chained 'fixed' method instead`);
		},
		'should split adjoined classes into multiple classes'() {
			themeableInstance = new TestWidget();
			themeableInstance.__setProperties__({ theme: testTheme3 });
			const { class1, class2 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				testTheme3Class1: true,
				testTheme3AdjoinedClass1: true,
				[ baseThemeClasses1.class2 ]: true
			});
		},
		'should remove adjoined classes when they are no longer provided'() {
			const { class1, class2 } = baseThemeClasses1;
			themeableInstance = new TestWidget();
			themeableInstance.__setProperties__({ theme: testTheme3 });
			let flaggedClasses = themeableInstance.classes(class1, class2).get();
			themeableInstance.__setProperties__({ theme: testTheme1 });
			flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: true,
				testTheme3Class1: false,
				testTheme3AdjoinedClass1: false,
				[ baseThemeClasses1.class2 ]: true
			});
		},
		'should filter out null params passed to classes function'() {
			themeableInstance = new TestWidget();
			const { class1, class2 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1, null, class2, null).get();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'can invoke result instead of using .get()'() {
			themeableInstance = new TestWidget();
			const { class1, class2 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2)();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			});

			assert.isFalse(consoleStub.called);
		},
		'class function is lazily evaluated'() {
			themeableInstance = new TestWidget();
			const { class1, class2 } = baseThemeClasses1;
			const firstClasses = themeableInstance.classes(class1);
			const secondClasses = themeableInstance.classes(class2);

			assert.deepEqual(secondClasses(), {
				[ baseThemeClasses1.class2 ]: true
			});

			assert.deepEqual(firstClasses(), {
				[ baseThemeClasses1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: false
			});

			assert.isFalse(consoleStub.called);
		}
	},
	'classes.fixed chained function': {
		'should work without any classes passed to first function'() {
			themeableInstance = new TestWidget();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ fixedClassName ]: true
			});
		},
		'should pass through new classes'() {
			themeableInstance = new TestWidget();
			const { class1 } = baseThemeClasses1;
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true,
				[ fixedClassName ]: true
			});
		},
		'should filter out null params passed to fixed function'() {
			themeableInstance = new TestWidget();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName, null).get();
			assert.deepEqual(flaggedClasses, {
				[ fixedClassName ]: true
			});
		},
		'should negate any new classes that are not requested on second call'() {
			themeableInstance = new TestWidget();
			const { class1 } = baseThemeClasses1;
			const fixedClassName = 'fixedClassName';
			const flaggedClassesFirstCall = themeableInstance.classes(class1).fixed(fixedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseThemeClasses1.class1 ]: true,
				[ fixedClassName ]: true
			}, `${fixedClassName} should be true on first call`);

			const flaggedClassesSecondCall = themeableInstance.classes(class1).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseThemeClasses1.class1 ]: true,
				[ fixedClassName ]: false
			}, `${fixedClassName} should be false on second call`);
		},
		'should split adjoined fixed classes into multiple classes'() {
			themeableInstance = new TestWidget();
			const { class1 } = baseThemeClasses1;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClasses = themeableInstance.classes(class1).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			});
		},
		'should remove adjoined fixed classes when they are no longer provided'() {
			themeableInstance = new TestWidget();
			const { class1, class2 } = baseThemeClasses1;
			const adjoinedClassName = 'adjoinedClassName1 adjoinedClassName2';
			const flaggedClassesFirstCall = themeableInstance.classes(class1, class2).fixed(adjoinedClassName).get();
			assert.deepEqual(flaggedClassesFirstCall, {
				[ baseThemeClasses1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true,
				'adjoinedClassName1': true,
				'adjoinedClassName2': true
			}, 'adjoined classed should both be true on first call');

			const flaggedClassesSecondCall = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClassesSecondCall, {
				[ baseThemeClasses1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true,
				'adjoinedClassName1': false,
				'adjoinedClassName2': false
			}, `adjoiend class names should be false on second call`);
		},
		'can invoke result instead of using .get()'() {
			themeableInstance = new TestWidget();
			const fixedClassName = 'fixedClassName';
			const flaggedClasses = themeableInstance.classes().fixed(fixedClassName)();
			assert.deepEqual(flaggedClasses, {
				[ fixedClassName ]: true
			});
		}
	},
	'setting a theme': {
		'should override basetheme classes with theme classes'() {
			themeableInstance = new TestWidget();
			themeableInstance.__setProperties__({ theme: testTheme1 });
			const { class1, class2 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			});
		},
		'should negate old theme class when a new theme is set'() {
			const { class1, class2 } = baseThemeClasses1;
			themeableInstance = new TestWidget();
			themeableInstance.__setProperties__({ theme: testTheme1 });
			themeableInstance.classes(class1).get();
			themeableInstance.__setProperties__({ theme: testTheme2 });

			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: false,
				[ testTheme2.testPath1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			});
		},
		'will not regenerate theme classes if theme changed property is not set'() {
			themeableInstance = new TestWidget();
			themeableInstance.__setProperties__({ theme: testTheme1 });
			themeableInstance.emit({
				type: 'properties:changed',
				properties: {
					theme: testTheme2
				},
				changedPropertyKeys: [ 'id' ]
			});

			const { class1, class2 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ testTheme1.testPath1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			}, 'theme2 classes should not be present');
		}
	},
	'setting override classes': {
		'should supplement basetheme classes with override classes'() {
			themeableInstance = new TestWidget();
			themeableInstance.__setProperties__({ extraClasses: extraClasses1 });
			const { class1, class2 } = baseThemeClasses1;
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true,
				[ extraClasses1.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			});
		},
		'should set override classes to false when they are changed'() {
			const { class1, class2 } = baseThemeClasses1;
			themeableInstance = new TestWidget();
			themeableInstance.__setProperties__({ extraClasses: extraClasses1 });
			themeableInstance.classes(class1, class2).get();
			themeableInstance.__setProperties__({ extraClasses: extraClasses2 });
			const flaggedClasses = themeableInstance.classes(class1, class2).get();
			assert.deepEqual(flaggedClasses, {
				[ baseThemeClasses1.class1 ]: true,
				[ extraClasses1.class1 ]: false,
				[ extraClasses2.class1 ]: true,
				[ baseThemeClasses1.class2 ]: true
			});
		}
	},
	'setting base theme classes': {
		'decorator': {
			'Themes get inerited from base classes and merged into the available classes'() {
				const { class1, class2 } = baseThemeClasses1;
				const { class3, class4 } = baseThemeClasses2;
				themeableInstance = new SubClassTestWidget();
				const flaggedClasses = themeableInstance.classes(class1, class2, class3, class4).get();
				assert.deepEqual(flaggedClasses, {
					[ class1 ]: true,
					[ class2 ]: true,
					[ class3 ]: true,
					[ class4 ]: true
				});
			},
			'Stacked themes get merged into the available classes'() {
				const { class1, class2 } = baseThemeClasses1;
				const { class3, class4 } = baseThemeClasses2;
				themeableInstance = new StackedTestWidget();
				const flaggedClasses = themeableInstance.classes(class1, class2, class3, class4).get();
				assert.deepEqual(flaggedClasses, {
					[ class1 ]: true,
					[ class2 ]: true,
					[ class3 ]: true,
					[ class4 ]: true
				});
			},
			'warns on clashing class names and uses the latest applied'() {
				const { class1, class2 } = baseThemeClasses1;
				const { class1: duplicateClass1 } = baseThemeClasses3;
				themeableInstance = new DuplicateThemeClassWidget();
				const flaggedClasses = themeableInstance.classes(class1, class2).get();
				assert.deepEqual(flaggedClasses, {
					[ duplicateClass1 ]: true,
					[ class2 ]: true
				});
				assert.isTrue(consoleStub.called);
				assert.strictEqual(consoleStub.firstCall.args[0], `Duplicate base theme class key 'class1' detected, this could cause unexpected results`);
			}
		},
		'non decorator': {
			'Themes get inerited from base classes and merged into the available classes'() {
				const { class1, class2 } = baseThemeClasses1;
				const { class3, class4 } = baseThemeClasses2;
				themeableInstance = new SubClassTestWidget();
				const flaggedClasses = themeableInstance.classes(class1, class2, class3, class4).get();
				assert.deepEqual(flaggedClasses, {
					[ class1 ]: true,
					[ class2 ]: true,
					[ class3 ]: true,
					[ class4 ]: true
				});
			},
			'Stacked themes get merged into the available classes'() {
				const { class1, class2 } = baseThemeClasses1;
				const { class3, class4 } = baseThemeClasses2;
				themeableInstance = new StackedTestWidget();
				const flaggedClasses = themeableInstance.classes(class1, class2, class3, class4).get();
				assert.deepEqual(flaggedClasses, {
					[ class1 ]: true,
					[ class2 ]: true,
					[ class3 ]: true,
					[ class4 ]: true
				});
			},
			'warns on clashing class names and uses the latest applied'() {
				const { class1, class2 } = baseThemeClasses1;
				const { class1: duplicateClass1 } = baseThemeClasses3;
				themeableInstance = new NonDecoratorDuplicateThemeClassWidget();
				const flaggedClasses = themeableInstance.classes(class1, class2).get();
				assert.deepEqual(flaggedClasses, {
					[ duplicateClass1 ]: true,
					[ class2 ]: true
				});
				assert.isTrue(consoleStub.called);
				assert.strictEqual(consoleStub.firstCall.args[0], `Duplicate base theme class key 'class1' detected, this could cause unexpected results`);
			}
		}
	},
	'injecting a theme': {
		'theme can be injected by defining a ThemeInjector with registry'() {
			const themeInjectorContext = new ThemeInjectorContext(testTheme1);
			const InjectorBase = Injector(ThemeInjector, themeInjectorContext);
			testRegistry.define(INJECTED_THEME_KEY, InjectorBase);
			class InjectedTheme extends TestWidget {
				render() {
					return v('div', { classes: this.classes(baseThemeClasses1.class1) });
				}
			}
			themeableInstance = new InjectedTheme();
			themeableInstance.__setProperties__({ registry: testRegistry });
			const vNode: any = themeableInstance.__render__();
			assert.deepEqual(vNode.properties.classes, { theme1Class1: true });
		},
		'theme will not be injected if a theme has been passed via a property'() {
			const themeInjectorContext = new ThemeInjectorContext(testTheme1);
			const InjectorBase = Injector(ThemeInjector, themeInjectorContext);
			testRegistry.define(INJECTED_THEME_KEY, InjectorBase);
			class InjectedTheme extends TestWidget {
				render() {
					return v('div', { classes: this.classes(baseThemeClasses1.class1) });
				}
			}
			themeableInstance = new InjectedTheme();
			themeableInstance.__setProperties__({ theme: testTheme2, registry: testRegistry });
			const vNode: any = themeableInstance.__render__();
			assert.deepEqual(vNode.properties.classes, { theme2Class1: true });
		},
		'does not attempt to inject if the ThemeInjector has not been defined in the registry'() {
			class InjectedTheme extends TestWidget {
				render() {
					return v('div', { classes: this.classes(baseThemeClasses1.class1) });
				}

			}
			themeableInstance = new InjectedTheme();
			const vNode: any = themeableInstance.__render__();
			assert.deepEqual(vNode.properties.classes, { baseClass1: true });
		},
		'setting the theme invalidates all "Themeable" widgets and the new theme is used'() {
			const themeInjectorContext = registerThemeInjector(testTheme1, testRegistry);
			let invalidateCallCount = 0;
			class InjectedTheme extends TestWidget {
				render() {
					return v('div', { classes: this.classes(baseThemeClasses1.class1) });
				}

				invalidate() {
					invalidateCallCount++;
					super.invalidate();
				}
			}

			class MultipleThemedWidgets extends RegistryMixin(WidgetBase)<WidgetProperties & { registry: any }> {
				render() {
					return v('div', [
						w(InjectedTheme, { key: '1', registry: this.properties.registry }),
						w(InjectedTheme, { key: '2', registry: this.properties.registry })
					]);
				}
			}

			const testWidget = new MultipleThemedWidgets();
			testWidget.__setProperties__({ registry: testRegistry });
			let vNode: any = testWidget.__render__();
			assert.lengthOf(vNode.children, 2);
			assert.deepEqual(vNode.children[0].properties.classes, { theme1Class1: true });
			assert.deepEqual(vNode.children[1].properties.classes, { theme1Class1: true });
			assert.strictEqual(invalidateCallCount, 0);
			themeInjectorContext.set(testTheme2);
			vNode = testWidget.__render__();
			assert.lengthOf(vNode.children, 2);
			assert.deepEqual(vNode.children[0].properties.classes, { theme1Class1: false, theme2Class1: true });
			assert.deepEqual(vNode.children[1].properties.classes, { theme1Class1: false, theme2Class1: true });
			assert.strictEqual(invalidateCallCount, 2);
			themeInjectorContext.set(testTheme1);
			vNode = testWidget.__render__();
			assert.lengthOf(vNode.children, 2);
			assert.deepEqual(vNode.children[0].properties.classes, { theme2Class1: false, theme1Class1: true });
			assert.deepEqual(vNode.children[1].properties.classes, { theme2Class1: false, theme1Class1: true });
			assert.strictEqual(invalidateCallCount, 4);
		},
		'registerThemeInjector defaults to the global registry'() {
			assert.isNull(registry.get(INJECTED_THEME_KEY));
			registerThemeInjector(testTheme1);
			assert.isOk(registry.get(INJECTED_THEME_KEY));
		}
	},
	'integration': {
		'should work as mixin to createWidgetBase'() {
			const fixedClassName = 'fixedClassName';

			class IntegrationTest extends TestWidget {
				constructor() {
					super();
				}

				render() {
					const { class1 } = baseThemeClasses1;
					return v('div', [
						v('div', { classes: this.classes(class1).fixed(fixedClassName) })
					]);
				}
			}

			const themeableWidget: any = new IntegrationTest();
			themeableWidget.__setProperties__({ theme: testTheme1 });

			const result = <VNode> themeableWidget.__render__();
			assert.deepEqual(result.children![0].properties!.classes, {
				[ testTheme1.testPath1.class1 ]: true,
				[ fixedClassName ]: true
			});

			themeableWidget.__setProperties__({ theme: testTheme2 });

			const result2 = <VNode> themeableWidget.__render__();
			assert.deepEqual(result2.children![0].properties!.classes, {
				[ testTheme1.testPath1.class1 ]: false,
				[ testTheme2.testPath1.class1 ]: true,
				[ fixedClassName ]: true
			});
		}
	}
});
