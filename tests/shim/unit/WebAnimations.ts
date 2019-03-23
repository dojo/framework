import { replaceAnimation, replaceKeyframeEffect, KeyframeEffect, Animation } from '../../../src/shim/WebAnimations';
import has, { add } from '../../../src/has/has';
import * as sinon from 'sinon';
const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

let featureValue: any;
let keyFrameHandle: () => void;
let animationHandle: () => void;
registerSuite('web animation', {
	before() {
		try {
			featureValue = has('test');
		} catch {}
	},
	beforeEach() {
		add('test', true, true);
	},
	after() {
		add('test', typeof featureValue !== 'undefined' ? featureValue : false, true);
		animationHandle();
		keyFrameHandle();
	},
	tests: {
		keyframeEffect: {
			'should provide replacement functionality'() {
				const onsample = sinon.stub();
				const getComputedTiming = sinon.stub();
				const getFrames = sinon.stub();
				const remove = sinon.stub();
				const keyFrameConstructor = sinon.stub();

				keyFrameHandle = replaceKeyframeEffect(class {
					getComputedTiming = getComputedTiming;
					getFrames = getFrames;
					remove = remove;
					onsample = onsample;
					constructor(...args: any[]) {
						return keyFrameConstructor(...args);
					}
				} as any);

				const keyframeEffect = new KeyframeEffect(
					'target' as any,
					'effect' as any,
					'timing' as any,
					'id' as any
				);

				keyframeEffect.getComputedTiming();
				keyframeEffect.getFrames();
				keyframeEffect.remove();
				keyframeEffect.onsample('timeFraction' as any, 'effect' as any, 'animation' as any);

				assert.isTrue(getComputedTiming.calledOnce);
				assert.isTrue(getFrames.calledOnce);
				assert.isTrue(remove.calledOnce);
				assert.deepEqual(keyFrameConstructor.args, [['target', 'effect', 'timing', 'id']]);
				assert.deepEqual(onsample.args, [['timeFraction', 'effect', 'animation']]);
			},
			'should provide the ability to revert replacement'() {
				const keyFrameConstructor = sinon.stub();

				replaceKeyframeEffect(class {
					constructor(...args: any[]) {
						return keyFrameConstructor(...args);
					}
				} as any)();

				try {
					new KeyframeEffect(null as any, null as any, null as any);
				} catch {}

				assert.isFalse(keyFrameConstructor.called);
			},
			'should not allow replacement in non-test environments'() {
				add('test', false, true);
				assert.throws(() => {
					replaceKeyframeEffect(null as any);
				}, 'Replacement functionality is only available in a test environment');
			}
		},
		animation: {
			'should provide replacement functionality'() {
				const cancel = sinon.stub();
				const finish = sinon.stub();
				const pause = sinon.stub();
				const play = sinon.stub();
				const animationConstructor = sinon.stub();

				animationHandle = replaceAnimation(class {
					cancel = cancel;
					finish = finish;
					pause = pause;
					play = play;
					constructor(...args: any[]) {
						return animationConstructor(...args);
					}
				} as any);

				const animation = new Animation('effect' as any, 'timeline' as any);
				animation.cancel();
				animation.finish();
				animation.pause();
				animation.play();

				assert.isTrue(cancel.calledOnce);
				assert.isTrue(finish.calledOnce);
				assert.isTrue(pause.calledOnce);
				assert.isTrue(play.calledOnce);
				assert.deepEqual(animationConstructor.args, [['effect', 'timeline']]);
			},
			'should provide the ability to revert replacement'() {
				const animationConstructor = sinon.stub();

				replaceAnimation(class {
					constructor(...args: any[]) {
						return animationConstructor(...args);
					}
				} as any)();

				try {
					new Animation(null as any, null as any);
				} catch {}

				assert.isFalse(animationConstructor.called);
			},
			'should not allow replacement in non-test environments'() {
				add('test', false, true);
				assert.throws(() => {
					replaceAnimation(null as any);
				}, 'Replacement functionality is only available in a test environment');
			}
		}
	}
});
