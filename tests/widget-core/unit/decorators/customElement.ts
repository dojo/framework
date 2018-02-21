const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { customElement } from '../../../src/decorators/customElement';
import { WidgetBase } from '../../../src/WidgetBase';
import { CustomElementChildType } from '../../../src/registerCustomElement';

interface CustomElementWidgetProperties {
	label: string;
	labelSuffix: string;
	onClick: () => void;
}

@customElement<CustomElementWidgetProperties>({
	tag: 'custom-element',
	attributes: ['key', 'label', 'labelSuffix'],
	properties: ['label'],
	events: ['onClick']
})
export class CustomElementWidget extends WidgetBase<CustomElementWidgetProperties> {}

describe('@customElement', () => {
	it('Should add the descriptor to the widget prototype', () => {
		assert.deepEqual((CustomElementWidget.prototype as any).__customElementDescriptor, {
			tagName: 'custom-element',
			attributes: ['key', 'label', 'labelSuffix'],
			properties: ['label'],
			events: ['onClick'],
			childType: CustomElementChildType.DOJO
		});
	});
});
