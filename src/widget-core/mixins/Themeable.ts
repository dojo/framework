import Map from '@dojo/shim/Map';
import { includes, find } from '@dojo/shim/array';
import { assign } from '@dojo/core/lang';
import { Constructor, WidgetProperties, PropertiesChangeEvent } from './../interfaces';
import { WidgetBase, onPropertiesChanged } from './../WidgetBase';

/**
 * A representation of the css class names to be applied and
 * removed.
 */
export type ClassNameFlags = {
	[key: string]: boolean;
};

/**
 * A lookup object for available class names
 */
export type ClassNames = {
	[key: string]: string;
};

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
	(): ClassNameFlags;
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

type ThemeClasses = { [key: string]: string; };

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
		constructor.prototype.addDecorator('baseThemeClasses', theme);
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
function createThemeClassesLookup(classes: ThemeClasses[]): ClassNames {
	return classes.reduce((currentClassNames, baseClass) => {
		Object.keys(baseClass).forEach((key: string) => {
			currentClassNames[baseClass[key]] = key;
		});
		return currentClassNames;
	}, <ClassNames> {});
}

/**
 * Function that returns a class decorated with with Themeable functionality
 */
export function ThemeableMixin<T extends Constructor<WidgetBase<ThemeableProperties>>>(base: T): T & Constructor<ThemeableMixin> {
	class Themeable extends base {

		/**
		 * The Themeable baseClasses
		 */
		private _registeredBaseThemes: ThemeClasses[];

		/**
		 * All classes ever seen by the instance
		 */
		private _allClasses: ClassNameFlags = {};

		/**
		 * Reverse lookup of the theme classes
		 */
		private _baseThemeClassesReverseLookup: ClassNames;

		/**
		 * Indicates if classes meta data need to be calculated.
		 */
		private _recalculateClasses = true;

		/**
		 * Map of registered classes
		 */
		private _registeredClassesMap: Map<string, ClassNameFlags> = new Map<string, ClassNameFlags>();

		/**
		 * Loaded theme
		 */
		private _theme: ClassNames = {};

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
			if (this._recalculateClasses) {
				this.recalculateThemeClasses();
			}

			const appliedClasses = classNames
				.filter((className) => className !== null)
				.reduce((appliedClasses: {}, className: string) => {
					if (!this._baseThemeClassesReverseLookup[className]) {
						console.warn(`Class name: ${className} not found, use chained 'fixed' method instead`);
						return appliedClasses;
					}
					className = this._baseThemeClassesReverseLookup[className];
					if (!this._registeredClassesMap.has(className)) {
						this.registerThemeClass(className);
					}
					return assign(appliedClasses, this._registeredClassesMap.get(className));
				}, {});

			const themeable = this;
			function classesGetter(this: ClassesFunctionChain) {
				return this.classes;
			}
			const classesFunctionChain = {
				classes: assign({}, this._allClasses, appliedClasses),
				fixed(this: ClassesFunctionChain, ...classNames: (string | null)[]) {
					const filteredClassNames = <string[]> classNames.filter((className) => className !== null);
					const splitClasses = splitClassStrings(filteredClassNames);
					assign(this.classes, createClassNameObject(splitClasses, true));
					themeable.appendToAllClassNames(splitClasses);
					return this;
				},
				get: classesGetter
			};

			return assign(classesGetter.bind(classesFunctionChain), classesFunctionChain);
		}

		/**
		 * Function fired when properties are changed on the widget.
		 *
		 * @param changedPropertyKeys Array of properties that have changed
		 */
		@onPropertiesChanged
		protected onPropertiesChanged({ changedPropertyKeys }: PropertiesChangeEvent<this, ThemeableProperties>) {
			const themeChanged = includes(changedPropertyKeys, 'theme');
			const overrideClassesChanged = includes(changedPropertyKeys, 'overrideClasses');

			if (themeChanged || overrideClassesChanged) {
				this._recalculateClasses = true;
			}
		}

		/**
		 * Adds classes to the internal allClasses property
		 *
		 * @param classNames an array of string class names
		 */
		private appendToAllClassNames(classNames: string[]): void {
			const negativeClassFlags = createClassNameObject(classNames, false);
			this._allClasses = assign({}, this._allClasses, negativeClassFlags);
		}

		/**
		 * Register the classes object for the class name and adds the class to the instances `allClasses` object.
		 *
		 * @param className the name of the class to register.
		 */
		private registerThemeClass(className: string) {
			const { properties: { overrideClasses = {} } } = this;
			const themeClass = this._theme[className] ? this._theme[className] : this.getBaseThemeClass(className);
			const overrideClassNames = overrideClasses[className] ? overrideClasses[className].split(' ') : [];
			const cssClassNames = themeClass.split(' ').concat(overrideClassNames);
			const classesObject = cssClassNames.reduce((classesObject, cssClassName) => {
				classesObject[cssClassName] = true;
				this._allClasses[cssClassName] = false;
				return classesObject;
			}, <any> {});
			this._registeredClassesMap.set(className, classesObject);
		}

		/**
		 * Recalculate registered classes for current theme.
		 */
		private recalculateThemeClasses() {
			const { properties: { theme = {} } } = this;
			if (!this._registeredBaseThemes) {
				this._registeredBaseThemes = [ ...this.getDecorator('baseThemeClasses') ].reverse();
				this.checkForDuplicates();
			}
			const registeredBaseThemeKeys = this._registeredBaseThemes.map((registeredBaseThemeClasses) => {
				return registeredBaseThemeClasses[THEME_KEY];
			});

			this._baseThemeClassesReverseLookup = createThemeClassesLookup(this._registeredBaseThemes);
			this._theme = registeredBaseThemeKeys.reduce((baseTheme, themeKey) => {
				return assign(baseTheme, theme[themeKey]);
			}, {});

			this._registeredClassesMap.forEach((value, key) => {
				this.registerThemeClass(key);
			});
			this._recalculateClasses = false;
		}

		/**
		 * Find the base theme class for the class name
		 */
		private getBaseThemeClass(className: string): string {
			const registeredBaseTheme = find(this._registeredBaseThemes, (registeredBaseThemeClasses) => {
				return Boolean(registeredBaseThemeClasses[className]);
			});
			return registeredBaseTheme[className] || '';
		}

		/**
		 * Check for duplicates across the registered base themes.
		 */
		private checkForDuplicates(): void {
			this._registeredBaseThemes.forEach((registeredBaseThemeClasses, index) => {
				Object.keys(registeredBaseThemeClasses).some((key) => {
					return this.isDuplicate(key, registeredBaseThemeClasses);
				});
			});
		}

		/**
		 * Search for classname in other base themes
		 */
		private isDuplicate(key: string, originatingBaseTheme: ThemeClasses): boolean {
			let duplicate = false;
			if (key !== THEME_KEY) {
				for (let i = 0; i < this._registeredBaseThemes.length; i++) {
					if (originatingBaseTheme === this._registeredBaseThemes[i]) {
						continue;
					}
					if (this._registeredBaseThemes[i][key]) {
						console.warn(`Duplicate base theme class key '${key}' detected, this could cause unexpected results`);
						duplicate = true;
						break;
					}
				}
				return duplicate;
			}
			return duplicate;
		}
	};

	return Themeable;
}

export default ThemeableMixin;
