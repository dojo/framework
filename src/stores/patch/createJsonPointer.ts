export interface JsonPointer {
	segments(): string[];
	toString(): string;
	push(segment: String): JsonPointer;
	pop(): JsonPointer;
}

export function navigate(path: JsonPointer, target: any) {
	return path.segments().reduce(function(prev: any, next: string) {
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

function createJsonPointer(...segments: string[]): JsonPointer {
	return {
		segments: function() {
			return segments.map(segment => decode(segment));
		}, toString() {
			return toString(...segments);
		},
		push: function(segment: string) {
			return createJsonPointer(...segments.concat(segment));
		},
		pop: function() { return createJsonPointer(...segments.slice(0, segments.length - 1));
		}
	};
}
export default createJsonPointer;
