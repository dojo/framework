import { includes } from '@dojo/shim/array';
import { assign } from '@dojo/core/lang';
import { Constructor, PropertiesChangeEvent, WidgetProperties } from './../interfaces';
import { WidgetBase } from './../WidgetBase';

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
export interface ThemeableProperties extends WidgetProperties {
	theme?: {};
	overrideClasses?: {};
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
	fixed: (...classes: (string | null)[]) => ClassesFunctionChain;
	/**
	 * Finalize function to return the generated class names
	 */
	get: () => ClassNameFlags;
}

type BaseClasses = { [key: string]: string; };

const THEME_KEY = ' _key';

/**
 * Interface for the ThemeableMixin
 */
export interface ThemeableMixin {

	/**
	 * Processes all the possible classes for the instance with setting the passed class names to
	 * true.
	 *
	 * @param ...classNames an array of class names
	 * @returns a function chain to `get` or process more classes using `fixed`
	 */
	classes(...classNames: (string | null)[]): ClassesFunctionChain;
}

/**
 * Decorator for base css classes
 */
export function theme (theme: {}) {
	return function(constructor: Function) {
		constructor.prototype.baseClasses = theme;
	};
}

/**
 * Split class strings containing spaces into separate array entries.
 * ie. ['class1 class2', 'class3] -> ['class1', 'class2', 'class3'];
 *
 * @param classes The array of class strings to split.
 * @return the complete classes array including any split classes.
 */
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
 * Returns the class object map based on the class names and whether they are
 * active.
 *
 * @param className an array of string class names
 * @param applied indicates is the class is applied
 */
function createClassNameObject(classNames: string[], applied: boolean) {
	return classNames.reduce((flaggedClassNames: ClassNameFlags, className) => {
		flaggedClassNames[className] = applied;
		return flaggedClassNames;
	}, {});
}

/**
 * Creates a reverse lookup for the classes passed in via the `theme` function.
 *
 * @param classes The baseClasses object
 * @requires
 */
function createBaseClassesLookup(classes: BaseClasses): ClassNames {
	return Object.keys(classes).reduce((currentClassNames, key: string) => {
		currentClassNames[classes[key]] = key;
		return currentClassNames;
	}, <ClassNames> {});
}

/**
 * Function for returns a class decoratied with with Themeable functionality
 */
export function ThemeableMixin<T extends Constructor<WidgetBase<ThemeableProperties>>>(base: T): T & Constructor<ThemeableMixin> {
	return class extends base {

		/**
		 * The Themeable baseClasses
		 */
		private baseClasses: {};

		/**
		 * All classes ever seen by the instance
		 */
		private allClasses: ClassNameFlags;

		/**
		 * Reverse lookup of the base classes
		 */
		private baseClassesReverseLookup: ClassNames;

		/**
		 * Generated class name map
		 */
		private generatedClassNames: ClassNameFlagsMap;

		/**
		 * Indicates if classes meta data need to be calculated.
		 */
		private recalculateClasses: boolean = true;

		/**
		 * @constructor
		 */
		constructor(...args: any[]) {
			super(...args);
			this.own(this.on('properties:changed', (evt: PropertiesChangeEvent<this, ThemeableProperties>) => {
				this.onPropertiesChanged(evt.changedPropertyKeys);
			}));
		}

		/**
		 * Function used to add themeable classes to a widget. Returns a chained function 'fixed'
		 * that can be used to pass non-themeable classes to a widget. Filters out any null
		 * values passed.
		 *
		 * @param classNames the classes to be added to the domNode. These classes must come from
		 * the baseClasses passed into the @theme decorator.
		 * @return A function chain continaing the 'fixed' function and a 'get' finaliser function.
		 * Class names passed to the 'fixed' function can be any string.
		 *
		 */
		public classes(...classNames: (string | null)[]): ClassesFunctionChain {
			if (this.recalculateClasses) {
				this.calculateClasses();
			}

			const appliedClasses = classNames
				.filter((className) => className !== null)
				.reduce((currentCSSModuleClassNames, className: string) => {
					const classNameKey = this.baseClassesReverseLookup[className];
					if (this.generatedClassNames.hasOwnProperty(classNameKey)) {
						assign(currentCSSModuleClassNames, this.generatedClassNames[classNameKey]);
					}
					else {
						console.warn(`Class name: ${className} and lookup key: ${classNameKey} not from baseClasses, use chained 'fixed' method instead`);
					}
					return currentCSSModuleClassNames;
				}, {});

			const responseClasses = assign({}, this.allClasses, appliedClasses);
			const themeable = this;

			const classesResponseChain: ClassesFunctionChain = {
				classes: responseClasses,
				fixed(this: ClassesFunctionChain, ...classNames: (string | null)[]) {
					const filteredClassNames = <string[]> classNames.filter((className) => className !== null);
					const splitClasses = splitClassStrings(filteredClassNames);
					assign(this.classes, createClassNameObject(splitClasses, true));
					themeable.appendToAllClassNames(splitClasses);
					return this;
				},
				get(this: ClassesFunctionChain) {
					return this.classes;
				}
			};

			return classesResponseChain;
		}

		/**
		 * Adds classes to the internal allClasses property
		 *
		 * @param classNames an array of string class names
		 */
		private appendToAllClassNames(classNames: string[]): void {
			const negativeClassFlags = createClassNameObject(classNames, false);
			this.allClasses = assign({}, this.allClasses, negativeClassFlags);
		}

		/**
		 * Function to generate theme classes, triggered when theme or overrideClasses properties are changed.
		 *
		 * @param baseClassses the baseClasses object passed in via the @theme decorator.
		 * @param theme The current theme
		 * @param overrideClasses Any override classes that may have been set
		 */
		private generateThemeClasses(baseClasses: BaseClasses, theme: any, overrideClasses: any): void {
			let allClasses: string[] = [];
			const themeKey = baseClasses[THEME_KEY];
			const sourceThemeClasses = themeKey && theme.hasOwnProperty(themeKey) ? assign({}, baseClasses, theme[themeKey]) : baseClasses;

			const themeClasses = Object.keys(baseClasses).reduce((newAppliedClassNames, className: string) => {
				if (className === THEME_KEY) {
					return newAppliedClassNames;
				}

				let cssClassNames = sourceThemeClasses[className].split(' ');

				if (overrideClasses.hasOwnProperty(className)) {
					cssClassNames = [...cssClassNames, ...overrideClasses[className].split(' ')];
				}

				allClasses = [...allClasses, ...cssClassNames];

				newAppliedClassNames[className] = createClassNameObject(cssClassNames, true);

				return newAppliedClassNames;
			}, <ClassNameFlagsMap> {});

			this.appendToAllClassNames(allClasses);

			this.generatedClassNames = themeClasses;
		}

		/**
		 * Function fired when properties are changed on the widget.
		 *
		 * @param theme The theme property
		 * @param overrideClasses The overrideClasses property
		 * @param changedPropertyKeys Array of properties that have changed
		 */
		private onPropertiesChanged(changedPropertyKeys: string[]) {
			const themeChanged = includes(changedPropertyKeys, 'theme');
			const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

			if (themeChanged || overrideClassesChanged) {
				this.recalculateClasses = true;
			}
		}

		/**
		 * Initialize the reverse look up map and the generatedThemeClasses.
		 */
		private calculateClasses(): void {
			const { theme = {}, overrideClasses = {} } = this.properties;
			this.baseClassesReverseLookup = createBaseClassesLookup(this.baseClasses);
			this.generateThemeClasses(this.baseClasses, theme , overrideClasses);
			this.recalculateClasses = false;
		}
	};
}

export default ThemeableMixin;
