import { Theme, Classes, ClassNames, ThemeWithVariant, ThemeWithVariants, NamedVariant } from './../interfaces';
import { create, invalidator, diffProperty, getRegistry } from '../vdom';
import icache from './icache';
import injector from './injector';
import Set from '../../shim/Set';
import { shallow, auto } from '../diff';
import Registry from '../Registry';
import {
	ThemeInjector,
	isThemeInjectorPayloadWithVariant,
	isThemeWithVariants,
	isThemeWithVariant,
	ThemeInjectorPayload,
	ThemeWithVariantsInjectorPayload
} from '../ThemeInjector';

export { Theme, Classes, ClassNames } from './../interfaces';

export interface ThemeProperties {
	theme?: Theme | ThemeWithVariant;
	classes?: Classes;
}

export const THEME_KEY = ' _key';

export const INJECTED_THEME_KEY = '__theme_injector';

function registerThemeInjector(theme: Theme | ThemeWithVariant | undefined, themeRegistry: Registry): ThemeInjector {
	const themeInjector = new ThemeInjector(theme);
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
			const themeInjector = injector.get<ThemeInjector>(INJECTED_THEME_KEY);
			const diffResult = auto(current.theme, next.theme);
			if (diffResult.changed) {
				icache.clear();
				invalidator();
			}

			if (!next.theme && themeInjector) {
				const themePayload = themeInjector.get();
				if (isThemeInjectorPayloadWithVariant(themePayload)) {
					return { theme: themePayload.theme, variant: themePayload.variant };
				} else if (themePayload) {
					return themePayload.theme;
				}
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
		function set<T extends ThemeWithVariants>(theme: T, variant?: keyof T['variants'] | NamedVariant): void;
		function set<T extends ThemeWithVariants>(
			theme: Theme | T,
			variant?: keyof T['variants'] | NamedVariant
		): void {
			const currentTheme = injector.get<ThemeInjector>(INJECTED_THEME_KEY);
			if (currentTheme) {
				if (isThemeWithVariants(theme)) {
					currentTheme.set(theme, variant);
				} else {
					currentTheme.set(theme);
				}
			}
		}

		return {
			classes<T extends ClassNames>(css: T): T {
				const cachedTheme = icache.get<T>(css);
				if (cachedTheme) {
					return cachedTheme;
				}
				const { [THEME_KEY]: key, ...classes } = css;
				themeKeys.add(key);
				let theme = classes as ClassNames;
				let { theme: currentTheme, classes: currentClasses } = properties();

				if (currentTheme && isThemeWithVariant(currentTheme)) {
					currentTheme = isThemeWithVariants(currentTheme.theme)
						? currentTheme.theme.theme
						: currentTheme.theme;
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
				return theme as T;
			},
			variant() {
				const { theme } = properties();
				if (theme && isThemeWithVariant(theme)) {
					return theme.variant.value.root;
				} else {
					const themeInjector = injector.get<ThemeInjector>(INJECTED_THEME_KEY);
					if (themeInjector) {
						const themePayload = themeInjector.get();
						if (isThemeInjectorPayloadWithVariant(themePayload)) {
							return themePayload.variant.value.root;
						}
					}
				}
			},
			set,
			get(): ThemeWithVariantsInjectorPayload | ThemeInjectorPayload | undefined {
				const currentTheme = injector.get<ThemeInjector>(INJECTED_THEME_KEY);
				if (currentTheme) {
					return currentTheme.get();
				}
			}
		};
	}
);

export default theme;
