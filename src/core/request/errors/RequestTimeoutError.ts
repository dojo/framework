import { RequestError, Response } from '../../request';

export default class RequestTimeoutError<T> implements RequestError<T> {
	message: string;
	get name(): string {
		return 'RequestTimeoutError';
	}

	response: Response<T>;

	constructor(message?: string) {
		this.message = message || 'The request timed out.';
	}
}
