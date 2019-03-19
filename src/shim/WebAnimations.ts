import global from './global';
`!has('build-elide')`;
import 'web-animations-js/web-animations-next-lite.min';
import has from '../has/has';

export type AnimationEffectTimingFillMode = 'none' | 'forwards' | 'backwards' | 'both' | 'auto';
export type AnimationEffectTimingPlaybackDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
export type AnimationPlayState = 'idle' | 'running' | 'paused' | 'finished';

export interface AnimationPlaybackEvent {
	target: Animation;
	readonly currentTime: number | null;
	readonly timelineTime: number | null;
	type: string;
	bubbles: boolean;
	cancelable: boolean;
	currentTarget: Animation;
	defaultPrevented: boolean;
	eventPhase: number;
	timeStamp: number;
}

export interface AnimationPlaybackEventInit extends EventInit {
	currentTime?: number | null;
	timelineTime?: number | null;
}

declare var AnimationPlaybackEvent: {
	prototype: AnimationPlaybackEvent;
	new (type: string, eventInitDict?: AnimationPlaybackEventInit): AnimationPlaybackEvent;
};

export interface AnimationKeyFrame {
	easing?: string | string[];
	offset?: number | Array<number | null> | null;
	opacity?: number | number[];
	transform?: string | string[];
}

export interface AnimationTimeline {
	readonly currentTime: number | null;
	getAnimations(): Animation[];
	play(effect: KeyframeEffect): Animation;
}

export interface AnimationEffectTiming {
	delay?: number;
	direction?: AnimationEffectTimingPlaybackDirection;
	duration?: number;
	easing?: string;
	endDelay?: number;
	fill?: AnimationEffectTimingFillMode;
	iterationStart?: number;
	iterations?: number;
	playbackRate?: number;
}

export interface AnimationEffectReadOnly {
	readonly timing: number;
	getComputedTiming(): ComputedTimingProperties;
}

export interface ComputedTimingProperties {
	endTime: number;
	activeDuration: number;
	localTime: number | null;
	progress: number | null;
	currentIteration: number | null;
}

export interface KeyframeEffect extends AnimationEffectReadOnly {
	activeDuration: number;
	onsample: (timeFraction: number | null, effect: KeyframeEffect, animation: Animation) => void | undefined;
	parent: KeyframeEffect | null;
	target: HTMLElement;
	timing: number;
	getComputedTiming(): ComputedTimingProperties;
	getFrames(): AnimationKeyFrame[];
	remove(): void;
}

export interface KeyframeEffectConstructor {
	prototype: KeyframeEffect;
	new (
		target: HTMLElement,
		effect: AnimationKeyFrame | AnimationKeyFrame[],
		timing: number | AnimationEffectTiming,
		id?: string
	): KeyframeEffect;
}

export type AnimationEventListener = (this: Animation, evt: AnimationPlaybackEvent) => any;

export interface Animation extends EventTarget {
	currentTime: number | null;
	id: string;
	oncancel: AnimationEventListener;
	onfinish: AnimationEventListener;
	readonly playState: AnimationPlayState;
	playbackRate: number;
	startTime: number;
	cancel(): void;
	finish(): void;
	pause(): void;
	play(): void;
	reverse(): void;
	addEventListener(type: 'finish' | 'cancel', handler: EventListener): void;
	removeEventListener(type: 'finish' | 'cancel', handler: EventListener): void;
	effect: AnimationEffectReadOnly;
	readonly finished: Promise<Animation>;
	readonly ready: Promise<Animation>;
	timeline: AnimationTimeline;
}

export interface AnimationConstructor {
	prototype: Animation;
	new (effect?: AnimationEffectReadOnly, timeline?: AnimationTimeline): Animation;
}

const _Animation = global.Animation as AnimationConstructor;
const _KeyframeEffect = global.KeyframeEffect as KeyframeEffectConstructor;
let animationReplacement: AnimationConstructor = _Animation;
let keyframeEffectReplacement: KeyframeEffectConstructor = _KeyframeEffect;
export let KeyframeEffect = class {
	constructor(
		target: HTMLElement,
		effect: AnimationKeyFrame | AnimationKeyFrame[],
		timing: number | AnimationEffectTiming,
		id?: string
	) {
		return new keyframeEffectReplacement(target, effect, timing, id);
	}
} as KeyframeEffectConstructor;

export let Animation = class {
	constructor(effect?: AnimationEffectReadOnly, timeline?: AnimationTimeline) {
		return new animationReplacement(effect, timeline);
	}
} as AnimationConstructor;

export function replaceAnimation(_Animation: AnimationConstructor): () => void {
	if (has('test')) {
		animationReplacement = _Animation;
		return () => {
			animationReplacement = global.Animation as AnimationConstructor;
		};
	} else {
		throw new Error('Replacement functionality is only available in a test environment');
	}
}

export function replaceKeyframeEffect(_KeyframeEffect: KeyframeEffectConstructor): () => void {
	if (has('test')) {
		keyframeEffectReplacement = _KeyframeEffect;
		return () => {
			keyframeEffectReplacement = global.KeyframeEffect as KeyframeEffectConstructor;
		};
	} else {
		throw new Error('Replacement functionality is only available in a test environment');
	}
}
