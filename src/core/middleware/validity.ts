import { create, node, invalidator } from '../vdom';

const factory = create({ node, invalidator });

const validity = factory(function({ middleware: { node, invalidator } }) {
	return {
		get(key: string | number, value: string) {
			const domNode = node.get(key) as HTMLFormElement | undefined;

			if (!domNode) {
				return { valid: undefined, message: '' };
			}

			if (value !== domNode.value) {
				// if the vdom is out of sync with the real dom our
				// validation check will be one render behind.
				// Call invalidate on the next loop.
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
