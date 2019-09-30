import { create, node, invalidator } from '../vdom';

const factory = create({ node, invalidator });

const validity = factory(function({ middleware: { node, invalidator } }) {
	return {
		get(key: string | number, value: string, required: boolean) {
			const domNode = node.get(key) as HTMLFormElement | undefined;

			if (!domNode) {
				return { valid: undefined, message: '' };
			}

			const nodeRequired = domNode.attributes.getNamedItem('required');
			if (value !== domNode.value && required !== Boolean(nodeRequired && nodeRequired.value)) {
				setTimeout(() => invalidator());
			}

			return {
				valid: domNode.validity.valid,
				message: domNode.validationMessage
			};
		}
	};
});

export default validity;
