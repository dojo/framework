import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createFormFieldMixin, { ValueChangeEvent } from '../../../src/mixins/createFormFieldMixin';

registerSuite({
	name: 'mixins/createFormFieldMixin',
	construction() {
		const formfield = createFormFieldMixin({
			type: 'foo',
			state: {
				name: 'foo',
				value: 2,
				disabled: false
			}
		});
		assert.strictEqual(formfield.value, '2');
		assert.strictEqual(formfield.state.value, 2);
		assert.strictEqual(formfield.type, 'foo');
		assert.strictEqual(formfield.state.name, 'foo');
		assert.isFalse(formfield.state.disabled);
	},
	'.value'() {
		const value = { foo: 'foo' };
		const formfield = createFormFieldMixin({
			state: { value }
		});

		assert.strictEqual(formfield.value, '{"foo":"foo"}');
		formfield.setState({ value: { foo: 'bar' } });
		assert.deepEqual(formfield.value, '{"foo":"bar"}');
	},
	'.value - setState'() {
		let count = 0;
		const createAfterFormFieldMixin = createFormFieldMixin
			.after('setState', () => count++);
		const formfield = createAfterFormFieldMixin<string>();
		formfield.value = 'foo';
		assert.strictEqual(count, 1);
		formfield.value = 'foo';
		assert.strictEqual(count, 1);
	},
	'valuechange event': {
		'emitted'() {
			let count = 0;
			const formfield = createFormFieldMixin<string>();
			const handle = formfield.on('valuechange', (event) => {
				count++;
				assert.strictEqual(event.type, 'valuechange');
				assert.strictEqual(event.target, formfield);
				assert.strictEqual(event.oldValue, '');
				assert.strictEqual(event.value, 'bar');
				assert.isFalse(event.defaultPrevented);
				assert.isFunction(event.preventDefault);
			});
			formfield.value = 'bar';
			assert.strictEqual(count, 1);
			formfield.value = 'bar';
			assert.strictEqual(count, 1);
			handle.destroy();
			formfield.value = 'qat';
			assert.strictEqual(count, 1);
		},
		'cancelable'() {
			let count = 0;
			const formfield = createFormFieldMixin({
				value: 1,
				listeners: {
					valuechange(event: ValueChangeEvent<number>) {
						if (isNaN(Number(event.value))) {
							count++;
							event.preventDefault();
						}
					}
				}
			});

			assert.strictEqual(formfield.value, '1');
			assert.strictEqual(formfield.state.value, 1);
			formfield.value = '2';
			assert.strictEqual(formfield.value, '2');
			assert.strictEqual(formfield.state.value, 2);
			assert.strictEqual(count, 0);
			formfield.value = 'foo';
			assert.strictEqual(count, 1);
			assert.strictEqual(formfield.value, '2');
			assert.strictEqual(formfield.state.value, 2);
			formfield.value = '3.141592';
			assert.strictEqual(formfield.value, '3.141592');
			assert.strictEqual(formfield.state.value, 3.141592);
			assert.strictEqual(count, 1);
		}
	},
	'getNodeAttributes()': {
		'truthy value'() {
			const formfield = createFormFieldMixin({
				type: 'foo',
				state: {
					value: 'bar',
					name: 'baz'
				}
			});

			let nodeAttributes = formfield.getNodeAttributes();
			assert.strictEqual(nodeAttributes['type'], 'foo');
			assert.strictEqual(nodeAttributes['value'], 'bar');
			assert.strictEqual(nodeAttributes['name'], 'baz');
			assert.isUndefined(nodeAttributes['disabled']);

			formfield.setState({ disabled: true });

			nodeAttributes = formfield.getNodeAttributes();
			assert.strictEqual(nodeAttributes['type'], 'foo');
			assert.strictEqual(nodeAttributes['value'], 'bar');
			assert.strictEqual(nodeAttributes['name'], 'baz');
			assert.strictEqual(nodeAttributes['disabled'], 'disabled');

			formfield.setState({ disabled: false });

			nodeAttributes = formfield.getNodeAttributes();
			assert.strictEqual(nodeAttributes['type'], 'foo');
			assert.strictEqual(nodeAttributes['value'], 'bar');
			assert.strictEqual(nodeAttributes['name'], 'baz');
			assert.isUndefined(nodeAttributes['disabled']);
		},
		'falsey value'() {
			const formfield = createFormFieldMixin({
				type: 'foo',
				state: {
					value: '',
					name: 'baz'
				}
			});

			let nodeAttributes = formfield.getNodeAttributes();
			assert.strictEqual(nodeAttributes['value'], '');

			formfield.setState({
				value: undefined
			});

			nodeAttributes = formfield.getNodeAttributes();
			assert.isUndefined(formfield.state.value);
			assert.strictEqual(nodeAttributes['value'], '');
		}
	}
});
