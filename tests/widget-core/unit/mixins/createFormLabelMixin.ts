import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from '@dojo/interfaces/vdom';
import { w } from './../../../src/d';
import createWidgetBase from '../../../src/createWidgetBase';
import createFormLabelMixin from '../../../src/mixins/createFormLabelMixin';

const formLabelWidget = createWidgetBase.mixin(createFormLabelMixin);

registerSuite({
	name: 'mixins/createFormLabelMixin',
	construction() {
		const formLabelMixin = createFormLabelMixin();

		assert.isDefined(formLabelMixin);
	},
	getFormFieldNodeAttributes: {
		'for HNode'() {
			const formField = formLabelWidget({
				properties: {
					value: 'foo',
					maxLength: 100,
					randomProp: 'qux'
				}
			});

			let vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.strictEqual(vnode.properties!['value'], 'foo');
			assert.strictEqual(vnode.properties!['maxlength'], '100');
			assert.isUndefined(vnode.properties!['randomProp']);

			formField.setProperties({
				value: 'bar',
				name: 'baz'
			});
			vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.properties!['value'], 'bar');
			assert.strictEqual(vnode.properties!['name'], 'baz');

			formField.setProperties({
				readOnly: true,
				invalid: false,
				disabled: true,
				describedBy: 'qux'
			});
			vnode = <VNode> formField.__render__();

			assert.isTrue(vnode.properties!['aria-readonly']);
			assert.strictEqual(vnode.properties!['readonly'], 'readonly');
			assert.isFalse(vnode.properties!['aria-invalid']);
			assert.isTrue(vnode.properties!['disabled']);
			assert.strictEqual(vnode.properties!['aria-describedby'], 'qux');
		},
		'for WNode'() {
			const createExtendedFormField = formLabelWidget.override({
				render() {
					return w(formLabelWidget, {});
				}
			});

			const formField = createExtendedFormField({
				properties: {
					value: 'foo',
					maxLength: 100,
					randomProp: 'qux'
				}
			});

			let vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.isUndefined(vnode.properties!['value']);
			assert.isUndefined(vnode.properties!['maxlength']);
		}
	},
	'type'() {
		const formField: any = formLabelWidget();
		formField.type = 'foo';

		const vnode = <VNode> formField.__render__();

		assert.strictEqual(vnode.properties!['type'], 'foo');
	},
	'label': {
		'string label'() {
			const formField = formLabelWidget({
				properties: {
					label: 'bar'
				}
			});
			const vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![1].properties!.innerHTML, 'bar');
		},
		'label options'() {
			const formField = formLabelWidget({
				properties: {
					label: {
						content: 'bar',
						position: 'before',
						hidden: true
					}
				}
			});
			let vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![0].properties!.innerHTML, 'bar');
			assert.isTrue(vnode.children![0].properties!.classes!['visually-hidden']);

			formField.setProperties({
				label: {
					content: ''
				}
			});
			vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 1);
		},
		'no label'() {
			const formField = formLabelWidget();
			const vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.lengthOf(vnode.children, 0);
		},
		'changing label'() {
			const formField = formLabelWidget();
			let vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.lengthOf(vnode.children, 0);

			formField.setProperties({
				label: 'bar'
			});
			vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);

			formField.setProperties({
				label: null
			});
			vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.lengthOf(vnode.children, 0);
		}
	}
});
