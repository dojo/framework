import { Theme, Classes, ClassNames, ThemeWithVariant, ThemeWithVariants, Variant } from './../interfaces';
import { create, invalidator, diffProperty, getRegistry } from '../vdom';
import icache from './icache';
import injector from './injector';
import Injector from '../Injector';
import Set from '../../shim/Set';
import { shallow, auto } from '../diff';
import Registry from '../Registry';

export { Theme, Classes, ClassNames } from './../interfaces';

export interface ThemeProperties {
	theme?: Theme | ThemeWithVariant;
	classes?: Classes;
}

export const THEME_KEY = ' _key';

export const INJECTED_THEME_KEY = '__theme_injector';

function isThemeWithVariant(theme: Theme | ThemeWithVariant): theme is ThemeWithVariant {
	return theme && theme.hasOwnProperty('variant');
}

function isThemeWithVariants(theme: Theme | ThemeWithVariants): theme is ThemeWithVariants {
	return theme && theme.hasOwnProperty('variants');
}

function isVariantModule(variant: string | Variant): variant is Variant {
	return typeof variant !== 'string';
}

function registerThemeInjector(theme: any, themeRegistry: Registry): Injector {
	const themeInjector = new Injector(theme);
	themeRegistry.defineInjector(INJECTED_THEME_KEY, (invalidator) => {
		themeInjector.setInvalidator(invalidator);
		return () => themeInjector;
	});
	return themeInjector;
}

const factory = create({ invalidator, icache, diffProperty, injector, getRegistry }).properties<ThemeProperties>();

export const theme = factory(
	({ middleware: { invalidator, icache, diffProperty, injector, getRegistry }, properties }) => {
		let themeKeys = new Set();

		diffProperty('theme', properties, (current, next) => {
			const themeInjector = injector.get<Injector<Theme | undefined>>(INJECTED_THEME_KEY);
			const diffResult = auto(current.theme, next.theme);
			if (diffResult.changed) {
				icache.clear();
				invalidator();
			}

			if (!next.theme && themeInjector) {
				return themeInjector.get();
			}
		});
		diffProperty('classes', (current: ThemeProperties, next: ThemeProperties) => {
			let result = false;
			if ((current.classes && !next.classes) || (!current.classes && next.classes)) {
				result = true;
			} else if (current.classes && next.classes) {
				const keys = [...themeKeys.values()];
				for (let i = 0; i < keys.length; i++) {
					let key = keys[i];
					result = shallow(current.classes[key], next.classes[key], 1).changed;
					if (result) {
						break;
					}
				}
			}
			if (result) {
				icache.clear();
				invalidator();
			}
		});

		const themeInjector = injector.get(INJECTED_THEME_KEY);
		if (!themeInjector) {
			const registry = getRegistry();
			if (registry) {
				registerThemeInjector(undefined, registry.base);
			}
		}
		injector.subscribe(INJECTED_THEME_KEY, () => {
			icache.clear();
			invalidator();
		});

		function set(theme: Theme): void;
		function set<T extends ThemeWithVariants>(theme: T, variant?: keyof T['variants']): void;
		function set<T extends ThemeWithVariants>(theme: Theme | T, variant?: keyof T['variants']): void {
			const currentTheme = injector.get<Injector<Theme | ThemeWithVariant | undefined>>(INJECTED_THEME_KEY);

			if (currentTheme) {
				if (isThemeWithVariants(theme)) {
					theme = { css: theme.css, variant: theme.variants[`${variant || 'default'}`] };
				}

				currentTheme.set(theme);
			}
		}

		return {
			classes<T extends ClassNames>(css: T): T {
				let theme = icache.get<T>(css);
				if (theme) {
					return theme;
				}
				const { [THEME_KEY]: key, ...classes } = css;
				themeKeys.add(key);
				theme = classes as T;
				let { theme: currentTheme, classes: currentClasses } = properties();

				if (currentTheme && isThemeWithVariant(currentTheme)) {
					currentTheme = isThemeWithVariants(currentTheme.css) ? currentTheme.css.css : currentTheme.css;
				}

				if (currentTheme && currentTheme[key]) {
					theme = { ...theme, ...currentTheme[key] };
				}
				if (currentClasses && currentClasses[key]) {
					const classKeys = Object.keys(currentClasses[key]);
					for (let i = 0; i < classKeys.length; i++) {
						const classKey = classKeys[i];
						if (theme[classKey]) {
							theme[classKey] = `${theme[classKey]} ${currentClasses[key][classKey].join(' ')}`;
						}
					}
				}
				icache.set(css, theme, false);
				return theme;
			},
			variant() {
				const { theme } = properties();

				if (theme && isThemeWithVariant(theme)) {
					if (isVariantModule(theme.variant)) {
						return theme.variant.root;
					}

					if (isThemeWithVariants(theme.css)) {
						return theme.css.variants[theme.variant].root;
					}
				}
			},
			set,
			get(): Theme | ThemeWithVariant | undefined {
				const currentTheme = injector.get<Injector<Theme | ThemeWithVariant | undefined>>(INJECTED_THEME_KEY);
				if (currentTheme) {
					return currentTheme.get();
				}
			}
		};
	}
);

export default theme;
