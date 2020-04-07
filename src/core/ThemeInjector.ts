import { Theme, ThemeWithVariants, ThemeWithVariant, Variant } from './interfaces';
import Injector from './Injector';

function isThemeVariantConfig(theme: Theme | ThemeWithVariants | ThemeWithVariant): theme is ThemeWithVariants {
	return theme.hasOwnProperty('variants');
}

function isVariantModule(variant: string | Variant): variant is Variant {
	return typeof variant !== 'string';
}

function createThemeInjectorPayload(theme: Theme | ThemeWithVariants | ThemeWithVariant, variant?: string | Variant) {
	if (isThemeVariantConfig(theme)) {
		variant = variant || 'default';
		if (isVariantModule(variant)) {
			return { theme: theme.theme, variant };
		}

		return { theme: theme.theme, variant: theme.variants[variant] };
	}
	return theme;
}

export class ThemeInjector extends Injector {
	constructor(theme?: Theme | ThemeWithVariants | ThemeWithVariant) {
		theme = theme ? createThemeInjectorPayload(theme) : theme;
		super(theme);
	}

	set<T extends ThemeWithVariants>(theme: T, variant?: keyof T['variants'] | Variant): void;
	set(theme: ThemeWithVariant): void;
	set(theme: Theme): void;
	set(theme: Theme | ThemeWithVariants | ThemeWithVariant, variant?: string | Variant) {
		super.set(createThemeInjectorPayload(theme, variant));
	}
}

export default ThemeInjector;
