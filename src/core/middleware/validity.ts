import { create, node, invalidator } from '../vdom';

const factory = create({ node, invalidator });

export const validity = factory(function({ middleware: { node, invalidator } }) {
	return {
		get(key: string | number, value: string) {
			const domNode = node.get(key) as HTMLFormElement | undefined;

			if (!domNode) {
				return { valid: undefined, message: '' };
			}

			if (value !== domNode.value) {
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
