const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');

import { renderer, tsx, create, invalidator } from '../../../../src/core/vdom';
import theme from '../../../../src/core/middleware/theme';
import { createResolvers } from './../../support/util';

const resolvers = createResolvers();

jsdomDescribe('theme middleware', () => {
	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
	});

	it('Should register injector and allow theme to be set', () => {
		const factory = create({ theme });
		const css = {
			' _key': 'test-key',
			root: 'root'
		};
		const widgetTheme = {
			'test-key': {
				root: 'themed-root'
			}
		};
		const App = factory(function App({ middleware: { theme } }) {
			const themedCss = theme.classes(css);
			return (
				<div>
					<div classes={themedCss.root} />
					<button
						onclick={() => {
							theme.set(widgetTheme);
						}}
					/>
					<div>{JSON.stringify(theme.get())}</div>
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="root"></div><button></button><div></div></div></div>'
		);
		(root.children[0].children[1] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="themed-root"></div><button></button><div>{"theme":{"test-key":{"root":"themed-root"}}}</div></div></div>'
		);
	});

	it('should allow theme with variant to be set and return details in get', () => {
		const factory = create({ theme });
		const css = {
			' _key': 'test-key',
			root: 'root'
		};
		const widgetTheme = {
			theme: {
				'test-key': {
					root: 'themed-root'
				}
			},
			variants: {
				default: {
					root: 'default root'
				},
				light: {
					root: 'light root'
				}
			}
		};
		const App = factory(function App({ middleware: { theme } }) {
			const themedCss = theme.classes(css);
			return (
				<div>
					<div classes={themedCss.root} />
					<button
						onclick={() => {
							theme.set(widgetTheme);
						}}
					/>
					<button
						onclick={() => {
							theme.set(widgetTheme, 'light');
						}}
					/>
					<button
						onclick={() => {
							theme.set(widgetTheme, { name: 'custom', value: { root: 'custom variant' } });
						}}
					/>
					<div>{JSON.stringify(theme.get())}</div>
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="root"></div><button></button><button></button><button></button><div></div></div></div>'
		);
		(root.children[0].children[1] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="themed-root"></div><button></button><button></button><button></button><div>{"theme":{"theme":{"test-key":{"root":"themed-root"}},"variants":{"default":{"root":"default root"},"light":{"root":"light root"}}},"variant":{"name":"default","value":{"root":"default root"}}}</div></div></div>'
		);
		(root.children[0].children[2] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="themed-root"></div><button></button><button></button><button></button><div>{"theme":{"theme":{"test-key":{"root":"themed-root"}},"variants":{"default":{"root":"default root"},"light":{"root":"light root"}}},"variant":{"name":"light","value":{"root":"light root"}}}</div></div></div>'
		);
		(root.children[0].children[3] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="themed-root"></div><button></button><button></button><button></button><div>{"theme":{"theme":{"test-key":{"root":"themed-root"}},"variants":{"default":{"root":"default root"},"light":{"root":"light root"}}},"variant":{"name":"custom","value":{"root":"custom variant"}}}</div></div></div>'
		);
	});

	it('Should use theme property over injected theme', () => {
		const factory = create({ theme, invalidator });
		const css = {
			' _key': 'test-key',
			root: 'root',
			other: 'other'
		};
		const overrideWidgetTheme = {
			'test-key': {
				root: 'override-themed-root'
			}
		};
		let currentTheme: any;
		const ThemedWidget = factory(function App({ middleware: { theme } }) {
			const themedCss = theme.classes(css);
			return <div classes={[themedCss.root, themedCss.other]} />;
		});
		const App = factory(function App({ middleware: { theme, invalidator } }) {
			const themedCss = theme.classes(css);
			return (
				<div>
					<ThemedWidget theme={currentTheme} />
					<button
						classes={themedCss.root}
						onclick={() => {
							invalidator();
						}}
					/>
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="root other"></div><button class="root"></button></div></div>'
		);
		currentTheme = overrideWidgetTheme;
		(root.children[0].children[1] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="override-themed-root other"></div><button class="root"></button></div></div>'
		);
		currentTheme = undefined;
		(root.children[0].children[1] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="root other"></div><button class="root"></button></div></div>'
		);
		(root.children[0].children[1] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="root other"></div><button class="root"></button></div></div>'
		);
	});

	it('classes should be decorated onto the theme', () => {
		const factory = create({ theme });
		const css = {
			' _key': 'test-key',
			root: 'root'
		};
		const widgetTheme = {
			'test-key': {
				root: 'themed-root'
			}
		};
		const App = factory(function App({ middleware: { theme } }) {
			const themedCss = theme.classes(css);
			return (
				<div>
					<div classes={themedCss.root} />
					<button
						onclick={() => {
							theme.set(widgetTheme);
						}}
					/>
					<div>{JSON.stringify(theme.get())}</div>
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => (
			<App classes={{ 'test-key': { root: ['classes-root'], unknown: ['classes-unknown'] } }} />
		));
		r.mount({ domNode: root });
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="root classes-root"></div><button></button><div></div></div></div>'
		);
		(root.children[0].children[1] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(
			root.outerHTML,
			'<div><div><div class="themed-root classes-root"></div><button></button><div>{"theme":{"test-key":{"root":"themed-root"}}}</div></div></div>'
		);
	});

	it('returns theme variant class', () => {
		const factory = create({ theme });
		const themeWithVariant = {
			theme: {
				theme: {
					'test-key': {
						root: 'themed-root'
					}
				},
				variants: {
					default: {
						root: 'variant-root'
					}
				}
			},
			variant: {
				name: 'default',
				value: {
					root: 'variant-root'
				}
			}
		};

		const App = factory(function App({ middleware: { theme } }) {
			const variantRoot = theme.variant();
			return <div classes={variantRoot} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App theme={themeWithVariant} />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div class="variant-root"></div>');
	});

	it('returns injected theme variant class', () => {
		const factory = create({ theme });
		const themeWithVariant = {
			theme: {
				theme: {
					'test-key': {
						root: 'themed-root'
					}
				},
				variants: {
					default: {
						root: 'variant-root'
					}
				}
			}
		};

		const App = factory(function App({ middleware: { theme } }) {
			theme.set(themeWithVariant.theme, 'default');
			const variantRoot = theme.variant();
			return <div classes={variantRoot} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div class="variant-root"></div>');
	});

	it('Should use the newly set global theme', () => {
		const factory = create({ theme });

		const css = {
			' _key': 'test-key',
			root: 'root'
		};
		const themeWithVariant = {
			theme: {
				theme: {
					'test-key': {
						root: 'themed-root'
					}
				},
				variants: {
					default: {
						root: 'variant-root'
					}
				}
			}
		};

		const App = factory(function App({ middleware: { theme } }) {
			theme.set(themeWithVariant.theme);
			return <div classes={theme.classes(css).root} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div class="themed-root"></div>');
	});

	it('selects default variant theme with variants is set', () => {
		const factory = create({ theme });
		const themeWithVariants = {
			theme: {
				'test-key': {
					root: 'themed-root'
				}
			},
			variants: {
				default: {
					root: 'default-variant-root'
				}
			}
		};

		const App = factory(function App({ middleware: { theme } }) {
			const variantRoot = theme.variant();
			return (
				<div classes={variantRoot}>
					<button
						onclick={() => {
							theme.set(themeWithVariants);
						}}
					/>
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		(root.children[0].children[0] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(root.innerHTML, '<div class="default-variant-root"><button></button></div>');
	});

	it('selects keyes variant theme with variants is set with variant key', () => {
		const factory = create({ theme });
		const themeWithVariants = {
			theme: {
				'test-key': {
					root: 'themed-root'
				}
			},
			variants: {
				default: {
					root: 'default-variant-root'
				},
				foo: {
					root: 'foo-variant-root'
				}
			}
		};

		const App = factory(function App({ middleware: { theme } }) {
			const variantRoot = theme.variant();
			return (
				<div classes={variantRoot}>
					<button
						onclick={() => {
							theme.set(themeWithVariants, 'foo');
						}}
					/>
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		(root.children[0].children[0] as HTMLButtonElement).click();
		resolvers.resolve();
		assert.strictEqual(root.innerHTML, '<div class="foo-variant-root"><button></button></div>');
	});

	it('selects specific variant when passed', () => {
		const factory = create({ theme });
		const themeWithVariants = {
			theme: {
				'test-key': {
					root: 'themed-root'
				}
			},
			variants: {
				default: {
					root: 'default-variant-root'
				},
				foo: {
					root: 'foo-variant-root'
				}
			}
		};

		const App = factory(function App({ middleware: { theme } }) {
			const variantRoot = theme.variant();
			return <div classes={variantRoot} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => (
			<App
				theme={{ theme: themeWithVariants, variant: { name: 'foo', value: themeWithVariants.variants.foo } }}
			/>
		));
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div class="foo-variant-root"></div>');
	});

	it('selects specific variant when key passed', () => {
		const factory = create({ theme });
		const themeWithVariants = {
			theme: {
				'test-key': {
					root: 'themed-root'
				}
			},
			variants: {
				default: {
					root: 'default-variant-root'
				},
				bar: {
					root: 'bar-variant-root'
				}
			}
		};

		const App = factory(function App({ middleware: { theme } }) {
			const variantRoot = theme.variant();
			return <div classes={variantRoot} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => (
			<App
				theme={{ theme: themeWithVariants, variant: { name: 'bar', value: themeWithVariants.variants.bar } }}
			/>
		));
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div class="bar-variant-root"></div>');
	});
});
