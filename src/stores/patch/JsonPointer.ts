export function navigate(path: JsonPointer, target: any) {
	return path.segments.reduce(function(prev: any, next: string) {
		return prev ? prev[next] : prev;
	}, target);
}

function decode(segment: string) {
	return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function encode(segment: string) {
	return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toString(...segments: string[]): string {
	return segments.reduce(function(prev, next) {
		return prev + '/' + encode(next);
	});
}

export default class JsonPointer {
	private _segments: string[];
	get segments() {
		return this._segments.map((segment) => decode(segment));
	}

	push(segment: string) {
		return new JsonPointer(...this._segments.concat(segment));
	}

	toString() {
		return toString(...this._segments);
	}

	pop() {
		return new JsonPointer(...this._segments.slice(0, this._segments.length - 1));
	}
	constructor(...segments: string[]) {
		this._segments = segments;
	}
}
