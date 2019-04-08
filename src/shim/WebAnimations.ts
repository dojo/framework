`!has('build-elide')`;
import 'web-animations-js/web-animations-next-lite.min';
import wrapper from './util/wrapper';

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

export const Animation = wrapper('Animation', true) as AnimationConstructor;
export const KeyframeEffect = wrapper('KeyframeEffect', true) as KeyframeEffectConstructor;
