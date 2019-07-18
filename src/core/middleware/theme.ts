import { create, invalidator, diffProperty, getRegistry } from '../vdom';
import cache from './cache';
import injector from './injector';
import Injector from '../Injector';
import Set from '../../shim/Set';
import { registerThemeInjector, Theme, Classes, ClassNames, INJECTED_THEME_KEY, THEME_KEY } from '../mixins/Themed';
import { shallow } from '../diff';

export interface ThemedProperties {
	theme?: Theme;
	classes?: Classes;
}

const factory = create({ invalidator, cache, diffProperty, injector, getRegistry }).properties<ThemedProperties>();

export const theme = factory((options) => {
	const { invalidator, cache, diffProperty, injector, getRegistry } = options.middleware;
	let themeKeys = new Set();
	diffProperty('theme', (current: ThemedProperties, next: ThemedProperties) => {
		if (current.theme !== next.theme) {
			cache.clear();
			invalidator();
		}
	});
	diffProperty('classes', (current: ThemedProperties, next: ThemedProperties) => {
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
			let theme = cache.get(css);
			const properties = options.properties;
			if (theme) {
				return theme;
			}
			const { [THEME_KEY]: key, ...classes } = css;
			themeKeys.add(key);
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
});

export default theme;
