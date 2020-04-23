import { Theme, ThemeWithVariants, ThemeWithVariant, NamedVariant } from './interfaces';
import Injector from './Injector';

export interface ThemeWithVariantsInjectorPayload {
	theme: ThemeWithVariants;
	variant: NamedVariant;
}

export interface ThemeInjectorPayload {
	theme: Theme;
}

export function isVariantModule(variant: string | NamedVariant): variant is NamedVariant {
	return typeof variant !== 'string';
}

export function isThemeWithVariant(theme: Theme | ThemeWithVariants | ThemeWithVariant): theme is ThemeWithVariant {
	return theme && theme.hasOwnProperty('variant');
}

export function isThemeWithVariants(theme: Theme | ThemeWithVariants | ThemeWithVariant): theme is ThemeWithVariants {
	return theme && theme.hasOwnProperty('variants');
}

export function isThemeInjectorPayloadWithVariant(
	theme: ThemeInjectorPayload | ThemeWithVariantsInjectorPayload
): theme is ThemeWithVariantsInjectorPayload {
	return theme && theme.hasOwnProperty('variant');
}

function createThemeInjectorPayload(
	theme: Theme | ThemeWithVariants | ThemeWithVariant,
	variant?: string | NamedVariant
): ThemeWithVariantsInjectorPayload | ThemeInjectorPayload {
	if (isThemeWithVariant(theme)) {
		if (typeof theme.variant === 'string') {
			return {
				theme: theme.theme,
				variant: { name: theme.variant, variant: theme.theme.variants[theme.variant] }
			};
		}
		return { theme: theme.theme, variant: theme.variant };
	} else if (isThemeWithVariants(theme)) {
		variant = variant || 'default';
		if (isVariantModule(variant)) {
			return { theme, variant };
		}

		return { theme: theme, variant: { name: variant, variant: theme.variants[variant] } };
	}
	return { theme };
}

export class ThemeInjector extends Injector {
	constructor(theme?: Theme | ThemeWithVariants | ThemeWithVariant) {
		super(theme ? createThemeInjectorPayload(theme) : theme);
	}

	set<T extends ThemeWithVariants>(theme: T, variant?: keyof T['variants'] | NamedVariant): void;
	set(theme: ThemeWithVariant): void;
	set(theme: Theme): void;
	set(theme: Theme | ThemeWithVariants | ThemeWithVariant, variant?: string | NamedVariant) {
		super.set(createThemeInjectorPayload(theme, variant));
	}

	get(): ThemeWithVariantsInjectorPayload | ThemeInjectorPayload {
		return super.get();
	}
}

export default ThemeInjector;
