export function decode(segment: string) {
	return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function encode(segment: string) {
	return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export interface PointerTarget {
	object: any;
	target: any;
	segment: string;
}

export function walk(segments: string[], object: any, clone = true): PointerTarget {
	if (clone) {
		object = { ...object };
	}
	const pointerTarget: PointerTarget = {
		object,
		target: object,
		segment: ''
	};

	return segments.reduce((pointerTarget, segment, index) => {
		if (Array.isArray(pointerTarget.target) && segment === '-') {
			segment = String(pointerTarget.target.length - 1);
		}
		if (index + 1 < segments.length) {
			const nextSegment = segments[index + 1];
			let target = pointerTarget.target[segment];

			if (clone || target === undefined) {
				if (Array.isArray(target)) {
					target = [...target];
				} else if (typeof target === 'object') {
					target = { ...target };
				} else if (isNaN(parseInt(nextSegment, 0))) {
					target = {};
				} else {
					target = [];
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
	private readonly _segments: string[];

	constructor(segments: string | string[]) {
		if (Array.isArray(segments)) {
			this._segments = segments;
		} else {
			this._segments = (segments[0] === '/' ? segments : `/${segments}`).split('/');
			this._segments.shift();
		}
		if (segments.length === 0 || ((segments.length === 1 && segments[0] === '/') || segments[0] === '')) {
			throw new Error('Access to the root is not supported.');
		}
		this._segments = this._segments.map(decode);
	}

	public get segments(): string[] {
		return this._segments;
	}

	public get path(): string {
		return `/${this._segments.map(encode).join('/')}`;
	}

	get(object: T): U {
		const pointerTarget: PointerTarget = walk(this.segments, object, false);
		return pointerTarget.target[pointerTarget.segment];
	}
}
