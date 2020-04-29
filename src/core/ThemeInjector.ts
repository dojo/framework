import global from '../shim/global';
import { Theme, ThemeWithVariants, ThemeWithVariant, NamedVariant } from './interfaces';
import Injector from './Injector';
import cssVars from '../shim/cssVariables';
import Map from '../shim/Map';
import has from './has';

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
	theme: ThemeInjectorPayload | ThemeWithVariantsInjectorPayload | undefined
): theme is ThemeWithVariantsInjectorPayload {
	return !!theme && theme.hasOwnProperty('variant');
}

let processCssVariant = function(_: string) {};

if (!has('dom-css-variables')) {
	const setUpCssVariantSupport = () => {
		const styleId = '__dojo_processed_styles';
		const processedCssMap = new Map<string, string>();
		let variantStyleElement: HTMLStyleElement | undefined;

		function applyStyles(css: string) {
			const style = document.createElement('style');
			style.textContent = css;
			style.setAttribute('id', styleId);
			if (variantStyleElement && variantStyleElement.parentNode) {
				variantStyleElement.parentNode.replaceChild(style, variantStyleElement);
			} else {
				global.document.head.appendChild(style);
			}
			variantStyleElement = style;
		}

		return function processCssVariant(variantName: string) {
			const processedCss = processedCssMap.get(variantName);
			if (processedCss) {
				applyStyles(processedCss);
			} else {
				cssVars({
					exclude: `style[id=${styleId}]`,
					onSuccess: (css) => {
						let temp = css;
						let index = temp.indexOf(variantName);
						let variantCss = '';
						while (index !== -1) {
							temp = temp.substring(index + variantName.length);
							const match = temp.match(/\{([^}]+)\}/);
							if (match) {
								if (variantCss) {
									variantCss = `${variantCss.substring(0, variantCss.length - 1)}${match[0].substring(
										1
									)}`;
								} else {
									variantCss = match[0];
								}
							}
							index = temp.indexOf(variantName);
						}
						if (variantCss) {
							css = `:root ${variantCss}${css}`;
						}
						return css;
					},
					onComplete: (css) => {
						processedCssMap.set(variantName, css);
						applyStyles(css);
					},
					updateDOM: false,
					silent: true
				});
			}
		};
	};
	processCssVariant = setUpCssVariantSupport();
}

function createThemeInjectorPayload(
	theme: Theme | ThemeWithVariants | ThemeWithVariant,
	variant?: string | NamedVariant
): ThemeWithVariantsInjectorPayload | ThemeInjectorPayload {
	if (isThemeWithVariant(theme)) {
		if (typeof theme.variant === 'string') {
			return {
				theme: theme.theme,
				variant: { name: theme.variant, value: theme.theme.variants[theme.variant] }
			};
		}
		return { theme: theme.theme, variant: theme.variant };
	} else if (isThemeWithVariants(theme)) {
		variant = variant || 'default';
		if (isVariantModule(variant)) {
			if (!has('dom-css-variables')) {
				processCssVariant(variant.value.root);
			}
			return { theme, variant };
		}
		if (!has('dom-css-variables')) {
			processCssVariant(theme.variants[variant].root);
		}

		return { theme: theme, variant: { name: variant, value: theme.variants[variant] } };
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

	get(): ThemeWithVariantsInjectorPayload | ThemeInjectorPayload | undefined {
		return super.get();
	}
}

export default ThemeInjector;
