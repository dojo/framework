export function decode(segment: string | number) {
	return typeof segment === 'number' ? segment : segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function encode(segment: string | number) {
	return typeof segment === 'number' ? segment : segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export interface PointerTarget {
	object: any;
	target: any;
	segment: string | number;
}

export function walk(
	segments: (string | number)[],
	object: any,
	clone = true,
	continueOnUndefined = true
): PointerTarget {
	if (clone) {
		object = { ...object };
	}
	const pointerTarget: PointerTarget = {
		object,
		target: object,
		segment: ''
	};

	return segments.reduce((pointerTarget, segment, index) => {
		if (pointerTarget.target === undefined) {
			return pointerTarget;
		}
		if (Array.isArray(pointerTarget.target) && segment === '-') {
			segment = pointerTarget.target.length - 1;
		}
		if (index + 1 < segments.length) {
			const nextSegment: any = segments[index + 1];
			let target = pointerTarget.target[segment];

			if (target === undefined && !continueOnUndefined) {
				pointerTarget.target = undefined;
				return pointerTarget;
			}

			if (clone || target === undefined) {
				if (Array.isArray(target)) {
					target = [...target];
				} else if (typeof target === 'object') {
					target = { ...target };
				} else if (typeof nextSegment === 'number') {
					target = [];
				} else {
					target = {};
				}
				pointerTarget.target[segment] = target;
				pointerTarget.target = target;
			} else {
				pointerTarget.target = target;
			}
		} else {
			pointerTarget.segment = segment;
		}
		return pointerTarget;
	}, pointerTarget);
}

export class Pointer<T = any, U = any> {
	private readonly _segments: (string | number)[];

	constructor(segments: number | string | (string | number)[]) {
		if (Array.isArray(segments)) {
			this._segments = segments;
		} else {
			this._segments =
				typeof segments === 'string'
					? (segments[0] === '/' ? segments : `/${segments}`).split('/')
					: [segments];
			this._segments.shift();
		}
		if (
			typeof segments !== 'number' &&
			(segments.length === 0 || ((segments.length === 1 && segments[0] === '/') || segments[0] === ''))
		) {
			throw new Error('Access to the root is not supported.');
		}
		this._segments = this._segments.map(decode);
	}

	public get segments(): (string | number)[] {
		return this._segments;
	}

	public get path(): string {
		return `/${this._segments.map(encode).join('/')}`;
	}

	get(object: T): U {
		const pointerTarget: PointerTarget = walk(this.segments, object, false, false);
		if (pointerTarget.target === undefined) {
			return undefined as any;
		}
		return pointerTarget.target[pointerTarget.segment];
	}

	toJSON(): string {
		return this.toString();
	}

	toString(): string {
		return this.path;
	}
}
