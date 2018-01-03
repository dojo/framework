const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { createResolvers } from './../../support/util';
import { WidgetBase } from './../../../src/WidgetBase';
import { v, w } from './../../../src/d';
import { DomWrapper } from '../../../src/util/DomWrapper';
import ProjectorMixin from '../../../src/mixins/Projector';
import { ThemedMixin, theme } from '../../../src/mixins/Themed';

let projector: any;

const resolvers = createResolvers();

registerSuite('DomWrapper', {
	beforeEach() {
		resolvers.stub();
	},

	afterEach() {
		resolvers.restore();
		projector = undefined;
	},

	tests: {
		'properties and attributes are maintained from element'() {
			const domNode: any = document.createElement('custom-element');
			domNode.foo = 'blah';
			domNode.setAttribute('original', 'woop');

			const DomNode = DomWrapper(domNode);
			class Foo extends WidgetBase {
				render() {
					return v('div', [w(DomNode, { id: 'foo', extra: { foo: 'bar' } })]);
				}
			}
			const Projector = ProjectorMixin(Foo);
			projector = new Projector();
			const root = document.createElement('div');
			projector.append(root);
			resolvers.resolve();
			resolvers.resolve();
			assert.equal(domNode.foo, 'blah');
			assert.equal(domNode.getAttribute('original'), 'woop');
			assert.equal(domNode.getAttribute('id'), 'foo');
			assert.deepEqual(domNode.extra, { foo: 'bar' });
		},
		'supports events'() {
			const domNode: any = document.createElement('custom-element');
			const root = document.createElement('div');
			let clicked = false;

			const DomNode = DomWrapper(domNode);
			class Foo extends WidgetBase {
				_onClick() {
					clicked = true;
				}
				render() {
					return w(DomNode, { onclick: this._onClick });
				}
			}
			const Projector = ProjectorMixin(Foo);
			projector = new Projector();
			projector.append(root);
			resolvers.resolve();
			resolvers.resolve();
			domNode.click();
			assert.isTrue(clicked);
		},
		'supports classes and styles'() {
			const domNode: any = document.createElement('custom-element');
			const root = document.createElement('div');

			const DomNode = DomWrapper(domNode);
			const myTheme = {
				class1: 'classFoo'
			};

			@theme(myTheme)
			class Foo extends ThemedMixin(WidgetBase) {
				render() {
					return w(DomNode, {
						styles: {
							color: 'red'
						},
						classes: this.theme(myTheme.class1)
					});
				}
			}
			const Projector = ProjectorMixin(Foo);
			projector = new Projector();
			projector.append(root);
			resolvers.resolve();
			resolvers.resolve();
			assert.isTrue(domNode.classList.contains('classFoo'));
			assert.equal(domNode.style.color, 'red');
		},
		onAttached() {
			let attached = false;
			const domNode: any = document.createElement('custom-element');
			const root = document.createElement('div');

			const DomNode = DomWrapper(domNode, {
				onAttached() {
					attached = true;
					assert.equal(domNode.parentNode, root);
				}
			});
			class Foo extends WidgetBase {
				render() {
					return w(DomNode, {});
				}
			}
			const Projector = ProjectorMixin(Foo);
			projector = new Projector();
			projector.append(root);
			resolvers.resolve();
			resolvers.resolve();
			assert.isTrue(attached);
		}
	}
});
