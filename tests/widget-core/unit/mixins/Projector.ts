import global from '@dojo/shim/global';
import has from '@dojo/has/has';
import '@dojo/shim/Promise';
import { VNode } from '@dojo/interfaces/vdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { spy } from 'sinon';
import { v } from '../../../src/d';
import { ProjectorMixin, ProjectorAttachState } from '../../../src/mixins/Projector';
import { beforeRender, WidgetBase } from '../../../src/WidgetBase';
import { waitFor } from '../waitFor';

const Event = global.window.Event;

class BaseTestWidget extends ProjectorMixin(WidgetBase) {
	public callInvalidate() {
		this.invalidate();
	}
}

let result: any;

class MyWidget extends BaseTestWidget {
	render() {
		return result;
	}
}

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
let projector: BaseTestWidget | MyWidget;

registerSuite({
	name: 'mixins/projectorMixin',

	beforeEach() {
		result = null;
		rafSpy = spy(global, 'requestAnimationFrame');
		cancelRafSpy = spy(global, 'cancelAnimationFrame');
	},

	afterEach() {
		if (projector) {
			projector.destroy();
			projector = <any> undefined;
		}
		rafSpy.restore();
		cancelRafSpy.restore();
	},
	'attach to projector': {
		'append': {
			'standard'() {
				const childNodeLength = document.body.childNodes.length;
				projector = new BaseTestWidget();

				projector.setChildren([ v('h2', [ 'foo' ] ) ]);

				projector.append();

				assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, '<h2>foo</h2>');
				assert.strictEqual(child.tagName.toLowerCase(), 'div');
				assert.strictEqual(( <HTMLElement> child.firstChild).tagName.toLowerCase(), 'h2');
			},
			'string root node'() {
				result = 'my string';
				projector = new MyWidget();

				projector.append();
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.equal(vnode.text, result);
				assert.isUndefined(vnode.children);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 1);
				assert.equal(vnode.children![0].vnodeSelector, 'div');
				assert.equal(vnode.children![0].text, 'other text');
			},
			'string root node after an initial render'() {
				result = v('div', [ 'my string' ]);
				projector = new MyWidget();

				projector.append();
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'div');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = 'other text';
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'div');
				assert.equal(vnode.text, 'other text');
				assert.isUndefined(vnode.children);
			},
			'null root node'() {
				result = null;
				projector = new MyWidget();

				projector.append();
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 1);
				assert.equal(vnode.children![0].vnodeSelector, 'div');
				assert.equal(vnode.children![0].text, 'other text');

			},
			'null root node after an initial render'() {
				result = v('h2', [ 'my string' ]);
				projector = new MyWidget();

				projector.append();
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = null;
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);
			},
			'undefined root node'() {
				result = undefined;
				projector = new MyWidget();

				projector.append();
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 1);
				assert.equal(vnode.children![0].vnodeSelector, 'div');
				assert.equal(vnode.children![0].text, 'other text');

			},
			'undefined root node after an initial render'() {
				result = v('h2', [ 'my string' ]);
				projector = new MyWidget();

				projector.append();
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = undefined;
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);
			},
			'array root node'() {
				result = [ v('h2', [ 'my string' ]) ];
				projector = new MyWidget();

				projector.append();
				let vnode: any = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.lengthOf(vnode.children, 1);
				assert.strictEqual(vnode.children[0].vnodeSelector, 'h2');
				assert.strictEqual(vnode.children[0].text, 'my string');
			}
		},
		'sandbox': {
			'attaching'() {
				const childNodeLength = document.body.childNodes.length;
				projector = new BaseTestWidget();
				projector.setChildren([ v('h2', [ 'foo' ]) ]);

				projector.sandbox();

				assert.strictEqual(document.body.childNodes.length, childNodeLength, 'No nodes should be added to body');
				assert.instanceOf(projector.root, global.window.DocumentFragment, 'the root should be a document fragment');
				const child = projector.root.firstChild as HTMLElement;
				assert.strictEqual(child.innerHTML, '<h2>foo</h2>');
				assert.strictEqual(child.tagName.toLocaleLowerCase(), 'div');
				assert.strictEqual((child.firstChild as HTMLElement).tagName.toLocaleLowerCase(), 'h2');

				projector.destroy();
				assert.strictEqual(projector.root, document.body, 'Root should be reverted to document.body');
			},
			'operates synchronously'() {
				let count = 0;
				const projector = new class extends BaseTestWidget {
					render () {
						count++;
						return v('div', [ String(count) ]);
					}
				}();

				projector.sandbox();
				assert.strictEqual(count, 1, 'render should have been called once');
				assert.strictEqual(projector.root.firstChild!.textContent, '1', 'should have rendered "1"');
				projector.callInvalidate();
				assert.strictEqual(count, 2, 'render should have been called synchronously');
				assert.strictEqual(projector.root.firstChild!.textContent, '2', 'should have rendered "2"');
				projector.destroy();
			},
			'accepts other documents'() {
				const doc = {
					createDocumentFragment: spy(() => document.createDocumentFragment())
				} as any;
				const projector = new BaseTestWidget();
				projector.sandbox(doc);
				assert.isTrue(doc.createDocumentFragment.called, 'createDocumentFragment should have been called');
				projector.destroy();
			}
		},
		'replace': {
			'standard'() {
				const projector = new class extends BaseTestWidget {
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
			'string root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = 'my string';
				projector = new MyWidget();

				projector.replace(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.equal(vnode.text, result);
				assert.isUndefined(vnode.children);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 1);
				assert.equal(vnode.children![0].vnodeSelector, 'div');
				assert.equal(vnode.children![0].text, 'other text');
			},
			'string root node after an initial render'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = v('div', [ 'my string' ]);
				projector = new MyWidget();

				projector.replace(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'div');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = 'other text';
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'div');
				assert.equal(vnode.text, 'other text');
				assert.isUndefined(vnode.children);
			},
			'null root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = null;
				projector = new MyWidget();

				projector.replace(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 1);
				assert.equal(vnode.children![0].vnodeSelector, 'div');
				assert.equal(vnode.children![0].text, 'other text');

			},
			'null root node after an initial render'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = v('h2', [ 'my string' ]);
				projector = new MyWidget();

				projector.replace(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = null;
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);
			},
			'undefined root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = undefined;
				projector = new MyWidget();

				projector.replace(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 1);
				assert.equal(vnode.children![0].vnodeSelector, 'div');
				assert.equal(vnode.children![0].text, 'other text');

			},
			'undefined root node after an initial render'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = v('h2', [ 'my string' ]);
				projector = new MyWidget();

				projector.replace(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = undefined;
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'h2');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);
			},
			'array root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = [ v('h2', [ 'my string' ]) ];
				projector = new MyWidget();

				projector.replace(root);
				let vnode: any = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'span');
				assert.lengthOf(vnode.children, 1);
				assert.strictEqual(vnode.children[0].vnodeSelector, 'h2');
				assert.strictEqual(vnode.children[0].text, 'my string');
			}
		},
		'merge': {
			'standard'() {
				const div = document.createElement('div');
				document.body.appendChild(div);
				const projector = new BaseTestWidget();

				projector.setChildren([ v('h2', [ 'foo' ] ) ]);

				projector.merge(div);

				assert.strictEqual(div.childNodes.length, 1, 'child should have been added');
				const child = <HTMLElement> div.lastChild;
				assert.strictEqual(child.innerHTML, 'foo');
				assert.strictEqual(child.tagName.toLowerCase(), 'h2');
				document.body.removeChild(div);
			},
			'string root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = 'my string';
				projector = new MyWidget();

				projector.merge(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, result);
				assert.isUndefined(vnode.children);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, 'other text');
			},
			'string root node after an initial render'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = v('div', [ 'my string' ]);
				projector = new MyWidget();

				projector.merge(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = 'other text';
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, 'other text');
				assert.isUndefined(vnode.children);
			},
			'null root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = null;
				projector = new MyWidget();

				projector.merge(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, 'other text');
				assert.isUndefined(vnode.children);
			},
			'null root node after an initial render'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = v('h2', [ 'my string' ]);
				projector = new MyWidget();

				projector.merge(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = null;
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);
			},
			'undefined root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = undefined;
				projector = new MyWidget();

				projector.merge(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);

				result = v('div', [ 'other text' ]);
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, 'other text');
				assert.isUndefined(vnode.children);
			},
			'undefined root node after an initial render'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = v('h2', [ 'my string' ]);
				projector = new MyWidget();

				projector.merge(root);
				let vnode: VNode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.equal(vnode.text, 'my string');
				assert.isUndefined(vnode.children);

				result = undefined;
				projector.callInvalidate();
				vnode = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.isUndefined(vnode.text);
				assert.lengthOf(vnode.children, 0);
			},
			'array root node'() {
				const root = document.createElement('my-app');
				document.body.appendChild(root);
				result = [ v('h2', [ 'my string' ]) ];
				projector = new MyWidget();

				projector.merge(root);
				let vnode: any = projector.__render__() as VNode;
				assert.equal(vnode.vnodeSelector, 'my-app');
				assert.lengthOf(vnode.children, 1);
				assert.strictEqual(vnode.children[0].vnodeSelector, 'h2');
				assert.strictEqual(vnode.children[0].text, 'my string');
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
				const projector = new class extends BaseTestWidget {
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
		const projector = new BaseTestWidget();
		const root = document.createElement('div');
		assert.equal(projector.root, document.body);
		projector.root = root;
		assert.equal(projector.root, root);
	},
	'pause'() {
		const projector = new BaseTestWidget();

		projector.append();

		projector.pause();
		projector.scheduleRender();
		assert.isFalse(rafSpy.called);
	},
	'pause cancels animation frame if scheduled'() {
		const projector = new BaseTestWidget();

		projector.append();

		projector.scheduleRender();
		projector.pause();
		assert.isTrue(cancelRafSpy.called);
	},
	'resume'() {
		const projector = new BaseTestWidget();
		spy(projector, 'scheduleRender');
		assert.isFalse((<any> projector.scheduleRender).called);
		projector.resume();
		assert.isTrue((<any> projector.scheduleRender).called);
	},
	'get projector state'() {
		const projector = new BaseTestWidget();

		assert.equal(projector.projectorState, ProjectorAttachState.Detached);
		projector.append();
		assert.equal(projector.projectorState, ProjectorAttachState.Attached);
		projector.destroy();
		assert.equal(projector.projectorState, ProjectorAttachState.Detached);
	},
	'async': {
		'can set async mode on projector'() {
			const projector = new BaseTestWidget();
			assert.isTrue(projector.async);
			projector.async = false;
			assert.isFalse(projector.async);
		},
		'cannot set async mode on projector that is already attached'() {
			const projector = new BaseTestWidget();
			projector.append();
			assert.throws(() => {
				projector.async = false;
			}, Error, 'Projector already attached, cannot change async mode');
		}
	},
	'toHtml()': {
		'appended'() {
			const projector = new BaseTestWidget();
			projector.setChildren([ v('h2', [ 'foo' ]) ]);

			projector.append();
			assert.strictEqual(projector.toHtml(), `<div><h2>foo</h2></div>`);
			assert.strictEqual(projector.toHtml(), (projector.root.lastChild as Element).outerHTML);
			projector.destroy();
		},
		'replaced'() {
			const div = document.createElement('div');
			document.body.appendChild(div);

			const projector = new BaseTestWidget();
			projector.setChildren([ v('h2', [ 'foo' ]) ]);

			projector.replace(div);
			assert.strictEqual(projector.toHtml(), `<div><h2>foo</h2></div>`);
			assert.strictEqual(projector.toHtml(), (document.body.lastChild as Element).outerHTML);
			projector.destroy();
		},
		'merged'() {
			const div = document.createElement('div');
			document.body.appendChild(div);

			const projector = new BaseTestWidget();
			projector.setChildren([ v('h2', [ 'foo' ]) ]);

			projector.merge(div);
			assert.strictEqual(projector.toHtml(), `<div><h2>foo</h2></div>`);
			assert.strictEqual(projector.toHtml(), (projector.root as Element).outerHTML);
			projector.destroy();
		},
		'not attached throws'() {
			const projector = new BaseTestWidget();
			assert.throws(() => {
				projector.toHtml();
			}, Error, 'Projector is not attached, cannot return an HTML string of projection.');
		}
	},
	'destroy'() {
		const projector = new BaseTestWidget();
		const maquetteProjectorStopSpy = spy(projector, 'pause');

		projector.append();
		projector.destroy();

		assert.isTrue(maquetteProjectorStopSpy.calledOnce);

		projector.destroy();

		assert.isTrue(maquetteProjectorStopSpy.calledOnce);
	},
	'setProperties guards against original property interface'() {
		interface Props {
			foo: string;
		}

		class TestClass extends WidgetBase<Props> {}
		const ProjectorClass = ProjectorMixin(TestClass);
		const projector = new ProjectorClass();
		projector.setProperties({ foo: 'f' });
		// Demonstrates the type guarding for widget properties

		// projector.setProperties({ foo: true });
	},
	'scheduleRender on setting properties'() {
		const projector = new BaseTestWidget();
		const scheduleRender = spy(projector, 'scheduleRender');
		projector.setProperties({ key: 'hello' });
		assert.isTrue(scheduleRender.called);
	},
	'properties are reset to original state on render'() {
		const testProperties = {
			key: 'bar'
		};
		const testChildren = [ v('div') ];
		class TestWidget extends BaseTestWidget {

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
		projector.callInvalidate();
		projector.__render__();
	},
	'invalidate on setting children'() {
		const projector = new BaseTestWidget();
		const scheduleRender = spy(projector, 'scheduleRender');

		projector.setChildren([ v('div') ]);
		assert.isTrue(scheduleRender.called);
	},
	'invalidate before attached'() {
		const projector: any = new BaseTestWidget();

		projector.invalidate();

		assert.isFalse(rafSpy.called);
	},
	'invalidate after attached'() {
		const projector: any = new BaseTestWidget();

		projector.append();
		projector.invalidate();
		assert.isTrue(rafSpy.called);
	},
	'reattach'() {
		const root = document.createElement('div');
		const projector = new BaseTestWidget();
		const promise = projector.append(root);
		assert.strictEqual(promise, projector.append(), 'same promise should be returned');
	},
	'setRoot throws when already attached'() {
		const projector = new BaseTestWidget();
		const div = document.createElement('div');
		projector.root = div;
		projector.append();
		assert.throws(() => {
			projector.root = document.body;
		}, Error, 'already attached');
	},
	'sandbox throws when already attached'() {
		const projector = new BaseTestWidget();
		projector.append();
		assert.throws(() => {
			projector.sandbox();
		}, Error, 'Projector already attached, cannot create sandbox');
	},
	'can attach an event handler'() {
		let domEvent: any;
		const oninput = (evt: any) => {
			domEvent = evt;
		};

		const Projector = class extends BaseTestWidget {
			render() {
				return v('div', { oninput, id: 'handler-test-root' });
			}
		};

		const projector = new Projector();
		projector.append();
		const domNode = document.getElementById('handler-test-root');
		dispatchEvent(domNode as HTMLElement, 'input');
		assert.instanceOf(domEvent, Event);
	},
	'can attach an event listener'() {
		let domEvent: any;
		const onpointermove = (evt: any) => {
			domEvent = evt;
		};

		const Projector = class extends BaseTestWidget {
			render() {
				return v('div', { onpointermove, id: 'listener-test-root' });
			}
		};

		const projector = new Projector();
		projector.append();
		const domNode = document.getElementById('listener-test-root');
		dispatchEvent(domNode as HTMLElement, 'pointermove');
		assert.instanceOf(domEvent, Event);
	},
	async '-active gets appended to enter/exit animations by default'(this: any) {
		if (!has('host-browser')) {
			this.skip('This test can only be run in a browser');
		}

		let children: any[] = [];

		class TestProjector extends BaseTestWidget {
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

		projector.callInvalidate();

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
		projector.callInvalidate();

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

		class TestProjector extends BaseTestWidget {
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

		projector.callInvalidate();

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
		projector.callInvalidate();

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

		class TestProjector extends BaseTestWidget {
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
		projector.callInvalidate();

		await waitFor(() => {
			return domNode.classList.contains('fade-out') && domNode.classList.contains('fade-out-active');
		}, 'fade-out classes never got added to element');

		// manually fire the transition end events
		sendAnimationEndEvents(domNode);

		await waitFor(() => {
			return document.getElementById('test-element') === null;
		}, 'Element never got removed');
	}
});
