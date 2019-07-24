import { Base } from './Base';
import Map from '../../shim/Map';
import global from '../../shim/global';
import { Animation, KeyframeEffect, AnimationEffectTiming, AnimationKeyFrame } from '../../shim/WebAnimations';

/**
 * Animation controls are used to control the web animation that has been applied
 * to a vdom node.
 */
export interface AnimationControls {
	play?: boolean;
	onFinish?: () => void;
	onCancel?: () => void;
	reverse?: boolean;
	cancel?: boolean;
	finish?: boolean;
	playbackRate?: number;
	startTime?: number;
	currentTime?: number;
}
/**
 * Animation properties that can be passed as vdom property `animate`
 */
export interface AnimationProperties {
	id: string;
	effects: (() => AnimationKeyFrame | AnimationKeyFrame[]) | AnimationKeyFrame | AnimationKeyFrame[];
	controls?: AnimationControls;
	timing?: AnimationEffectTiming;
}

export type AnimationPropertiesFunction = () => AnimationProperties;

/**
 * Info returned by the `get` function on WebAnimation meta
 */
export interface AnimationInfo {
	currentTime: number;
	playState: 'idle' | 'pending' | 'running' | 'paused' | 'finished';
	playbackRate: number;
	startTime: number;
}

export interface AnimationPlayer {
	player: any;
	used: boolean;
}

export class WebAnimations extends Base {
	private _animationMap = new Map<string, AnimationPlayer>();

	private _createPlayer(node: HTMLElement, properties: AnimationProperties): any {
		const { effects, timing = {} } = properties;

		const fx = typeof effects === 'function' ? effects() : effects;

		const keyframeEffect = new KeyframeEffect(node, fx, timing);

		return new Animation(keyframeEffect, global.document.timeline);
	}

	private _updatePlayer(player: any, controls: AnimationControls) {
		const { play, reverse, cancel, finish, onFinish, onCancel, playbackRate, startTime, currentTime } = controls;

		if (playbackRate !== undefined) {
			player.playbackRate = playbackRate;
		}

		if (reverse) {
			player.reverse();
		}

		if (cancel) {
			player.cancel();
		}

		if (finish) {
			player.finish();
		}

		if (startTime !== undefined) {
			player.startTime = startTime;
		}

		if (currentTime !== undefined) {
			player.currentTime = currentTime;
		}

		if (play) {
			player.play();
		} else {
			player.pause();
		}

		if (onFinish) {
			player.onfinish = onFinish.bind(this._bind);
		}

		if (onCancel) {
			player.oncancel = onCancel.bind(this._bind);
		}
	}

	animate(
		key: string,
		animateProperties:
			| AnimationProperties
			| AnimationPropertiesFunction
			| (AnimationProperties | AnimationPropertiesFunction)[]
	) {
		const node = this.getNode(key) as HTMLElement;

		if (node) {
			if (!Array.isArray(animateProperties)) {
				animateProperties = [animateProperties];
			}
			animateProperties.forEach((properties) => {
				properties = typeof properties === 'function' ? properties() : properties;

				if (properties) {
					const { id } = properties;
					if (!this._animationMap.has(id)) {
						this._animationMap.set(id, {
							player: this._createPlayer(node, properties),
							used: true
						});
					}

					const animation = this._animationMap.get(id);
					const { controls = {} } = properties;

					if (animation) {
						this._updatePlayer(animation.player, controls);

						this._animationMap.set(id, {
							player: animation.player,
							used: true
						});
					}
				}
			});
		}
	}

	get(id: string): Readonly<AnimationInfo> | undefined {
		const animation = this._animationMap.get(id);
		if (animation) {
			const { currentTime, playState, playbackRate, startTime } = animation.player;

			return {
				currentTime: currentTime || 0,
				playState,
				playbackRate,
				startTime: startTime || 0
			};
		}
	}

	afterRender() {
		this._animationMap.forEach((animation, key) => {
			if (!animation.used) {
				animation.player.cancel();
				this._animationMap.delete(key);
			}
			animation.used = false;
		});
	}
}

export default WebAnimations;
