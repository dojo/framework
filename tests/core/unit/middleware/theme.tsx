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
			'<div><div><div class="themed-root"></div><button></button><div>{"test-key":{"root":"themed-root"}}</div></div></div>'
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
			'<div><div><div class="themed-root classes-root"></div><button></button><div>{"test-key":{"root":"themed-root"}}</div></div></div>'
		);
	});
});
