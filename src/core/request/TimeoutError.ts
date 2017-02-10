export default class TimeoutError implements Error {
	readonly message: string;

	get name(): string {
		return 'TimeoutError';
	}

	constructor(message?: string) {
		message = message || 'The request timed out';
		this.message = message;
	}
}
