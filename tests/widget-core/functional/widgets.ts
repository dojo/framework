import createButton from '../../src/createButton';
import createTextInput from '../../src/createTextInput';
import projector from '../../src/projector';

const output = (<HTMLPreElement> document.getElementById('output'));

const button = createButton({
	state: {
		id: 'button1',
		label: 'button1'
	}
});

button.on('click', (e: MouseEvent) => {
	output.innerHTML = JSON.stringify(button.state);
});

const input = createTextInput({
	state: {
		id: 'textinput1',
		name: 'textinput1'
	}
});

input.on('input', (e: UIEvent) => {
	output.innerHTML = JSON.stringify(input.state);
});

projector.append(button);
projector.append(input);

projector.attach();

document.getElementsByTagName('body')[0].className += ' loaded';
