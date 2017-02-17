import Map from '@dojo/shim/Map';
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
 * Properties required for the themeable mixin
 */
export interface ThemeableProperties extends WidgetProperties {
	theme?: any;
	overrideClasses?: any;
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
		constructor.prototype.addDecorator('baseClasses', theme);
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
 * Function that returns a class decorated with with Themeable functionality
 */
export function ThemeableMixin<T extends Constructor<WidgetBase<ThemeableProperties>>>(base: T): T & Constructor<ThemeableMixin> {
	return class extends base {

		/**
		 * The Themeable baseClasses
		 */
		private baseClasses: BaseClasses;

		/**
		 * All classes ever seen by the instance
		 */
		private allClasses: ClassNameFlags = {};

		/**
		 * Reverse lookup of the base classes
		 */
		private baseClassesReverseLookup: ClassNames;

		/**
		 * Indicates if classes meta data need to be calculated.
		 */
		private recalculateClasses: boolean = true;

		/**
		 * Map of registered classes
		 */
		private registeredClassesMap: Map<string, ClassNameFlags> = new Map<string, ClassNameFlags>();

		/**
		 * Loaded theme
		 */
		private theme: ClassNames = {};

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
				this.recalculateThemeClasses();
			}

			const appliedClasses = classNames
				.filter((className) => className !== null)
				.reduce((appliedClasses: {}, className: string) => {
					if (!this.baseClassesReverseLookup[className]) {
						console.warn(`Class name: ${className} is not from baseClasses, use chained 'fixed' method instead`);
						return appliedClasses;
					}
					className = this.baseClassesReverseLookup[className];
					if (!this.registeredClassesMap.has(className)) {
						this.registerThemeClass(className);
					}
					return assign(appliedClasses, this.registeredClassesMap.get(className));
				}, {});

			const themeable = this;
			const classesResponseChain: ClassesFunctionChain = {
				classes: assign({}, this.allClasses, appliedClasses),
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
		 * Register the classes object for the class name and adds the class to the instances `allClasses` object.
		 *
		 * @param className the name of the class to register.
		 */
		private registerThemeClass(className: string) {
			const { properties: { overrideClasses = {} } } = this;
			const themeClass = this.theme[className] ? this.theme[className] : this.baseClasses[className];
			const overrideClassNames = overrideClasses[className] ? overrideClasses[className].split(' ') : [];
			const cssClassNames = themeClass.split(' ').concat(overrideClassNames);
			const classesObject = cssClassNames.reduce((classesObject, cssClassName) => {
				classesObject[cssClassName] = true;
				this.allClasses[cssClassName] = false;
				return classesObject;
			}, <any> {});
			this.registeredClassesMap.set(className, classesObject);
		}

		/**
		 * Recalculate registered classes for current theme.
		 */
		private recalculateThemeClasses() {
			const { properties: { theme = {} } } = this;
			this.baseClasses = (this.getDecorator('baseClasses') || [])[0];
			const themeKey = this.baseClasses[THEME_KEY];
			this.baseClassesReverseLookup = createBaseClassesLookup(this.baseClasses);
			this.theme = theme[themeKey] || {};
			this.registeredClassesMap.forEach((value, key) => {
				this.registerThemeClass(key);
			});
			this.recalculateClasses = false;
		}

		/**
		 * Function fired when properties are changed on the widget.
		 *
		 * @param changedPropertyKeys Array of properties that have changed
		 */
		private onPropertiesChanged(changedPropertyKeys: string[]) {
			const themeChanged = includes(changedPropertyKeys, 'theme');
			const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

			if (themeChanged || overrideClassesChanged) {
				this.recalculateClasses = true;
			}
		}
	};
}

export default ThemeableMixin;
