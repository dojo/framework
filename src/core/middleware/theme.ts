import { create, invalidator, diffProperties, injector } from '../vdom';
import cache from './cache';
import { SupportedClassName } from '../interfaces';
import Injector from '../Injector';

export interface ClassNames {
	[key: string]: string;
}

/**
 * A lookup object for available widget classes names
 */
export interface Theme {
	[key: string]: object;
}

/**
 * Classes property interface
 */
export interface Classes {
	[widgetKey: string]: {
		[classKey: string]: SupportedClassName[];
	};
}

export interface ThemedProperties {
	theme?: Theme;
	classes?: Classes;
}

const THEME_KEY = ' _key';

const factory = create({ invalidator, cache, diffProperties, injector }).properties<ThemedProperties>();

export const theme = factory(({ middleware: { invalidator, cache, diffProperties, injector }, properties }) => {
	diffProperties((current: ThemedProperties, next: ThemedProperties) => {
		if (current.theme !== next.theme) {
			cache.clear();
			invalidator();
		}
	});
	injector.subscribe('__theme_injector', () => {
		cache.clear();
		invalidator();
	});
	return {
		get<T extends ClassNames>(css: T): T {
			let theme = cache.get<T>(css);
			if (theme) {
				return theme;
			}
			const { [THEME_KEY]: key, ...classes } = css;
			theme = classes as T;
			let currentTheme = properties.theme;
			if (!currentTheme) {
				const injectedTheme = injector.get<Injector<Theme | undefined>>('__theme_injector');
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
		set(css?: Theme) {
			const currentTheme = injector.get<Injector<Theme | undefined>>('__theme_injector');
			if (currentTheme) {
				currentTheme.set(css);
			}
		}
	};
});

export default theme;
