const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { customElement } from '../../../../src/core/decorators/customElement';
import { WidgetBase } from '../../../../src/core/WidgetBase';

export interface CustomElementWidgetProperties {
	label: string;
	labelSuffix: string;
	onClick: () => void;
}

function registryFactory() {
	return {} as any;
}

@customElement({
	events: ['onClick2']
})
@customElement<CustomElementWidgetProperties>({
	tag: 'test-element'
})
@customElement<CustomElementWidgetProperties>({
	tag: 'custom-element',
	attributes: ['key', 'label', 'labelSuffix'],
	properties: ['label'],
	events: ['onClick'],
	registryFactory
})
export class CustomElementWidget extends WidgetBase<CustomElementWidgetProperties> {}

describe('@customElement', () => {
	it('Should add the descriptor to the widget prototype', () => {
		assert.deepEqual((CustomElementWidget as any).__customElementDescriptor, {
			tagName: 'test-element',
			attributes: ['key', 'label', 'labelSuffix'],
			properties: ['label'],
			events: ['onClick2'],
			registryFactory
		});
	});
});
