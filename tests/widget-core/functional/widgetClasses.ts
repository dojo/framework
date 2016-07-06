import createButton from 'src/createButton';
import createWidget, { WidgetState } from 'src/createWidget';
import projector from 'src/projector';

const addClassButton = createButton({
	state: {
		id: 'button',
		label: 'Add Class'
	}
});

const header = createWidget({
	tagName: 'header',
	state: { id: 'header' }
});

let nextClass = 'foo';

interface TestState extends WidgetState {
	id: string;
};

addClassButton.on('click', (e: MouseEvent) => {
	const nextState: TestState  = {
		id: 'header'
	};

	switch (nextClass) {
		case 'foo':
			nextState.classes = ['foo'];
			nextClass = 'bar';
			break;
		case 'bar':
			nextState.classes = ['bar'];
			nextClass = 'baz';
			break;
		case 'baz':
			nextState.classes = ['baz'];
			nextClass = 'foo';
			break;
		default:
			nextState.classes = ['fail'];
	}

	header.setState(nextState);
});

projector.append(addClassButton);
projector.append(header);

projector.attach();

document.getElementsByTagName('body')[0].className += ' loaded';
