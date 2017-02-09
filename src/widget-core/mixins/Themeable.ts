import { includes } from '@dojo/shim/array';
import { assign } from '@dojo/core/lang';
import { PropertiesChangeEvent, WidgetConstructor, WidgetProperties } from './../WidgetBase';
import { Constructor } from './../interfaces';

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
export interface ThemeablMixin {

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
 * Function for returns a class decoratied with with Themeable functionality
 */
export function ThemeableMixin<T extends WidgetConstructor>(base: T): Constructor<ThemeablMixin> & T {
	return class extends base {

		/**
		 * Properties for Themeable functionality
		 */
		public properties: ThemeableProperties;

		/**
		 * The Themeable baseClasses
		 */
		public baseClasses: {};

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
		private generatedClassName: ClassNameFlagsMap;

		/**
		 * @constructor
		 */
		constructor(...args: any[]) {
			super(...args);
			this.own(this.on('properties:changed', (evt: PropertiesChangeEvent<this, ThemeableProperties>) => {
				this.onPropertiesChanged(evt.properties, evt.changedPropertyKeys);
			}));
			this.onPropertiesChanged(this.properties, [ 'theme' ]);
			this.baseClassesReverseLookup = this.createBaseClassesLookup(this.baseClasses);
		}

		public classes(...classNames: (string | null)[]): ClassesFunctionChain {
			const appliedClasses = classNames
				.filter((className) => className !== null)
				.reduce((currentCSSModuleClassNames, className: string) => {
					const classNameKey = this.baseClassesReverseLookup[className];
					if (this.generatedClassName.hasOwnProperty(classNameKey)) {
						assign(currentCSSModuleClassNames, this.generatedClassName[classNameKey]);
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
					const splitClasses = themeable.splitClassStrings(filteredClassNames);
					assign(this.classes, themeable.createClassNameObject(splitClasses, true));
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
			const negativeClassFlags = this.createClassNameObject(classNames, false);
			this.allClasses = assign({}, this.allClasses, negativeClassFlags);
		}

		/**
		 * Returns the class object map based on the class names and whether they are
		 * active.
		 *
		 * @param className an array of string class names
		 * @param applied indicates is the class is applied
		 */
		private createClassNameObject(classNames: string[], applied: boolean) {
			return classNames.reduce((flaggedClassNames: ClassNameFlags, className) => {
				flaggedClassNames[className] = applied;
				return flaggedClassNames;
			}, {});
		}

		private generateThemeClasses(baseClasses: BaseClasses, theme: any = {}, overrideClasses: any = {}) {
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

				newAppliedClassNames[className] = this.createClassNameObject(cssClassNames, true);

				return newAppliedClassNames;
			}, <ClassNameFlagsMap> {});

			this.appendToAllClassNames(allClasses);

			return themeClasses;
		}

		private onPropertiesChanged({ theme, overrideClasses }: ThemeableProperties, changedPropertyKeys: string[]) {
			const themeChanged = includes(changedPropertyKeys, 'theme');
			const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

			if (themeChanged || overrideClassesChanged) {
				this.generatedClassName = this.generateThemeClasses(this.baseClasses, theme, overrideClasses);
			}
		}

		private createBaseClassesLookup(classes: BaseClasses): ClassNames {
			return Object.keys(classes).reduce((currentClassNames, key: string) => {
				currentClassNames[classes[key]] = key;
				return currentClassNames;
			}, <ClassNames> {});
		}

		private splitClassStrings(classes: string[]): string[] {
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
	};
}
