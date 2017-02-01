import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent } from './../interfaces';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';

/**
 * A representation of the css class names to be applied and
 * removed.
 */
export type ClassNameFlags = {
	[key: string]: boolean;
}

/**
 * A lookup object for available class names
 */
export type ClassNames = {
	[key: string]: string;
}

/**
 * The object returned by getClasses required by maquette for
 * adding / removing classes. They are flagged to true / false.
 */
export type ClassNameFlagsMap = {
	[key: string]: ClassNameFlags;
}

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
 * Returned by classes function.
 */
export interface ClassesFunctionChain {
	/**
	 * The classes to be returned when get() is called
	 */
	classes: ClassNameFlags;
	/**
	 * Function to pass fixed class names that bypass the theming
	 * process
	 */
	fixed: (...classes: string[]) => ClassesFunctionChain;
	/**
	 * Finalize function to return the generated class names
	 */
	get: () => ClassNameFlags;
}

/**
 * Themeable Mixin
 */
export interface ThemeableMixin extends Evented {
	classes: (...classNames: string[]) => ClassesFunctionChain;
}

/**
 * Themeable
 */
export interface Themeable extends ThemeableMixin {
	baseClasses: BaseClasses;
	properties: ThemeableProperties;
}

/**
 * BaseClasses to be passed as this.baseClasses. The path string is used to
 * perform a lookup against any theme that has been set.
 */
export interface BaseClasses {
	classes: ClassNames;
	key: string;
}

/**
 * Compose Themeable Factory interface
 */
export interface ThemeableFactory extends ComposeFactory<ThemeableMixin, ThemeableOptions> {}

type StringIndexedObject = { [key: string]: string; };

/**
 * Map containing lookups for available css module class names.
 * Responding object contains each css module class name that applies
 * with a boolean set to true.
 */
const generatedClassNameMap = new WeakMap<Themeable, ClassNameFlagsMap>();

/**
 * Map containing a reverse lookup for all the class names provided in the
 * widget's baseClasses.
 */
const baseClassesReverseLookupMap = new WeakMap<Themeable, ClassNames>();

/**
 * Map containing every class name that has been applied to the widget.
 * Responding object consists of each class name with a boolean set to false.
 */
const allClassNamesMap = new WeakMap<Themeable, ClassNameFlags>();

function appendToAllClassNames(instance: Themeable, classNames: string[]) {
	const negativeClassFlags = createClassNameObject(classNames, false);
	const currentNegativeClassFlags = allClassNamesMap.get(instance);
	allClassNamesMap.set(instance, assign({}, currentNegativeClassFlags, negativeClassFlags));
}

function createClassNameObject(classNames: string[], applied: boolean) {
	return classNames.reduce((flaggedClassNames: ClassNameFlags, className) => {
		flaggedClassNames[className] = applied;
		return flaggedClassNames;
	}, {});
}

function generateThemeClasses(instance: Themeable, { classes: baseClassesClasses, key }: BaseClasses, theme: any = {}, overrideClasses: any = {}) {
	let allClasses: string[] = [];
	const sourceThemeClasses = theme.hasOwnProperty(key) ? assign({}, baseClassesClasses, theme[key]) : baseClassesClasses;

	const themeClasses = Object.keys(baseClassesClasses).reduce((newAppliedClassNames, className: string) => {
		let cssClassNames = sourceThemeClasses[className].split(' ');

		if (overrideClasses.hasOwnProperty(className)) {
			cssClassNames = [...cssClassNames, ...overrideClasses[className].split(' ')];
		}

		allClasses = [...allClasses, ...cssClassNames];

		newAppliedClassNames[className] = createClassNameObject(cssClassNames, true);

		return newAppliedClassNames;
	}, <ClassNameFlagsMap> {});

	appendToAllClassNames(instance, allClasses);

	return themeClasses;
}

function onPropertiesChanged(instance: Themeable, { theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
	const themeChanged = includes(changedPropertyKeys, 'theme');
	const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

	if (themeChanged || overrideClassesChanged) {
		const themeClasses = generateThemeClasses(instance, instance.baseClasses, theme, overrideClasses);
		generatedClassNameMap.set(instance, themeClasses);
	}
}

function createBaseClassesLookup({ classes }: BaseClasses): ClassNames {
	return Object.keys(classes).reduce((currentClassNames, key: string) => {
		currentClassNames[classes[key]] = key;
		return currentClassNames;
	}, <ClassNames> {});
}

function splitClassStrings(classes: string[]): string[] {
	return classes.reduce((splitClasses: string[], className) => {
		if (className.indexOf(' ') > -1) {
			splitClasses.push(...className.split(' '));
		}
		else {
			splitClasses.push(className);
		}
		return splitClasses;
	}, []);
}

/**
 * Themeable Factory
 */
const themeableFactory: ThemeableFactory = createEvented.mixin({
	mixin: {
		classes(this: Themeable, ...classNames: string[]) {
			const cssModuleClassNames = generatedClassNameMap.get(this);
			const baseClassesReverseLookup = baseClassesReverseLookupMap.get(this);

			const appliedClasses = classNames.reduce((currentCSSModuleClassNames, className) => {
				const classNameKey = baseClassesReverseLookup[className];
				if (cssModuleClassNames.hasOwnProperty(classNameKey)) {
					assign(currentCSSModuleClassNames, cssModuleClassNames[classNameKey]);
				}
				else {
					console.warn(`Class name: ${className} and lookup key: ${classNameKey} not from baseClasses, use chained 'fixed' method instead`);
				}
				return currentCSSModuleClassNames;
			}, {});

			const responseClasses = assign({}, allClassNamesMap.get(this), appliedClasses);
			const instance = this;

			const classesResponseChain: ClassesFunctionChain = {
				classes: responseClasses,
				fixed(this: ClassesFunctionChain, ...classes: string[]) {
					const splitClasses = splitClassStrings(classes);
					assign(this.classes, createClassNameObject(splitClasses, true));
					appendToAllClassNames(instance, splitClasses);
					return this;
				},
				get(this: ClassesFunctionChain) {
					return this.classes;
				}
			};

			return classesResponseChain;
		}
	},
	initialize(instance: Themeable) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<ThemeableMixin, ThemeableProperties>) => {
			onPropertiesChanged(instance, evt.properties, evt.changedPropertyKeys);
		}));
		onPropertiesChanged(instance, instance.properties, [ 'theme' ]);
		baseClassesReverseLookupMap.set(instance, createBaseClassesLookup(instance.baseClasses));
	}
});

export default themeableFactory;
