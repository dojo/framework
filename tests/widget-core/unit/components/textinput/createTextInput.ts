import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createTextInput from '../../../../src/components/textinput/createTextInput';

registerSuite({
	name: 'createTextInput',
	construction() {
		const textInput = createTextInput({
			properties: {
				id: 'foo',
				name: 'baz'
			}
		});
		assert.strictEqual(textInput.state.id, 'foo');
		assert.strictEqual(textInput.state.name, 'baz');
	},
	nodeAttributes() {
		const textInput = createTextInput();
		const nodeAttributes = textInput.getNodeAttributes();
		assert.equal(nodeAttributes.oninput, textInput.onInput);
	},
	onInput() {
		const textInput = createTextInput();
		textInput.onInput(<any> { target: { value: 'hello world' } });
		assert.equal(textInput.value, 'hello world');
	}
});
