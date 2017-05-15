import global from '@dojo/core/global';
import has from '@dojo/has/has';
import '@dojo/shim/Promise';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { spy } from 'sinon';
import { v } from '../../../src/d';
import { ProjectorMixin, ProjectorAttachState } from '../../../src/mixins/Projector';
import { beforeRender, WidgetBase } from '../../../src/WidgetBase';
import { waitFor } from '../waitFor';

const Event = global.window.Event;

class TestWidget extends ProjectorMixin(WidgetBase)<any> {}

function dispatchEvent(element: Element, eventType: string) {
	try {
		element.dispatchEvent(new CustomEvent(eventType));
	}
	catch (e) {
		const event = document.createEvent('CustomEvent');
		event.initCustomEvent(eventType, false, false, {});
		element.dispatchEvent(event);
	}
}

function sendAnimationEndEvents(element: Element) {
	dispatchEvent(element, 'webkitTransitionEnd');
	dispatchEvent(element, 'webkitAnimationEnd');
	dispatchEvent(element, 'transitionend');
	dispatchEvent(element, 'animationend');
}

let rafSpy: any;
let cancelRafSpy: any;

registerSuite({
	name: 'mixins/projectorMixin',

	beforeEach() {
		rafSpy = spy(global, 'requestAnimationFrame');
		cancelRafSpy = spy(global, 'cancelAnimationFrame');
	},

	afterEach() {
		rafSpy.restore();
		cancelRafSpy.restore();
	},

	'render throws an error for null result'() {
		const projector = new class extends TestWidget {
			render() {
				return null;
			}
		}();

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'render throws an error for string result'() {
		const projector = new class extends TestWidget {
			render() {
				return '';
			}
		}();

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'attach to projector': {
		'append'() {
			const childNodeLength = document.body.childNodes.length;
			const projector = new TestWidget();

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			projector.append();

			assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
			const child = <HTMLElement> document.body.lastChild;
			assert.strictEqual(child.innerHTML, '<h2>foo</h2>');
			assert.strictEqual(child.tagName.toLowerCase(), 'div');
			assert.strictEqual(( <HTMLElement> child.firstChild).tagName.toLowerCase(), 'h2');
		},
		'replace'() {
			const projector = new class extends TestWidget {
				render() {
					return v('body', this.children);
				}
			}();

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			projector.replace();

			assert.strictEqual(document.body.childNodes.length, 1, 'child should have been added');
			const child = <HTMLElement> document.body.lastChild;
			assert.strictEqual(child.innerHTML, 'foo');
			assert.strictEqual(child.tagName.toLowerCase(), 'h2');
		},
		'merge': {
			'standard'() {
				const div = document.createElement('div');
				document.body.appendChild(div);
				const projector = new TestWidget();

				projector.setChildren([ v('h2', [ 'foo' ] ) ]);

				projector.merge(div);

				assert.strictEqual(div.childNodes.length, 1, 'child should have been added');
				const child = <HTMLElement> div.lastChild;
				assert.strictEqual(child.innerHTML, 'foo');
				assert.strictEqual(child.tagName.toLowerCase(), 'h2');
				document.body.removeChild(div);
			},
			'pre rendered DOM used'() {
				const iframe = document.createElement('iframe');
				document.body.appendChild(iframe);
				iframe.contentDocument.write(`
					<div class="foo">
						<label for="baz">Select Me:</label>
						<select type="text" name="baz" id="baz" disabled="disabled">
							<option value="foo">label foo</option>
							<option value="bar" selected="">label bar</option>
							<option value="baz">label baz</option>
						</select>
						<button type="button" disabled="disabled">Click Me!</button>
					</div>`);
				iframe.contentDocument.close();
				const root = iframe.contentDocument.body.firstChild as HTMLElement;
				const childElementCount = root.childElementCount;
				const select = root.childNodes[3] as HTMLSelectElement;
				const button = root.childNodes[5] as HTMLButtonElement;
				assert.strictEqual((root.childNodes[3] as HTMLSelectElement).value, 'bar', 'bar should be selected');
				const onchangeListener = spy();
				const onclickListener = spy();
				const projector = new class extends TestWidget {
					render() {
						return v('div', {
							classes: { foo: true, bar: true }
						}, [
							v('label', {
								for: 'baz'
							}, [ 'Select Me:' ]),
							v('select', {
								type: 'text',
								name: 'baz',
								id: 'baz',
								disabled: false,
								onchange: onchangeListener
							}, [
								v('option', { value: 'foo', selected: true }, [ 'label foo' ]),
								v('option', { value: 'bar', selected: false }, [ 'label bar' ]),
								v('option', { value: 'baz', selected: false }, [ 'label baz' ])
							]),
							v('button', {
								type: 'button',
								disabled: false,
								onclick: onclickListener
							}, [ 'Click Me!' ])
						]);
					}
				}();
				projector.merge(root);
				assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
				assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
				assert.strictEqual(select, root.childNodes[3], 'should have been reused');
				assert.strictEqual(button, root.childNodes[5], 'should have been reused');
				assert.isFalse(select.disabled, 'select should be enabled');
				assert.isFalse(button.disabled, 'button shound be enabled');

				assert.strictEqual(select.value, 'foo', 'foo should be selected');
				assert.strictEqual(select.children.length, 3, 'should have 3 children');

				assert.isFalse(onchangeListener.called, 'onchangeListener should not have been called');
				assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

				const changeEvent = document.createEvent('Event');
				changeEvent.initEvent('change', true, true);
				select.onchange(changeEvent); // firefox doesn't like to dispatch this event, either due to trust issues or
											  // that firefox doesn't generally dispatch this event until the element is blurred
											  // which is different than other browsers.  Either way this is not material to testing
											  // the functionality of this test, so calling the listener directly.
				assert.isTrue(onchangeListener.called, 'onchangeListener should have been called');

				const clickEvent = document.createEvent('CustomEvent');
				clickEvent.initEvent('click', true, true);
				button.dispatchEvent(clickEvent);
				assert.isTrue(onclickListener.called, 'onclickListener should have been called');

				document.body.removeChild(iframe);
			}
		}
	},
	'get root'() {
		const projector = new TestWidget();
		const root = document.createElement('div');
		assert.equal(projector.root, document.body);
		projector.root = root;
		assert.equal(projector.root, root);
	},
	'pause'() {
		const projector = new TestWidget();

		projector.append();

		projector.pause();
		projector.scheduleRender();
		assert.isFalse(rafSpy.called);
	},
	'pause cancels animation frame if scheduled'() {
		const projector = new TestWidget();

		projector.append();

		projector.scheduleRender();
		projector.pause();
		assert.isTrue(cancelRafSpy.called);
	},
	'resume'() {
		const projector = new TestWidget();
		spy(projector, 'scheduleRender');
		assert.isFalse((<any> projector.scheduleRender).called);
		projector.resume();
		assert.isTrue((<any> projector.scheduleRender).called);
	},
	'get projector state'() {
		const projector = new TestWidget();

		assert.equal(projector.projectorState, ProjectorAttachState.Detached);
		projector.append();
		assert.equal(projector.projectorState, ProjectorAttachState.Attached);
		projector.destroy();
		assert.equal(projector.projectorState, ProjectorAttachState.Detached);
	},
	'destroy'() {
		const projector: any = new TestWidget();
		const maquetteProjectorStopSpy = spy(projector, 'pause');

		projector.append();
		projector.destroy();

		assert.isTrue(maquetteProjectorStopSpy.calledOnce);

		projector.destroy();

		assert.isTrue(maquetteProjectorStopSpy.calledOnce);
	},
	'scheduleRender on properties:changed'() {
		const projector = new TestWidget();
		const scheduleRender = spy(projector, 'scheduleRender');
		projector.setProperties({ foo: 'hello' });
		assert.isTrue(scheduleRender.called);
	},
	'properties are reset to original state on render'() {
		const testProperties = {
			foo: 'bar'
		};
		const testChildren = [ v('div') ];
		class TestWidget extends ProjectorMixin(WidgetBase) {

			@beforeRender()
			protected updateProperties(renderFunc: any, props: any, children: any) {
				assert.deepEqual(props, testProperties);
				assert.deepEqual(children, testChildren);
				props.bar = 'foo';
				children.push(v('span'));
				return renderFunc;
			}
		}
		const projector = new TestWidget();
		projector.setProperties(testProperties);
		projector.setChildren(testChildren);
		projector.__render__();
		projector.invalidate();
		projector.__render__();
	},
	'invalidate on setting children'() {
		const projector = new TestWidget();
		let called = false;

		projector.on('invalidated', () => {
			called = true;
		});

		projector.setChildren([ v('div') ]);

		assert.isTrue(called);
	},
	'invalidate before attached'() {
		const projector: any = new TestWidget();

		projector.invalidate();

		assert.isFalse(rafSpy.called);
	},
	'invalidate after attached'() {
		const projector: any = new TestWidget();

		projector.append();
		projector.invalidate();
		assert.isTrue(rafSpy.called);
	},
	'reattach'() {
		const root = document.createElement('div');
		const projector = new TestWidget();
		const promise = projector.append(root);
		assert.strictEqual(promise, projector.append(), 'same promise should be returned');
	},
	'setRoot throws when already attached'() {
		const projector = new TestWidget();
		const div = document.createElement('div');
		projector.root = div;
		projector.append();
		assert.throws(() => {
			projector.root = document.body;
		}, Error, 'already attached');
	},
	'can attach an event handler'() {
		let domNode: any;
		let domEvent: any;
		const oninput = (evt: any) => {
			domEvent = evt;
		};
		const afterCreate = (node: Node) => {
			domNode = node;
		};
		const Projector = class extends TestWidget {
			render() {
				return v('div', { oninput, afterCreate });
			}
		};

		const projector = new Projector();
		projector.append();
		dispatchEvent(domNode, 'input');
		assert.instanceOf(domEvent, Event);
	},
	'can attach an event listener'() {
		let domNode: any;
		let domEvent: any;
		const onpointermove = (evt: any) => {
			domEvent = evt;
		};
		const afterCreate = (node: Node) => {
			domNode = node;
		};
		const Projector = class extends TestWidget {
			render() {
				return v('div', { onpointermove, afterCreate });
			}
		};

		const projector = new Projector();
		projector.append();
		dispatchEvent(domNode, 'pointermove');
		assert.instanceOf(domEvent, Event);
	},
	async '-active gets appended to enter/exit animations by default'(this: any) {
		if (!has('host-browser')) {
			this.skip('This test can only be run in a browser');
		}

		let children: any[] = [];

		class TestProjector extends ProjectorMixin(WidgetBase)<{}> {
			root = document.body;

			render() {
				return v('div', {}, children);
			}
		}

		const projector = new TestProjector();

		await projector.append();

		children.push(v('div', {
			id: 'test-element',
			enterAnimation: 'fade-in',
			exitAnimation: 'fade-out'
		}));

		projector.invalidate();

		await waitFor(() => {
			return document.getElementById('test-element') !== null;
		}, 'Element was never added');

		const domNode = document.getElementById('test-element')!;

		await waitFor(() => {
			return domNode.classList.contains('fade-in') && domNode.classList.contains('fade-in-active');
		}, 'fade-in classes never got added to element');

		// manually fire the transition end events
		sendAnimationEndEvents(domNode);

		children = [];
		projector.invalidate();

		await waitFor(() => {
			return domNode.classList.contains('fade-out') && domNode.classList.contains('fade-out-active');
		}, 'fade-out classes never got added to element');

		domNode.parentElement!.removeChild(domNode);
	},
	async 'active/exit classes can be customized'(this: any) {
		if (!has('host-browser')) {
			this.skip('This test can only be run in a browser');
		}

		let children: any[] = [];

		class TestProjector extends ProjectorMixin(WidgetBase)<{}> {
			root = document.body;

			render() {
				return v('div', {}, children);
			}
		}

		const projector = new TestProjector();

		await projector.append();

		children.push(v('div', {
			id: 'test-element',
			enterAnimation: 'fade-in',
			enterAnimationActive: 'active-fade-in',
			exitAnimation: 'fade-out',
			exitAnimationActive: 'active-fade-out'
		}));

		projector.invalidate();

		await waitFor(() => {
			return document.getElementById('test-element') !== null;
		}, 'Element was never added');

		const domNode = document.getElementById('test-element')!;

		await waitFor(() => {
			return domNode.classList.contains('fade-in') && domNode.classList.contains('active-fade-in');
		}, 'fade-in classes never got added to element');

		// manually fire the transition end events
		sendAnimationEndEvents(domNode);

		children = [];
		projector.invalidate();

		await waitFor(() => {
			return domNode.classList.contains('fade-out') && domNode.classList.contains('active-fade-out');
		}, 'fade-out classes never got added to element');

		domNode.parentElement!.removeChild(domNode);
	},

	async 'dom nodes get removed after exit animations'(this: any) {
		if (!has('host-browser')) {
			this.skip('This test can only be run in a browser');
		}

		let children: any[] = [
			v('div', {
				id: 'test-element',
				enterAnimation: 'fade-in',
				exitAnimation: 'fade-out'
			})
		];

		class TestProjector extends ProjectorMixin(WidgetBase)<{}> {
			root = document.body;

			render() {
				return v('div', {}, children);
			}
		}

		const projector = new TestProjector();

		await projector.append();

		await waitFor(() => {
			return document.getElementById('test-element') !== null;
		}, 'Element was never added');

		const domNode = document.getElementById('test-element')!;

		children = [];
		projector.invalidate();

		await waitFor(() => {
			return domNode.classList.contains('fade-out') && domNode.classList.contains('fade-out-active');
		}, 'fade-out classes never got added to element');

		// manually fire the transition end events
		sendAnimationEndEvents(domNode);

		await waitFor(() => {
			return document.getElementById('test-element') === null;
		}, 'Element never got removed');
	},
	'afterCreate can be overriden'() {
		let afterCreateCalled = false;

		function afterCreate(this: any, element: any, projectorOptions: any, vNodeSelector: any, properties: any, children: any) {
			afterCreateCalled = true;

			assert.isNotNull(element);
			assert.isNotNull(projectorOptions);
			assert.isNotNull(vNodeSelector);
			assert.isNotNull(properties);
			assert.isNotNull(children);
			assert.strictEqual(this, projector);
		}

		const root = document.createElement('div');
		document.body.appendChild(root);

		const projector = new (class extends TestWidget {
			root = root;

			render() {
				return v('span', {
					innerHTML: 'hello world',
					afterCreate
				});
			}
		})();

		projector.append();
		assert.isTrue(afterCreateCalled);
	}
});
