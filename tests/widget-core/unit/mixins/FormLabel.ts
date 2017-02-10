import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { VNode } from '@dojo/interfaces/vdom';
import { v, w } from './../../../src/d';
import { WidgetBase } from '../../../src/WidgetBase';
import { FormLabelMixin, FormLabelMixinProperties } from '../../../src/mixins/FormLabel';

class FormLabelWidget extends FormLabelMixin(WidgetBase)<FormLabelMixinProperties> { }

registerSuite({
	name: 'mixins/createFormLabelMixin',
	construction() {
		const formLabelMixin: any = new FormLabelWidget({});

		assert.isDefined(formLabelMixin);
	},
	getFormFieldNodeAttributes: {
		'for HNode'() {
			const formField: any = new FormLabelWidget(<any> {
				value: 'foo',
				maxLength: 100,
				randomProp: 'qux'
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
			class ExtendedFormField extends FormLabelWidget {
				render() {
					return w(FormLabelWidget, {});
				}
			};

			const formField: any = new ExtendedFormField(<any> {
				value: 'foo',
				maxLength: 100,
				randomProp: 'qux'
			});

			let vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.isUndefined(vnode.properties!['value']);
			assert.isUndefined(vnode.properties!['maxlength']);
		},
		'label properties'() {
			class ExtendedFormField extends FormLabelWidget {
				render() {
					return v('input', { classes: { 'qux': true } });
				}
			};

			const formField: any = new ExtendedFormField({
				label: 'foo',
				value: 'bar',
				maxLength: 100,
				formId: 'baz'
			});
			let vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.children![0].properties!['value'], 'bar');
			assert.strictEqual(vnode.children![0].properties!['maxlength'], '100');
			assert.strictEqual(vnode.properties!['form'], 'baz');
			assert.isTrue(vnode.properties!.classes!['qux'], 'Classes should be set on the label node');
		}
	},
	'label': {
		'string label'() {
			const formField: any = new FormLabelWidget({
				label: 'bar'
			});
			const vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'label');
			assert.lengthOf(vnode.children, 2);
			assert.strictEqual(vnode.children![1].properties!.innerHTML, 'bar');
		},
		'label options'() {
			const formField: any = new FormLabelWidget({
				label: {
					content: 'bar',
					position: 'before',
					hidden: true
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
			const formField: any = new FormLabelWidget({});
			const vnode = <VNode> formField.__render__();

			assert.strictEqual(vnode.vnodeSelector, 'div');
			assert.lengthOf(vnode.children, 0);
		},
		'changing label'() {
			const formField: any = new FormLabelWidget({});
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
