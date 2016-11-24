import createButton from '../createButton';
import { Child } from '../mixins/interfaces';
import { createProjector } from '../projector';

const buttonWidgets: Child[] = [];

buttonWidgets.push(createButton({
	state: {
		label: 'Button'
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Disabled',
		disabled: true
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Success',
		classes: ['success']
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Disabled',
		classes: ['success'],
		disabled: true
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Alert',
		classes: ['alert']
	}
}));

buttonWidgets.push(createButton({
	state: {
		label: 'Disabled',
		classes: ['alert'],
		disabled: true
	}
}));

const buttonDiv = document.createElement('div');
buttonDiv.classList.add('buttons');
document.body.appendChild(buttonDiv);
const buttonProjector = createProjector({ root: buttonDiv });
buttonProjector.append(buttonWidgets);
buttonProjector.attach();
