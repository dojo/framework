const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import {
	ThemedMixin,
	theme,
	INJECTED_THEME_KEY,
	registerThemeInjector
} from '../../../../src/widget-core/mixins/Themed';
import { WidgetBase } from '../../../../src/widget-core/WidgetBase';
import { Registry } from '../../../../src/widget-core/Registry';
import { v, w } from '../../../../src/widget-core/d';
import { stub, SinonStub } from 'sinon';
import harness from '../../../../src/testing/harness';

import * as baseThemeClasses1 from './../../support/styles/testWidget1.css';
import * as baseThemeClasses2 from './../../support/styles/testWidget2.css';
import * as baseThemeClasses3 from './../../support/styles/baseTheme3.css';
import * as extraClasses1 from './../../support/styles/extraClasses1.css';
import testTheme1 from './../../support/styles/theme1.css';
import testTheme2 from './../../support/styles/theme2.css';
import testTheme3 from './../../support/styles/theme3.css';
import { SupportedClassName } from '../../../../src/widget-core/interfaces';

(baseThemeClasses1 as any)[' _key'] = 'testPath1';
(baseThemeClasses2 as any)[' _key'] = 'testPath2';
(baseThemeClasses3 as any)[' _key'] = 'testPath3';

let registry: Registry;

interface TestThemedProperties {
	testClasses?: SupportedClassName | SupportedClassName[];
	foo?: string;
}

@theme(baseThemeClasses1)
class TestWidget extends ThemedMixin(WidgetBase)<TestThemedProperties> {
	render() {
		const { testClasses } = this.properties;
		return v('div', {
			classes: testClasses ? this.theme(testClasses as any) : null
		});
	}
}

@theme(baseThemeClasses2)
class SubClassTestWidget extends TestWidget {}

@theme(baseThemeClasses1)
@theme(baseThemeClasses2)
class StackedTestWidget extends ThemedMixin(WidgetBase)<TestThemedProperties> {
	render() {
		const { testClasses } = this.properties;
		return v('div', {
			classes: testClasses ? this.theme(testClasses as any) : null
		});
	}
}

@theme(baseThemeClasses3)
@theme(baseThemeClasses1)
class DuplicateThemeClassWidget extends ThemedMixin(WidgetBase)<TestThemedProperties> {
	render() {
		const { testClasses } = this.properties;
		return v('div', {
			classes: testClasses ? this.theme(testClasses as any) : null
		});
	}
}

@theme(baseThemeClasses3)
class ExtendedThemeClassWidget extends TestWidget {}

class NonDecoratorSubClassTestWidget extends TestWidget {
	constructor() {
		super();
		theme(baseThemeClasses2)(this);
	}
}

class NonDecoratorStackedTestWidget extends ThemedMixin(WidgetBase)<TestThemedProperties> {
	constructor() {
		super();
		theme(baseThemeClasses1)(this);
		theme(baseThemeClasses2)(this);
	}
	render() {
		const { testClasses } = this.properties;
		return v('div', {
			classes: testClasses ? this.theme(testClasses as any) : null
		});
	}
}

class NonDecoratorDuplicateThemeClassWidget extends ThemedMixin(WidgetBase)<TestThemedProperties> {
	constructor() {
		super();
		theme(baseThemeClasses1)(this);
		theme(baseThemeClasses3)(this);
	}

	render() {
		const { testClasses } = this.properties;
		return v('div', {
			classes: testClasses ? this.theme(testClasses as any) : null
		});
	}
}

let consoleStub: SinonStub;

registerSuite('ThemedMixin', {
	beforeEach() {
		registry = new Registry();
		consoleStub = stub(console, 'warn');
	},
	afterEach() {
		consoleStub.restore();
	},
	tests: {
		'classes function': {
			'should return baseThemeClasses1 flagged classes via the classes function'() {
				const { class1, class2 } = baseThemeClasses1;
				harness(() => w(TestWidget, { testClasses: [class1, class2] })).expect(() =>
					v('div', {
						classes: [class1, class2]
					})
				);
				assert.isFalse(consoleStub.called);
			},
			'should return negated classes for those that are not passed'() {
				const { class1 } = baseThemeClasses1;
				harness(() => w(TestWidget, { testClasses: class1 })).expect(() =>
					v('div', {
						classes: class1
					})
				);
				assert.isFalse(consoleStub.called);
			},
			'should ignore any new classes that do not exist in the baseThemeClasses1 and show console error'() {
				const { class1 } = baseThemeClasses1;
				const newClassName = 'newClassName';
				harness(() => w(TestWidget, { testClasses: [class1, newClassName] })).expect(() =>
					v('div', {
						classes: [class1, null]
					})
				);

				assert.isTrue(consoleStub.calledOnce);
				assert.strictEqual(consoleStub.firstCall.args[0], `Class name: '${newClassName}' not found in theme`);
			},
			'should split adjoined classes into multiple classes'() {
				const { class1, class2 } = baseThemeClasses1;
				harness(() => w(TestWidget, { theme: testTheme3, testClasses: [class1, class2] })).expect(() =>
					v('div', {
						classes: ['testTheme3Class1 testTheme3AdjoinedClass1', class2]
					})
				);
			},
			'should remove adjoined classes when they are no longer provided'() {
				const { class1, class2 } = baseThemeClasses1;
				let properties: any = { theme: testTheme3, testClasses: [class1, class2] };
				const h = harness(() => w(TestWidget, properties));
				h.expect(() =>
					v('div', {
						classes: ['testTheme3Class1 testTheme3AdjoinedClass1', class2]
					})
				);
				properties = { theme: testTheme1, testClasses: [class1, class2] };
				h.expect(() =>
					v('div', {
						classes: [testTheme1.testPath1.class1, baseThemeClasses1.class2]
					})
				);
			},
			'should return null and undefineds unprocessed'() {
				const { class1, class2 } = baseThemeClasses1;
				harness(() => w(TestWidget, { testClasses: [class1, null, class2, undefined] })).expect(() =>
					v('div', {
						classes: [class1, null, class2, undefined]
					})
				);
				assert.isFalse(consoleStub.called);
			}
		},
		'setting a theme': {
			'should override base theme classes with theme classes'() {
				const { class1, class2 } = baseThemeClasses1;
				harness(() => w(TestWidget, { theme: testTheme1, testClasses: [class1, class2] })).expect(() =>
					v('div', {
						classes: [testTheme1.testPath1.class1, baseThemeClasses1.class2]
					})
				);
			},
			'should return new theme classes when the theme is updated'() {
				const { class1, class2 } = baseThemeClasses1;
				let properties: any = { theme: testTheme1, testClasses: class1 };
				const h = harness(() => w(TestWidget, properties));
				h.expect(() => v('div', { classes: testTheme1.testPath1.class1 }));

				properties = { theme: testTheme2, testClasses: [class1, class2] };
				h.expect(() => v('div', { classes: [testTheme2.testPath1.class1, baseThemeClasses1.class2] }));
			},
			'should warn when missing a theme'() {
				const Unthemed = class extends ThemedMixin(WidgetBase) {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				};
				harness(() => w(Unthemed, {}));
				assert.strictEqual(consoleStub.callCount, 2);
				assert.strictEqual(
					consoleStub.firstCall.args[0],
					'A base theme has not been provided to this widget. Please use the @theme decorator to add a theme.'
				);
			}
		},
		'setting extra classes': {
			'should supplement base theme classes with extra classes'() {
				const { class1, class2 } = baseThemeClasses1;
				harness(() => w(TestWidget, { testClasses: [class1, class2], extraClasses: extraClasses1 })).expect(
					() =>
						v('div', {
							classes: [`${extraClasses1.class1} ${baseThemeClasses1.class1}`, baseThemeClasses1.class2]
						})
				);
			}
		},
		'setting base theme classes': {
			decorator: {
				'Themes get inherited from base classes and merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					harness(() => w(SubClassTestWidget, { testClasses: [class1, class2, class3, class4] })).expect(() =>
						v('div', { classes: [class1, class2, class3, class4] })
					);
				},
				'Stacked themes get merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					harness(() => w(StackedTestWidget, { testClasses: [class1, class2, class3, class4] })).expect(() =>
						v('div', { classes: [class1, class2, class3, class4] })
					);
				},
				'Can override classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class1: duplicateClass1 } = baseThemeClasses3;
					harness(() => w(DuplicateThemeClassWidget, { testClasses: [class1, class2] })).expect(() =>
						v('div', { classes: [duplicateClass1, class2] })
					);
				}
			},
			'non decorator': {
				'Themes get inherited from base classes and merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					harness(() =>
						w(NonDecoratorSubClassTestWidget, { testClasses: [class1, class2, class3, class4] })
					).expect(() => v('div', { classes: [class1, class2, class3, class4] }));
				},
				'Stacked themes get merged into the available classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class3, class4 } = baseThemeClasses2;
					harness(() =>
						w(NonDecoratorStackedTestWidget, { testClasses: [class1, class2, class3, class4] })
					).expect(() => v('div', { classes: [class1, class2, class3, class4] }));
				},
				'Can override classes'() {
					const { class1, class2 } = baseThemeClasses1;
					const { class1: duplicateClass1 } = baseThemeClasses3;
					harness(() => w(NonDecoratorDuplicateThemeClassWidget, { testClasses: [class1, class2] })).expect(
						() => v('div', { classes: [duplicateClass1, class2] })
					);
				}
			},
			extension() {
				const { class1, class2 } = baseThemeClasses1;
				const { class1: duplicateClass1 } = baseThemeClasses3;
				harness(() => w(ExtendedThemeClassWidget, { testClasses: [class1, class2] })).expect(() =>
					v('div', { classes: [duplicateClass1, class2] })
				);
			}
		},
		'injecting a theme': {
			'theme can be injected by defining a ThemeInjector with registry'() {
				const injector = () => () => testTheme1;
				registry.defineInjector(INJECTED_THEME_KEY, injector);
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				}
				harness(() => w(InjectedTheme, {}), { registry }).expect(() => v('div', { classes: 'theme1Class1' }));
			},
			'theme will not be injected if a theme has been passed via a property'() {
				const injector = () => () => testTheme1;
				registry.defineInjector(INJECTED_THEME_KEY, injector);
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				}
				harness(() => w(InjectedTheme, { theme: testTheme2 }), { registry }).expect(() =>
					v('div', { classes: 'theme2Class1' })
				);
			},
			'does not attempt to inject if the ThemeInjector has not been defined in the registry'() {
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				}
				harness(() => w(InjectedTheme, {})).expect(() => v('div', { classes: 'baseClass1' }));
			},
			'setting the theme invalidates and the new theme is used'() {
				const themeInjectorContext = registerThemeInjector(testTheme1, registry);
				class InjectedTheme extends TestWidget {
					render() {
						return v('div', { classes: this.theme(baseThemeClasses1.class1) });
					}
				}

				let properties: any = {};
				const h = harness(() => w(InjectedTheme, properties), { registry });
				h.expect(() => v('div', { classes: 'theme1Class1' }));

				themeInjectorContext.set(testTheme2);
				h.expect(() => v('div', { classes: 'theme2Class1' }));

				themeInjectorContext.set(testTheme1);
				h.expect(() => v('div', { classes: 'theme1Class1' }));

				themeInjectorContext.set(testTheme1);
				properties = { foo: 'bar' };
				h.expect(() => v('div', { classes: 'theme1Class1' }));
			}
		},
		integration: {
			'should work as mixin to createWidgetBase'() {
				const fixedClassName = 'fixedClassName';

				class IntegrationTest extends TestWidget {
					constructor() {
						super();
					}

					render() {
						const { class1 } = baseThemeClasses1;
						return v('div', [v('div', { classes: [this.theme(class1), fixedClassName] })]);
					}
				}

				let properties: any = { theme: testTheme1 };
				const h = harness(() => w(IntegrationTest, properties));

				h.expect(() => v('div', [v('div', { classes: [testTheme1.testPath1.class1, fixedClassName] })]));

				properties = { theme: testTheme2 };
				h.expect(() => v('div', [v('div', { classes: [testTheme2.testPath1.class1, fixedClassName] })]));
			}
		}
	}
});
