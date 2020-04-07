const { it, beforeEach, afterEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');

import global from '../../../../src/shim/global';
import Map from '../../../../src/shim/Map';
import { renderer, tsx } from '../../../../src/core/vdom';
import WidgetBase from '../../../../src/core/WidgetBase';
import I18nMixin, { registerI18nInjector } from '../../../../src/core/mixins/I18n';
import { createResolvers } from './../../support/util';
import Registry from '../../../../src/core/Registry';
import { setDefaultLocale, setSupportedLocales, setCldrLoaders, setLocale } from '../../../../src/i18n/i18n';

const resolvers = createResolvers();

function createAyncMessageLoader(): {
	promise: Promise<any>;
	resolver: Function;
	loader: () => any;
} {
	let loaderHelper: any = {};
	loaderHelper.loader = () => {
		loaderHelper.promise = new Promise((resolve) => {
			loaderHelper.resolver = resolve;
		});
		return loaderHelper.promise;
	};
	return loaderHelper;
}

let localeLoader = Promise.resolve<any>([]);

describe('i18n Mixin', () => {
	beforeEach(async () => {
		resolvers.stub();
		setDefaultLocale('en');
		setSupportedLocales(['en', 'es']);
		setCldrLoaders({ es: true });
		await setLocale({ locale: 'en' });
	});

	afterEach(() => {
		resolvers.restore();
		localeLoader = Promise.resolve<any>([]);
	});

	it('Should return the base locale', () => {
		const registry = new Registry();
		const root = global.document.createElement('div');
		const bundle = {
			messages: { foo: 'hello, {name}' }
		};
		const injector = registerI18nInjector({}, registry);

		class App extends I18nMixin(WidgetBase) {
			render() {
				const { messages, format, isPlaceholder } = this.localizeBundle(bundle);
				return (
					<div>
						<div>{JSON.stringify(messages)}</div>
						<div>{format('foo', { name: 'John' })}</div>
						<div>{`${isPlaceholder}`}</div>
						<div>{JSON.stringify(injector.get())}</div>
						<button
							onclick={() => {
								injector.set({ locale: 'es' });
							}}
						>
							es
						</button>
					</div>
				);
			}
		}

		const r = renderer(() => <App />);
		r.mount({ domNode: root, registry });
		assert.strictEqual(
			root.innerHTML,
			'<div lang="en"><div>{"foo":"hello, {name}"}</div><div>hello, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
	});

	it('should support changing locales via the injector', async () => {
		const registry = new Registry();
		const root = global.document.createElement('div');
		const es = createAyncMessageLoader();
		const bundle = {
			messages: { foo: 'hello, {name}' },
			locales: {
				es: es.loader
			}
		};
		const injector = registerI18nInjector({}, registry);
		class App extends I18nMixin(WidgetBase) {
			render() {
				const { messages, format, isPlaceholder } = this.localizeBundle(bundle);
				return (
					<div>
						<div>{JSON.stringify(messages)}</div>
						<div>{format('foo', { name: 'John' })}</div>
						<div>{`${isPlaceholder}`}</div>
						<div>{JSON.stringify(injector.get())}</div>
						<button
							onclick={() => {
								injector.set({ locale: 'es' });
							}}
						>
							es
						</button>
					</div>
				);
			}
		}
		const r = renderer(() => <App />);
		r.mount({ domNode: root, registry });
		assert.strictEqual(
			root.innerHTML,
			'<div lang="en"><div>{"foo":"hello, {name}"}</div><div>hello, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
		root.children[0].children[4].click();
		await localeLoader;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div lang="es"><div>{"foo":""}</div><div></div><div>true</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
		es.resolver({ default: { foo: 'hola, {name}' } });
		await es.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div lang="es"><div>{"foo":"hola, {name}"}</div><div>hola, John</div><div>false</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
	});

	it('should resolve single override i18n bundle property', async () => {
		const registry = new Registry();
		const root = global.document.createElement('div');
		const es = createAyncMessageLoader();
		const overrideEs = createAyncMessageLoader();
		const bundle = {
			messages: { foo: 'hello, {name}' },
			locales: {
				es: es.loader
			}
		};
		const overrideBundle = {
			messages: { foo: 'Oi, {name}' },
			locales: {
				es: overrideEs.loader
			}
		};
		const injector = registerI18nInjector({}, registry);
		class App extends I18nMixin(WidgetBase) {
			render() {
				const { messages, format, isPlaceholder } = this.localizeBundle(bundle);
				return (
					<div>
						<div>{JSON.stringify(messages)}</div>
						<div>{format('foo', { name: 'John' })}</div>
						<div>{`${isPlaceholder}`}</div>
						<div>{JSON.stringify(injector.get())}</div>
						<button
							onclick={() => {
								injector.set({ locale: 'es' });
							}}
						>
							es
						</button>
					</div>
				);
			}
		}
		const r = renderer(() => <App i18nBundle={overrideBundle} />);
		r.mount({ domNode: root, registry });
		assert.strictEqual(
			root.innerHTML,
			'<div lang="en"><div>{"foo":"Oi, {name}"}</div><div>Oi, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
		root.children[0].children[4].click();
		await localeLoader;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div lang="es"><div>{"foo":""}</div><div></div><div>true</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
		overrideEs.resolver({ default: { foo: 'bonjour, {name}' } });
		await overrideEs.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div lang="es"><div>{"foo":"bonjour, {name}"}</div><div>bonjour, John</div><div>false</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
	});

	it('should resolve override i18n bundle map property', async () => {
		const registry = new Registry();
		const root = global.document.createElement('div');
		const es = createAyncMessageLoader();
		const overrideEs = createAyncMessageLoader();
		const bundle = {
			messages: { foo: 'hello, {name}' },
			locales: {
				es: es.loader
			}
		};
		const overrideBundle = {
			messages: { foo: 'Oi, {name}' },
			locales: {
				es: overrideEs.loader
			}
		};
		const injector = registerI18nInjector({}, registry);
		class App extends I18nMixin(WidgetBase) {
			render() {
				const { messages, format, isPlaceholder } = this.localizeBundle(bundle);
				return (
					<div>
						<div>{JSON.stringify(messages)}</div>
						<div>{format('foo', { name: 'John' })}</div>
						<div>{`${isPlaceholder}`}</div>
						<div>{JSON.stringify(injector.get())}</div>
						<button
							onclick={() => {
								injector.set({ locale: 'es' });
							}}
						>
							es
						</button>
					</div>
				);
			}
		}
		const i18nBundleMap = new Map();
		i18nBundleMap.set(bundle, overrideBundle);
		const r = renderer(() => <App i18nBundle={i18nBundleMap} />);
		r.mount({ domNode: root, registry });
		assert.strictEqual(
			root.innerHTML,
			'<div lang="en"><div>{"foo":"Oi, {name}"}</div><div>Oi, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
		root.children[0].children[4].click();
		await localeLoader;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div lang="es"><div>{"foo":""}</div><div></div><div>true</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
		overrideEs.resolver({ default: { foo: 'bonjour, {name}' } });
		await overrideEs.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div lang="es"><div>{"foo":"bonjour, {name}"}</div><div>bonjour, John</div><div>false</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
	});
});
