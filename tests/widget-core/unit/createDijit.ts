import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createDijit from 'src/createDijit';
import * as Dijit from '../support/dijit/Dijit';

registerSuite({
	name: 'createDijit',
	creation: {
		'no options'() {
			const dijit = createDijit();
			assert.isUndefined(dijit.Ctor);
			assert.isUndefined(dijit.params);
		},
		'with dijit constructor'() {
			const dijit = createDijit({
				Ctor: Dijit
			});

			assert.strictEqual(dijit.Ctor, Dijit);
		},
		'with mid'() {
			const dijit = createDijit({
				Ctor: 'tests/support/dijit/Dijit'
			});

			assert.strictEqual(dijit.Ctor, 'tests/support/dijit/Dijit');
		},
		'with params'() {
			const params = { foo: 'bar' };
			const dijit = createDijit({
				params: params
			});
			assert.strictEqual(dijit.params, params);
		}
	},
	'.setState()': {
		'configure'() {
			const dfd = this.async();

			const dijit = createDijit();
			dijit.setState({
				Ctor: 'tests/support/dijit/Dijit',
				params: { foo: 'bar' }
			});

			setTimeout(dfd.callback(() => {
				assert.strictEqual(dijit.Ctor, 'tests/support/dijit/Dijit');
				assert.deepEqual(dijit.params, { foo: 'bar' });
			}), 10);
		}
	},
	'render()': {
		'tagName'() {
			const dijit = createDijit({
				tagName: 'button'
			});
			const vnode = dijit.render();
			assert.strictEqual(vnode.vnodeSelector, 'button');
		},
		'afterCreate'() {
			const dfd = this.async();

			const dijit = createDijit({
				Ctor: Dijit,
				params: { foo: 'bar' }
			});
			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			assert.isUndefined(dijit.dijit);
			vnode.properties.afterCreate(domNode, {}, vnode.vnodeSelector, {}, []);
			setTimeout(dfd.callback(() => {
				assert.strictEqual(dijit.dijit.domNode, domNode);
				assert.strictEqual(dijit.dijit.srcNodeRef, domNode);
				assert.deepEqual(dijit.dijit.params, { foo: 'bar' });
				assert.deepEqual(dijit.dijit._startupCalled, 1);
				assert.deepEqual(dijit.dijit._destroyCalled, 0);
			}), 10);
		},
		'afterCreate w/ mid'() {
			const dfd = this.async();

			const dijit = createDijit<Dijit>({
				Ctor: 'tests/support/dijit/Dijit',
				params: { foo: 'bar' }
			});
			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			assert.isUndefined(dijit.dijit);
			vnode.properties.afterCreate(domNode, {}, vnode.vnodeSelector, vnode.properties, vnode.children);
			setTimeout(dfd.callback(() => {
				assert.strictEqual(dijit.dijit.domNode, domNode);
				assert.strictEqual(dijit.dijit.srcNodeRef, domNode);
				assert.deepEqual(dijit.dijit.params, { foo: 'bar' });
				assert.deepEqual(dijit.dijit._startupCalled, 1);
				assert.deepEqual(dijit.dijit._destroyCalled, 0);
			}), 10);
		},
		'afterCreate w/ load from cache'() {
			const dfd = this.async();

			const dijit = createDijit<Dijit>({
				Ctor: 'tests/support/dijit/Dijit',
				params: { foo: 'bar' }
			});
			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			assert.isUndefined(dijit.dijit);
			vnode.properties.afterCreate(domNode, {}, vnode.vnodeSelector, vnode.properties, vnode.children);
			setTimeout(dfd.callback(() => {
				assert.strictEqual(dijit.dijit.domNode, domNode);
				assert.strictEqual(dijit.dijit.srcNodeRef, domNode);
				assert.deepEqual(dijit.dijit.params, { foo: 'bar' });
				assert.deepEqual(dijit.dijit._startupCalled, 1);
				assert.deepEqual(dijit.dijit._destroyCalled, 0);
			}), 10);
		},
		'afterCreate w/ no Ctor'() {
			const dfd = this.async(100);

			const dijit = createDijit();

			dijit.on('error', dfd.callback((event: any) => {
				assert.strictEqual(event.type, 'error');
				assert.instanceOf(event.error, Error);
				assert.strictEqual(event.target, dijit);
			}));

			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			vnode.properties.afterCreate(domNode, {}, vnode.vnodeSelector, {}, []);
		},
		'afterCreate w/ bad mid'() {
			const dfd = this.async();

			const dijit = createDijit({
				Ctor: 'this/is/not/going/to/work'
			});

			dijit.on('error', dfd.callback((event: any) => {
				assert.strictEqual(event.type, 'error');
				assert.instanceOf(event.error, Error);
				assert.strictEqual(event.target, dijit);
			}));

			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			vnode.properties.afterCreate(domNode, {}, vnode.vnodeSelector, vnode.properties, vnode.children);
		},
		'afterCreate w/ Ctor throws'() {
			const dfd = this.async(100);

			const dijit = createDijit({
				Ctor: Dijit,
				params: { throws: true }
			});

			dijit.on('error', dfd.callback((event: any) => {
				assert.strictEqual(event.type, 'error');
				assert.instanceOf(event.error, Error);
				assert.strictEqual(event.target, dijit);
			}));

			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			vnode.properties.afterCreate(domNode, {}, vnode.vnodeSelector, vnode.properties, vnode.children);
		},
		'afterCreate - new dom node'() {
			const dfd = this.async();
			const dijit = createDijit({
				Ctor: Dijit,
				params: { foo: 'bar' }
			});
			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			document.body.appendChild(domNode);
			const afterCreate = vnode.properties.afterCreate;
			afterCreate(domNode, {}, vnode.vnodeSelector, {}, []);
			setTimeout(dfd.callback(() => {
				assert(dijit.dijit);
				const newVNode = dijit.render();
				assert.strictEqual(newVNode.properties.afterCreate, afterCreate, 'should not change listeners');
				document.body.removeChild(domNode);
				const newDomNode = document.createElement(vnode.vnodeSelector);
				document.body.appendChild(newDomNode);
				assert.isNull(dijit.dijit.domNode.parentNode);
				afterCreate(newDomNode, {}, vnode.vnodeSelector, {}, []);
				assert.strictEqual(dijit.dijit.domNode, domNode);
				assert.strictEqual(dijit.dijit.domNode.parentNode, document.body);
			}), 10);
		}
	},
	'destroy()': {
		'before dijit creation'() {
			const dijit = createDijit({
				Ctor: Dijit,
				params: { foo: 'bar' }
			});

			return dijit.destroy();
		},
		'after dijit creation'() {
			const dfd = this.async();
			const dijit = createDijit({
				Ctor: Dijit
			});

			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			const afterCreate = vnode.properties.afterCreate;
			afterCreate(domNode, {}, vnode.vnodeSelector, {}, []);
			setTimeout(() => {
				const dijitWidget = dijit.dijit;
				assert.strictEqual(dijitWidget._destroyCalled, 0);
				dijit.destroy()
					.then(dfd.callback(() => {
						assert.strictEqual(dijitWidget._destroyCalled, 1);
					}));
			}, 10);
		}
	}
});
