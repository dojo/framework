import { create, invalidator, diffProperties, getRegistry } from '../vdom';
import cache from './cache';
import injector from './injector';
import Injector from '../Injector';
import { registerThemeInjector, Theme, Classes, ClassNames, INJECTED_THEME_KEY, THEME_KEY } from '../mixins/Themed';

export interface ThemedProperties {
	theme?: Theme;
	classes?: Classes;
}

const factory = create({ invalidator, cache, diffProperties, injector, getRegistry }).properties<ThemedProperties>();

export const theme = factory(
	({ middleware: { invalidator, cache, diffProperties, injector, getRegistry }, properties }) => {
		diffProperties((current: ThemedProperties, next: ThemedProperties) => {
			if (current.theme !== next.theme) {
				cache.clear();
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
			cache.clear();
			invalidator();
		});
		return {
			classes<T extends ClassNames>(css: T): T {
				let theme = cache.get<T>(css);
				if (theme) {
					return theme;
				}
				const { [THEME_KEY]: key, ...classes } = css;
				theme = classes as T;
				let currentTheme = properties.theme;
				if (!currentTheme) {
					const injectedTheme = injector.get<Injector<Theme>>(INJECTED_THEME_KEY);
					currentTheme = injectedTheme ? injectedTheme.get() : undefined;
				}
				if (currentTheme && currentTheme[key]) {
					theme = { ...theme, ...currentTheme[key] };
				}
				if (properties.classes && properties.classes[key]) {
					const classKeys = Object.keys(properties.classes[key]);
					for (let i = 0; i < classKeys.length; i++) {
						const classKey = classKeys[i];
						if (theme[classKey]) {
							theme[classKey] = `${theme[classKey]} ${properties.classes[key][classKey].join(' ')}`;
						}
					}
				}
				cache.set(css, theme);
				return theme;
			},
			set(css: Theme): void {
				const currentTheme = injector.get<Injector<Theme | undefined>>(INJECTED_THEME_KEY);
				if (currentTheme) {
					currentTheme.set(css);
				}
			},
			get(): Theme | undefined {
				const currentTheme = injector.get<Injector<Theme | undefined>>(INJECTED_THEME_KEY);
				if (currentTheme) {
					return currentTheme.get();
				}
			}
		};
	}
);

export default theme;
