import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent } from './../interfaces';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';

/**
 * A representation of the css-module class names
 * to be applied where each class in appliedClasses
 * is used.
 */
export type CSSModuleClassNames = {
	[key: string]: boolean;
}

/**
 * The object returned by getClasses.
 */
export type AppliedClasses<T> = {
	[P in keyof T]?: CSSModuleClassNames;
};

type StringIndexedObject = { [key: string]: string; };

/**
 * Properties required for the themeable mixin
 */
export interface ThemeableProperties {
	theme?: {};
	overrideClasses?: {};
}

/**
 * Themeable Options
 */
export interface ThemeableOptions {
	properties: ThemeableProperties;
}

/**
 * Themeable Mixin
 */
export interface ThemeableMixin<P> extends Evented {
	theme: AppliedClasses<P>;
}

/**
 * Themeable
 */
export interface Themeable<P> extends ThemeableMixin<P> {
	baseTheme: P;
	properties: ThemeableProperties;
}

/**
 * Compose Themeable Factory interface
 */
export interface ThemeableFactory extends ComposeFactory<ThemeableMixin<{}>, ThemeableOptions> {}

/**
 * Private map for the widgets themeClasses.
 */
const themeClassesMap = new WeakMap<ThemeableMixin<{}>, AppliedClasses<any>>();

function addClassNameToCSSModuleClassNames(cssModuleClassNames: CSSModuleClassNames, classList: StringIndexedObject, className: string) {
	if (classList.hasOwnProperty(className)) {
		// split out the classname because css-module composition combines class names with a space
		const generatedClassNames: string[] = classList[className].split(' ');
		generatedClassNames.forEach((generatedClassName) => {
			cssModuleClassNames[generatedClassName] = true;
		});
	}
}

function negatePreviousClasses<T>(previousClasses: AppliedClasses<T>, newClasses: AppliedClasses<T>) {
	return Object.keys(previousClasses).reduce((newAppliedClasses, className: keyof T) => {
		const oldCSSModuleClassNames = <CSSModuleClassNames> previousClasses[className];

		const negatedCSSModuleClassNames = Object.keys(oldCSSModuleClassNames).reduce((newCSSModuleClassNames, oldCSSModuleClassName) => {
			const currentClassNameFlag = oldCSSModuleClassNames[oldCSSModuleClassName];
			// If it's true it needs to be negated and passed along, If it's false,
			// don't return it as maquette will already have removed it.
			if (currentClassNameFlag) {
				newCSSModuleClassNames[oldCSSModuleClassName] = false;
			}
			return newCSSModuleClassNames;
		}, <CSSModuleClassNames> {});

		const calculatedClassNameMap = assign({}, negatedCSSModuleClassNames, newClasses[className]);
		newAppliedClasses[className] = calculatedClassNameMap;

		return newAppliedClasses;
	}, <AppliedClasses<T>> {});
}

function generateThemeClasses<I, T>(instance: Themeable<I>, baseTheme: T, theme: {} = {}, overrideClasses: {} = {}) {
	return Object.keys(baseTheme).reduce((newAppliedClasses, className: keyof T) => {
		const newCSSModuleClassNames: CSSModuleClassNames = {};
		const themeClassSource = theme.hasOwnProperty(className) ? theme : baseTheme;

		addClassNameToCSSModuleClassNames(newCSSModuleClassNames, themeClassSource, className);
		overrideClasses && addClassNameToCSSModuleClassNames(newCSSModuleClassNames, overrideClasses, className);
		newAppliedClasses[className] = newCSSModuleClassNames;

		return newAppliedClasses;
	}, <AppliedClasses<T>> {});
}

function updateThemeClassesMap<I, T>(instance: Themeable<I>, newThemeClasses: AppliedClasses<T>) {
	if (themeClassesMap.has(instance)) {
		const previousThemeClasses = themeClassesMap.get(instance);
		themeClassesMap.set(instance, negatePreviousClasses(previousThemeClasses, newThemeClasses));
	} else {
		themeClassesMap.set(instance, newThemeClasses);
	}
}

function onPropertiesChanged<I>(instance: Themeable<I>, { theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
	const themeChanged = includes(changedPropertyKeys, 'theme');
	const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

	if (themeChanged || overrideClassesChanged) {
		const themeClasses = generateThemeClasses(instance, instance.baseTheme, theme, overrideClasses);
		updateThemeClassesMap(instance, themeClasses);
	}
}

/**
 * Themeable Factory
 */
const themeableFactory: ThemeableFactory = createEvented.mixin({
	mixin: {
		get theme(this: Themeable<any>): AppliedClasses<any> {
			return themeClassesMap.get(this);
		}
	},
	initialize<I>(instance: Themeable<I>) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<ThemeableMixin<I>, ThemeableProperties>) => {
			onPropertiesChanged(instance, evt.properties, evt.changedPropertyKeys);
		}));
		onPropertiesChanged(instance, instance.properties, [ 'theme' ]);
	}
});

export default themeableFactory;
