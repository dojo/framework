import {
	Theme,
	Classes,
	ClassNames,
	Constructor,
	SupportedClassName,
	ThemeWithVariant,
	ThemeWithVariants
} from './../interfaces';
import { Registry } from './../Registry';
import { inject } from './../decorators/inject';
import { WidgetBase } from './../WidgetBase';
import { handleDecorator } from './../decorators/handleDecorator';
import { diffProperty } from './../decorators/diffProperty';
import {
	ThemeInjector,
	isThemeWithVariant,
	isThemeWithVariants,
	isThemeInjectorPayloadWithVariant
} from '../ThemeInjector';

export { Theme, Classes, ClassNames } from './../interfaces';

/**
 * Properties required for the Themed mixin
 */
export interface ThemedProperties<T = ClassNames> {
	/** Overriding custom theme for the widget */
	theme?: Theme | ThemeWithVariant;
	/** Map of widget keys and associated overriding classes */
	classes?: Classes;
	/** Extra classes to be applied to the widget */
	extraClasses?: { [P in keyof T]?: string };
}

export const THEME_KEY = ' _key';

export const INJECTED_THEME_KEY = '__theme_injector';

/**
 * Interface for the ThemedMixin
 */
export interface ThemedMixin<T = ClassNames> {
	theme(classes: SupportedClassName): SupportedClassName;
	theme(classes: SupportedClassName[]): SupportedClassName[];
	variant(): string | undefined;
	properties: ThemedProperties<T>;
}

/**
 * Decorator for base css classes
 */
export function theme(theme: {}) {
	return handleDecorator((target) => {
		target.addDecorator('baseThemeClasses', theme);
	});
}

/**
 * Creates a reverse lookup for the classes passed in via the `theme` function.
 *
 * @param classes The baseClasses object
 * @requires
 */
function createThemeClassesLookup(classes: ClassNames[]): ClassNames {
	return classes.reduce(
		(currentClassNames, baseClass) => {
			Object.keys(baseClass).forEach((key: string) => {
				currentClassNames[baseClass[key]] = key;
			});
			return currentClassNames;
		},
		<ClassNames>{}
	);
}

/**
 * Convenience function that is given a theme and an optional registry, the theme
 * injector is defined against the registry, returning the theme.
 *
 * @param theme the theme to set
 * @param themeRegistry registry to define the theme injector against. Defaults
 * to the global registry
 *
 * @returns the theme injector used to set the theme
 */
export function registerThemeInjector(
	theme: Theme | ThemeWithVariants | ThemeWithVariant,
	themeRegistry: Registry
): ThemeInjector {
	const themeInjector = new ThemeInjector(theme);
	themeRegistry.defineInjector(INJECTED_THEME_KEY, (invalidator) => {
		themeInjector.setInvalidator(invalidator);
		return () => themeInjector;
	});
	return themeInjector;
}

/**
 * Function that returns a class decorated with with Themed functionality
 */

export function ThemedMixin<E, T extends Constructor<WidgetBase<ThemedProperties<E>>>>(
	Base: T
): Constructor<ThemedMixin<E>> & T {
	@inject({
		name: INJECTED_THEME_KEY,
		getProperties: (theme: ThemeInjector, properties: ThemedProperties): ThemedProperties => {
			if (!properties.theme) {
				const payload = theme.get();
				if (isThemeInjectorPayloadWithVariant(payload)) {
					return { theme: payload };
				} else if (payload) {
					return { theme: payload.theme };
				}
			}
			return {};
		}
	})
	abstract class Themed extends Base {
		public abstract properties: ThemedProperties<E>;

		/**
		 * The Themed baseClasses
		 */
		private _registeredBaseTheme: ClassNames | undefined;

		/**
		 * Registered base theme keys
		 */
		private _registeredBaseThemeKeys: string[] = [];

		/**
		 * Reverse lookup of the theme classes
		 */
		private _baseThemeClassesReverseLookup: ClassNames | undefined;

		/**
		 * Indicates if classes meta data need to be calculated.
		 */
		private _recalculateClasses = true;

		/**
		 * Extra classes map
		 */
		private _classes!: Classes;

		/**
		 * Loaded theme
		 */
		private _theme: ClassNames = {};

		public theme(classes: SupportedClassName): SupportedClassName;
		public theme(classes: SupportedClassName[]): SupportedClassName[];
		public theme(classes: SupportedClassName | SupportedClassName[]): SupportedClassName | SupportedClassName[] {
			if (this._recalculateClasses) {
				this._recalculateThemeClasses();
			}
			if (Array.isArray(classes)) {
				return classes.map((className) => this._getThemeClass(className));
			}
			return this._getThemeClass(classes);
		}

		public variant() {
			const { theme } = this.properties;

			if (theme && isThemeWithVariant(theme)) {
				return theme.variant.value.root;
			}
		}

		/**
		 * Function fired when `theme` or `extraClasses` are changed.
		 */
		@diffProperty('theme')
		@diffProperty('extraClasses')
		@diffProperty('classes')
		protected onPropertiesChanged() {
			this._recalculateClasses = true;
		}

		private _getThemeClass(className: SupportedClassName): SupportedClassName {
			if (className === undefined || className === null || className === false || className === true) {
				return className;
			}

			const extraClasses = this.properties.extraClasses || ({} as any);
			const themeClassName = this._baseThemeClassesReverseLookup![className];
			let resultClassNames: string[] = [];
			if (!themeClassName) {
				console.warn(`Class name: '${className}' not found in theme`);
				return null;
			}

			if (this._classes) {
				const classes = Object.keys(this._classes).reduce(
					(classes, key) => {
						const classNames = Object.keys(this._classes[key]);
						for (let i = 0; i < classNames.length; i++) {
							const extraClass = this._classes[key][classNames[i]];
							if (classNames[i] === themeClassName && extraClass) {
								extraClass.forEach((className) => {
									if (className && className !== true) {
										classes.push(className);
									}
								});
								break;
							}
						}
						return classes;
					},
					[] as string[]
				);

				resultClassNames.push(...classes);
			}

			if (extraClasses[themeClassName]) {
				resultClassNames.push(extraClasses[themeClassName]);
			}

			if (this._theme[themeClassName]) {
				resultClassNames.push(this._theme[themeClassName]);
			} else {
				resultClassNames.push(this._registeredBaseTheme![themeClassName]);
			}
			return resultClassNames.join(' ');
		}

		private _recalculateThemeClasses() {
			let { theme: themeProp = {}, classes = {} } = this.properties;
			let theme: Theme;

			if (isThemeWithVariant(themeProp)) {
				theme = isThemeWithVariants(themeProp.theme) ? themeProp.theme.theme : themeProp.theme;
			} else {
				theme = themeProp;
			}

			if (!this._registeredBaseTheme) {
				const baseThemes = this.getDecorator('baseThemeClasses');
				if (baseThemes.length === 0) {
					console.warn(
						'A base theme has not been provided to this widget. Please use the @theme decorator to add a theme.'
					);
				}
				this._registeredBaseTheme = baseThemes.reduce((finalBaseTheme, baseTheme) => {
					const { [THEME_KEY]: key, ...classes } = baseTheme;
					this._registeredBaseThemeKeys.push(key);
					return { ...finalBaseTheme, ...classes };
				}, {});
				this._baseThemeClassesReverseLookup = createThemeClassesLookup(baseThemes);
			}

			this._theme = this._registeredBaseThemeKeys.reduce((baseTheme, themeKey) => {
				return { ...baseTheme, ...theme[themeKey] };
			}, {});

			this._classes = Object.keys(classes).reduce((computed, key) => {
				if (this._registeredBaseThemeKeys.indexOf(key) > -1) {
					computed = { ...computed, [key]: classes[key] };
				}
				return computed;
			}, {});

			this._recalculateClasses = false;
		}
	}

	return Themed;
}

export default ThemedMixin;
