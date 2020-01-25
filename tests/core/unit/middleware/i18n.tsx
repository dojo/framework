const { it, beforeEach, afterEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');

import global from '../../../../src/shim/global';
import { renderer, tsx, create } from '../../../../src/core/vdom';
import i18n from '../../../../src/core/middleware/i18n';
import { setCldrLoaders, setDefaultLocale, setLocale, setSupportedLocales } from '../../../../src/i18n/i18n';
import { createResolvers } from './../../support/util';

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

describe('i18n middleware', () => {
	beforeEach(async () => {
		resolvers.stub();
		setDefaultLocale('en');
		setSupportedLocales(['en', 'es']);
		setCldrLoaders({});
		await setLocale('en');
	});

	afterEach(() => {
		resolvers.restore();
		localeLoader = Promise.resolve<any>([]);
	});

	it('Should return the base locale', () => {
		const root = global.document.createElement('div');
		const factory = create({ i18n });
		const bundle = {
			messages: { foo: 'hello, {name}' }
		};
		const App = factory(({ middleware: { i18n } }) => {
			const { messages, format, isPlaceholder } = i18n.localize(bundle);
			return (
				<div>
					<div>{JSON.stringify(messages)}</div>
					<div>{format('foo', { name: 'John' })}</div>
					<div>{`${isPlaceholder}`}</div>
					<div>{JSON.stringify(i18n.get())}</div>
					<button
						onclick={() => {
							i18n.set({ locale: 'es' });
						}}
					>
						es
					</button>
				</div>
			);
		});
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":"hello, {name}"}</div><div>hello, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
	});

	it('should support changing locales via the injector', async () => {
		const root = global.document.createElement('div');
		const factory = create({ i18n });

		const es = createAyncMessageLoader();
		const bundle = {
			messages: { foo: 'hello, {name}' },
			locales: {
				es: es.loader
			}
		};
		const App = factory(({ middleware: { i18n } }) => {
			const { messages, format, isPlaceholder } = i18n.localize(bundle);
			return (
				<div>
					<div>{JSON.stringify(messages)}</div>
					<div>{format('foo', { name: 'John' })}</div>
					<div>{`${isPlaceholder}`}</div>
					<div>{JSON.stringify(i18n.get())}</div>
					<button
						onclick={() => {
							i18n.set({ locale: 'es' });
						}}
					>
						es
					</button>
				</div>
			);
		});
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":"hello, {name}"}</div><div>hello, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
		root.children[0].children[4].click();
		await localeLoader;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":""}</div><div></div><div>true</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
		es.resolver({ default: { foo: 'holla, {name}' } });
		await es.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":"holla, {name}"}</div><div>holla, John</div><div>false</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
	});

	it('should resolve single override i18n bundle property', async () => {
		const root = global.document.createElement('div');
		const factory = create({ i18n });

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
		const App = factory(({ middleware: { i18n } }) => {
			const { messages, format, isPlaceholder } = i18n.localize(bundle);
			return (
				<div>
					<div>{JSON.stringify(messages)}</div>
					<div>{format('foo', { name: 'John' })}</div>
					<div>{`${isPlaceholder}`}</div>
					<div>{JSON.stringify(i18n.get())}</div>
					<button
						onclick={() => {
							i18n.set({ locale: 'es' });
						}}
					>
						es
					</button>
				</div>
			);
		});
		const r = renderer(() => <App i18nBundle={overrideBundle} />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":"Oi, {name}"}</div><div>Oi, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
		root.children[0].children[4].click();
		await localeLoader;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":""}</div><div></div><div>true</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
		overrideEs.resolver({ default: { foo: 'bonjour, {name}' } });
		await overrideEs.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":"bonjour, {name}"}</div><div>bonjour, John</div><div>false</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
	});

	it('should resolve override i18n bundle map property', async () => {
		const root = global.document.createElement('div');
		const factory = create({ i18n });

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
		const App = factory(({ middleware: { i18n } }) => {
			const { messages, format, isPlaceholder } = i18n.localize(bundle);
			return (
				<div>
					<div>{JSON.stringify(messages)}</div>
					<div>{format('foo', { name: 'John' })}</div>
					<div>{`${isPlaceholder}`}</div>
					<div>{JSON.stringify(i18n.get())}</div>
					<button
						onclick={() => {
							i18n.set({ locale: 'es' });
						}}
					>
						es
					</button>
				</div>
			);
		});
		const i18nBundleMap = new Map();
		i18nBundleMap.set(bundle, overrideBundle);
		const r = renderer(() => <App i18nBundle={i18nBundleMap} />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":"Oi, {name}"}</div><div>Oi, John</div><div>false</div><div>{}</div><button>es</button></div>'
		);
		root.children[0].children[4].click();
		await localeLoader;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":""}</div><div></div><div>true</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
		overrideEs.resolver({ default: { foo: 'bonjour, {name}' } });
		await overrideEs.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"foo":"bonjour, {name}"}</div><div>bonjour, John</div><div>false</div><div>{"locale":"es"}</div><button>es</button></div>'
		);
	});
});
