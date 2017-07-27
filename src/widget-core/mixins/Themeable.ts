import { assign } from '@dojo/core/lang';
import { find } from '@dojo/shim/array';
import Map from '@dojo/shim/Map';
import { ClassesFunction, Constructor, DNode, WidgetProperties } from './../interfaces';
import { w, registry } from './../d';
import { WidgetRegistry } from './../WidgetRegistry';
import { BaseInjector, Context, Injector } from './../Injector';
import { beforeRender, diffProperty, WidgetBase, handleDecorator } from './../WidgetBase';
import { shallow } from './../diff';

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
 * A lookup object for available widget classes names
 */
export interface Theme {
	[key: string]: object;
}

/**
 * Properties required for the themeable mixin
 */
export interface ThemeableProperties<T = ClassNames> extends WidgetProperties {
	injectedTheme?: any;
	theme?: Theme;
	extraClasses?: { [P in keyof T]?: string };
}

/**
 * Returned by classes function.
 */
export interface ClassesFunctionChain {
	(): ClassNameFlags;
	/**
	 * The theme classes to be returned when get() is called
	 */
	classes: string[];
	/**
	 * The fixed classes to be returned when get() is called
	 */
	fixedClasses: string[];
	/**
	 * Function to pass fixed class names that bypass the theming
	 * process
	 */
	fixed: (...classes: (string | null)[]) => ClassesFunctionChain;
	/**
	 * Finalize function to return the generated class names
	 */
	get: ClassesFunction;
}

const THEME_KEY = ' _key';

export const INJECTED_THEME_KEY = Symbol('theme');

/**
 * Interface for the ThemeableMixin
 */
export interface ThemeableMixin<T = ClassNames> {

	/**
	 * Processes all the possible classes for the instance with setting the passed class names to
	 * true.
	 *
	 * @param ...classNames an array of class names
	 * @returns a function chain to `get` or process more classes using `fixed`
	 */
	classes(...classNames: (string | null)[]): ClassesFunctionChain;

	properties: ThemeableProperties<T>;
}

/**
 * Decorator for base css classes
 */
export function theme (theme: {}) {
	return handleDecorator((target) => {
		target.addDecorator('baseThemeClasses', theme);
	});
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
function createThemeClassesLookup(classes: ClassNames[]): ClassNames {
	return classes.reduce((currentClassNames, baseClass) => {
		Object.keys(baseClass).forEach((key: string) => {
			currentClassNames[baseClass[key]] = key;
		});
		return currentClassNames;
	}, <ClassNames> {});
}

/**
 * Convenience function that is given a theme and an optional registry, the theme
 * injector is defined against the registry, returning the theme context.
 *
 * @param theme the theme to set
 * @param themeRegistry registry to define the theme injector against. Defaults
 * to the global registry
 *
 * @returns the theme context instance used to set the theme
 */
export function registerThemeInjector(theme: any, themeRegistry: WidgetRegistry = registry): Context {
	const themeInjectorContext = new Context(theme);
	const ThemeInjectorBase = Injector(BaseInjector, themeInjectorContext);
	themeRegistry.define(INJECTED_THEME_KEY, ThemeInjectorBase);
	return themeInjectorContext;
}

/**
 * Function that returns a class decorated with with Themeable functionality
 */
export function ThemeableMixin<E, T extends Constructor<WidgetBase<ThemeableProperties<E>>>>(Base: T): Constructor<ThemeableMixin<E>> & T {
	class Themeable extends Base {

		public properties: ThemeableProperties<E>;

		/**
		 * The Themeable baseClasses
		 */
		private _registeredBaseThemes: ClassNames[];

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
		 * @return A function chain containing the 'fixed' function and a 'get' finalizer function.
		 * Class names passed to the 'fixed' function can be any string.
		 *
		 */
		public classes(...classNames: (string | null)[]): ClassesFunctionChain {
			if (this._recalculateClasses) {
				this._recalculateThemeClasses();
			}

			const themeable = this;
			function classesGetter(this: ClassesFunctionChain) {
				const themeClasses = themeable._getThemeClasses(this.classes);
				const fixedClasses = themeable._getFixedClasses(this.fixedClasses);
				return assign({}, themeable._allClasses, themeClasses, fixedClasses);
			}
			const classesFunctionChain = {
				classes: classNames,
				fixedClasses: [],
				fixed(this: ClassesFunctionChain, ...classNames: (string | null)[]) {
					const filteredClassNames = <string[]> classNames.filter((className) => className !== null);
					this.fixedClasses.push(...filteredClassNames);
					return this;
				},
				get: classesGetter
			};

			return assign(classesGetter.bind(classesFunctionChain), classesFunctionChain);
		}

		@beforeRender()
		protected injectTheme(renderFunc: () => DNode, properties: ThemeableProperties<E>, children: DNode[]): () => DNode {
			return () => {
				const hasInjectedTheme = this.getRegistries().has(INJECTED_THEME_KEY);
				if (hasInjectedTheme) {
					return w<BaseInjector>(INJECTED_THEME_KEY, {
						scope: this,
						render: renderFunc,
						getProperties: (inject: Context, properties: ThemeableProperties<any>): ThemeableProperties<any>  => {
							if (!properties.theme && this._theme !== properties.injectedTheme) {
								this._recalculateClasses = true;
							}
							return { injectedTheme: inject.get() };
						},
						properties,
						children
					});
				}
				return renderFunc();
			};
		}

		/**
		 * Function fired when `theme` or `extraClasses` are changed.
		 */
		@diffProperty('theme', shallow)
		@diffProperty('extraClasses', shallow)
		protected onPropertiesChanged() {
			this._recalculateClasses = true;
		}

		/**
		 * Get theme class object from classNames
		 */
		private _getThemeClasses(classNames: string[]): ClassNameFlags  {
			return classNames
				.filter((className) => className !== null)
				.reduce((appliedClasses: {}, className: string) => {
					if (!this._baseThemeClassesReverseLookup[className]) {
						console.warn(`Class name: ${className} not found, use chained 'fixed' method instead`);
						return appliedClasses;
					}
					className = this._baseThemeClassesReverseLookup[className];
					if (!this._registeredClassesMap.has(className)) {
						this._registerThemeClass(className);
					}
					return assign(appliedClasses, this._registeredClassesMap.get(className));
				}, {});
		}

		/**
		 * Get fixed class object from classNames
		 */
		private _getFixedClasses(classNames: string[]): ClassNameFlags {
			const splitClasses = splitClassStrings(classNames);
			this._appendToAllClassNames(splitClasses);
			return createClassNameObject(splitClasses, true);
		}

		/**
		 * Adds classes to the internal allClasses property
		 *
		 * @param classNames an array of string class names
		 */
		private _appendToAllClassNames(classNames: string[]): void {
			const negativeClassFlags = createClassNameObject(classNames, false);
			this._allClasses = assign({}, this._allClasses, negativeClassFlags);
		}

		/**
		 * Register the classes object for the class name and adds the class to the instances `allClasses` object.
		 *
		 * @param className the name of the class to register.
		 */
		private _registerThemeClass(className: string) {
			const { properties: { extraClasses = {} } } = this;
			const themeClass = this._theme[className] ? this._theme[className] : this._getBaseThemeClass(className);
			const extraClassesClassNames = extraClasses[className];
			const extraClassesClassNamesArray = extraClassesClassNames ? extraClassesClassNames.split(' ') : [];
			const cssClassNames = themeClass.split(' ').concat(extraClassesClassNamesArray);
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
		private _recalculateThemeClasses() {
			const { properties: { injectedTheme = {}, theme = injectedTheme } } = this;
			if (!this._registeredBaseThemes) {
				this._registeredBaseThemes = [ ...this.getDecorator('baseThemeClasses') ].reverse();
				this._checkForDuplicates();
			}
			const registeredBaseThemeKeys = this._registeredBaseThemes.map((registeredBaseThemeClasses) => {
				return registeredBaseThemeClasses[THEME_KEY];
			});

			this._baseThemeClassesReverseLookup = createThemeClassesLookup(this._registeredBaseThemes);
			this._theme = registeredBaseThemeKeys.reduce((baseTheme, themeKey) => {
				return assign(baseTheme, theme[themeKey]);
			}, {});

			this._registeredClassesMap.forEach((value, key) => {
				this._registerThemeClass(key);
			});
			this._recalculateClasses = false;
		}

		/**
		 * Find the base theme class for the class name
		 */
		private _getBaseThemeClass(className: string): string {
			const registeredBaseTheme = find(this._registeredBaseThemes, (registeredBaseThemeClasses) => {
				return Boolean(registeredBaseThemeClasses[className]);
			});
			return (registeredBaseTheme && registeredBaseTheme[className]) || '';
		}

		/**
		 * Check for duplicates across the registered base themes.
		 */
		private _checkForDuplicates(): void {
			this._registeredBaseThemes.forEach((registeredBaseThemeClasses, index) => {
				Object.keys(registeredBaseThemeClasses).some((key) => {
					return this._isDuplicate(key, registeredBaseThemeClasses);
				});
			});
		}

		/**
		 * Search for the class name in other base themes
		 */
		private _isDuplicate(key: string, originatingBaseTheme: ClassNames): boolean {
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
	}

	return Themeable;
}

export default ThemeableMixin;
