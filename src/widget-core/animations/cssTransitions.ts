import { VNodeProperties, SupportedClassName } from './../interfaces';

let browserSpecificTransitionEndEventName = '';
let browserSpecificAnimationEndEventName = '';

function determineBrowserStyleNames(element: HTMLElement) {
	if ('WebkitTransition' in element.style) {
		browserSpecificTransitionEndEventName = 'webkitTransitionEnd';
		browserSpecificAnimationEndEventName = 'webkitAnimationEnd';
	} else if ('transition' in element.style || 'MozTransition' in element.style) {
		browserSpecificTransitionEndEventName = 'transitionend';
		browserSpecificAnimationEndEventName = 'animationend';
	} else {
		throw new Error('Your browser is not supported');
	}
}

function initialize(element: HTMLElement) {
	if (browserSpecificAnimationEndEventName === '') {
		determineBrowserStyleNames(element);
	}
}

function runAndCleanUp(element: HTMLElement, startAnimation: () => void, finishAnimation: () => void) {
	initialize(element);

	let finished = false;

	let transitionEnd = function() {
		if (!finished) {
			finished = true;
			element.removeEventListener(browserSpecificTransitionEndEventName, transitionEnd);
			element.removeEventListener(browserSpecificAnimationEndEventName, transitionEnd);

			finishAnimation();
		}
	};

	startAnimation();

	element.addEventListener(browserSpecificAnimationEndEventName, transitionEnd);
	element.addEventListener(browserSpecificTransitionEndEventName, transitionEnd);
}

function exit(
	node: HTMLElement,
	properties: VNodeProperties,
	exitAnimation: SupportedClassName,
	removeNode: () => void
) {
	const activeClass = properties.exitAnimationActive || `${exitAnimation}-active`;

	runAndCleanUp(
		node,
		() => {
			exitAnimation && node.classList.add(exitAnimation);

			requestAnimationFrame(function() {
				node.classList.add(activeClass);
			});
		},
		() => {
			removeNode();
		}
	);
}

function enter(node: HTMLElement, properties: VNodeProperties, enterAnimation: SupportedClassName) {
	const activeClass = properties.enterAnimationActive || `${enterAnimation}-active`;

	runAndCleanUp(
		node,
		() => {
			enterAnimation && node.classList.add(enterAnimation);

			requestAnimationFrame(function() {
				node.classList.add(activeClass);
			});
		},
		() => {
			enterAnimation && node.classList.remove(enterAnimation);
			node.classList.remove(activeClass);
		}
	);
}

export default {
	enter,
	exit
};
