const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import global from '@dojo/shim/global';
import has from '@dojo/has/has';
import { spy, stub, SinonStub } from 'sinon';
import { v } from '../../../src/d';
import { ProjectorMixin, ProjectorAttachState } from '../../../src/mixins/Projector';
import { WidgetBase } from '../../../src/WidgetBase';
import { beforeRender } from './../../../src/decorators/beforeRender';
import { HNode } from './../../../src/interfaces';

const Event = global.window.Event;

class BaseTestWidget extends ProjectorMixin(WidgetBase) {}

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

let rafStub: SinonStub;
let cancelRafStub: SinonStub;
let projector: BaseTestWidget | MyWidget;

registerSuite('mixins/projectorMixin', {

	beforeEach() {
		result = null;
		rafStub = stub(global, 'requestAnimationFrame').returns(1);
		rafStub.yields();
		cancelRafStub = stub(global, 'cancelAnimationFrame');
	},

	afterEach() {
		if (projector) {
			projector.destroy();
			projector = undefined as any;
		}
		rafStub.restore();
		cancelRafStub.restore();
	},

	tests: {
		'render': {
			'string root node'() {
				result = 'my string';
				projector = new MyWidget();

				const renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'span');
				assert.strictEqual(renderedResult.children![0], 'my string');
			},
			'string root node after an initial render'() {
				result = v('h1', [ 'my string' ]);
				projector = new MyWidget();

				let renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'h1');
				assert.strictEqual(renderedResult.children![0], 'my string');

				result = 'my string';
				renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'h1');
				assert.strictEqual(renderedResult.children![0], 'my string');
			},
			'null root node'() {
				result = null;
				projector = new MyWidget();

				const renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'span');
				assert.isNull(renderedResult.children![0]);
			},
			'null root node after an initial render'() {
				result = v('h1', [ 'my string' ]);
				projector = new MyWidget();

				let renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'h1');
				assert.strictEqual(renderedResult.children![0], 'my string');
				projector.invalidate();
				result = null;
				renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'span');
				assert.isNull(renderedResult.children![0]);
			},
			'undefined root node'() {
				result = undefined;
				projector = new MyWidget();

				const renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'span');
				assert.isUndefined(renderedResult.children![0]);
			},
			'undefined root node after an initial render'() {
				result = v('h1', [ 'my string' ]);
				projector = new MyWidget();

				let renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'h1');
				assert.strictEqual(renderedResult.children![0], 'my string');
				projector.invalidate();
				result = undefined;
				renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult.tag, 'span');
				assert.isUndefined(renderedResult.children![0]);
			},
			'array root node'() {
				result = [ v('h1', [ 'my string' ]) ];
				projector = new MyWidget();

				const renderedResult = projector.__render__() as HNode;
				assert.strictEqual(renderedResult, result);
			}
		},
		'attach projector': {
			'append'() {
					const childNodeLength = document.body.childNodes.length;
					projector = new BaseTestWidget();

					projector.setChildren([ v('h2', [ 'foo' ] ) ]);
					projector.append();
					assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
					const child = document.body.lastChild as HTMLElement;
					assert.strictEqual(child.innerHTML, '<h2>foo</h2>');
					assert.strictEqual(child.tagName.toLowerCase(), 'div');
					assert.strictEqual((child.firstChild as HTMLElement).tagName.toLowerCase(), 'h2');
			},
			'replace'() {
					const projector = new class extends BaseTestWidget {
						render() {
							return v('body', this.children);
						}
					}();

					projector.setChildren([ v('h2', [ 'foo' ] ) ]);
					projector.replace();
					assert.strictEqual(document.body.childNodes.length, 1, 'child should have been added');
					const child = document.body.lastChild as HTMLElement;
					assert.strictEqual(child.innerHTML, 'foo');
					assert.strictEqual(child.tagName.toLowerCase(), 'h2');
			},
			'merge': {
				'standard'() {
					const div = document.createElement('div');
					document.body.appendChild(div);
					const projector = new BaseTestWidget();

					projector.setChildren([ v('h2', [ 'foo' ] ) ]);
					projector.merge(div);
					assert.strictEqual(div.childNodes.length, 1, 'child should have been added');
					const child = div.lastChild as HTMLElement;
					assert.strictEqual(child.innerHTML, 'foo');
					assert.strictEqual(child.tagName.toLowerCase(), 'h2');
					document.body.removeChild(div);
				}
			}
		},
		'sandbox': {
			'attaching'() {
				const childNodeLength = document.body.childNodes.length;
				projector = new BaseTestWidget();
				projector.setChildren([ v('h2', [ 'foo' ]) ]);

				projector.sandbox();

				assert.strictEqual(document.body.childNodes.length, childNodeLength, 'No nodes should be added to body');
				assert.isTrue(projector.root instanceof global.window.DocumentFragment, 'the root should be a document fragment');
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
				projector.invalidate();
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
			assert.isFalse(rafStub.called);
		},
		'pause cancels animation frame if scheduled'() {
			const projector = new BaseTestWidget();

			projector.append();

			projector.scheduleRender();
			projector.pause();
			assert.isTrue(cancelRafStub.called);
		},
		'resume'() {
			const projector = new BaseTestWidget();
			spy(projector, 'scheduleRender');
			assert.isFalse((projector.scheduleRender as any).called);
			projector.resume();
			assert.isTrue((projector.scheduleRender as any).called);
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

				const div = document.createElement('div');
				projector.append(div);
				assert.strictEqual(projector.toHtml(), `<div><h2>foo</h2></div>`);
				assert.strictEqual(projector.toHtml(), (projector.root.lastChild as Element).outerHTML);
				projector.destroy();
			},
			'replaced'() {
				const div = document.createElement('div');
				const root = document.createElement('div');
				document.body.appendChild(root);
				root.appendChild(div);

				const projector = new BaseTestWidget();
				projector.setChildren([ v('h2', [ 'foo' ]) ]);

				projector.replace(div);
				assert.strictEqual(projector.toHtml(), `<div><h2>foo</h2></div>`);
				assert.strictEqual(projector.toHtml(), (root.lastChild as Element).outerHTML);
				projector.destroy();
			},
			'merged'() {
				const root = document.createElement('div');
				const div = document.createElement('div');
				document.body.appendChild(root);
				root.appendChild(div);

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
			const projectorStopSpy = spy(projector, 'pause');

			projector.append();
			projector.destroy();

			assert.isTrue(projectorStopSpy.calledOnce);

			projector.destroy();

			assert.isTrue(projectorStopSpy.calledOnce);
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
			projector.scheduleRender();
			projector.invalidate();
		},
		'invalidate before attached'() {
			const projector: any = new BaseTestWidget();

			projector.invalidate();

			assert.isFalse(rafStub.called);
		},
		'invalidate after attached'() {
			const projector: any = new BaseTestWidget();

			projector.append();
			projector.invalidate();
			assert.isTrue(rafStub.called);
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
			assert.isTrue(domEvent instanceof Event);
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
			assert.isTrue(domEvent instanceof Event);
		},
		'-active gets appended to enter/exit animations by default'(this: any) {
			if (!has('host-browser')) {
				this.skip('This test can only be run in a browser');
			}

			let children: any[] = [];

			class TestProjector extends BaseTestWidget {
				root = document.body;

				render() {
					return v('div', { id: 'root' }, children);
				}
			}

			const projector = new TestProjector();
			projector.async = false;
			projector.append();

			children = [ v('div', {
				id: 'test-element',
				enterAnimation: 'fade-in',
				exitAnimation: 'fade-out'
			}) ];

			projector.invalidate();

			const domNode = document.getElementById('test-element')!;
			assert.isNotNull(domNode);
			assert.isTrue(domNode.classList.contains('fade-in'));
			assert.isTrue(domNode.classList.contains('fade-in-active'));

			sendAnimationEndEvents(domNode);

			children = [];
			projector.invalidate();
			projector.scheduleRender();

			assert.isTrue(domNode.classList.contains('fade-out'));
			assert.isTrue(domNode.classList.contains('fade-out-active'));

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
			projector.async = false;
			projector.append();

			children = [ v('div', {
				id: 'test-element',
				enterAnimation: 'fade-in',
				enterAnimationActive: 'active-fade-in',
				exitAnimation: 'fade-out',
				exitAnimationActive: 'active-fade-out'
			}) ];

			projector.invalidate();

			const domNode = document.getElementById('test-element')!;
			assert.isNotNull(domNode);
			assert.isTrue(domNode.classList.contains('fade-in'));
			assert.isTrue(domNode.classList.contains('active-fade-in'));

			sendAnimationEndEvents(domNode);

			children = [];
			projector.invalidate();

			assert.isTrue(domNode.classList.contains('fade-out'));
			assert.isTrue(domNode.classList.contains('active-fade-out'));

			domNode.parentElement!.removeChild(domNode);
		},

		'dom nodes get removed after exit animations'(this: any) {
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
			projector.async = false;
			projector.append();

			const domNode = document.getElementById('test-element')!;
			assert.isNotNull(domNode);

			children = [];
			projector.invalidate();

			assert.isTrue(domNode.classList.contains('fade-out'));
			assert.isTrue(domNode.classList.contains('fade-out-active'));

			// manually fire the transition end events
			sendAnimationEndEvents(domNode);

			assert.isNull(document.getElementById('test-element'));
		}
	}
});
