import Base from './Base';

export class InputValidity extends Base {
	get(key: string | number, value: string) {
		const node = this.getNode(key) as HTMLFormElement | undefined;

		if (!node) {
			return { valid: undefined, message: '' };
		}

		if (value !== node.value) {
			// if the vdom is out of sync with the real dom our
			// validation check will be one render behind.
			// Call invalidate on the next loop.
			setTimeout(() => this.invalidate());
		}

		return {
			valid: node.validity.valid,
			message: node.validationMessage
		};
	}
}

export default InputValidity;
