import has from 'dojo-core/has';

// TODO: The default loader attempts to use the native Node.js `require` when running on Node. However, the Intern
// suite uses the dojo-loader, in which case the context for requires is the location of the loader module; or in
// this case, `node_modules/dojo-loader/loader.min.js'. Is there a better, less hacky way to handle this?
const basePath = has('host-node') ? '../_build/' : '';
const bundlePath = basePath + 'tests/support/mocks/common/party';

const messages = {
	guestInfo: `{gender, select,
		female {
			{guestCount, plural, offset:1
			=0 {{host} does not give a party.}
			=1 {{host} invites {guest} to her party.}
			=2 {{host} invites {guest} and one other person to her party.}
			other {{host} invites {guest} and # other people to her party.}}}
		male {
			{guestCount, plural, offset:1
			=0 {{host} does not give a party.}
			=1 {{host} invites {guest} to his party.}
			=2 {{host} invites {guest} and one other person to his party.}
			other {{host} invites {guest} and # other people to his party.}}}
		other {
			{guestCount, plural, offset:1
			=0 {{host} does not give a party.}
			=1 {{host} invites {guest} to their party.}
			=2 {{host} invites {guest} and one other person to their party.}
			other {{host} invites {guest} and # other people to their party.}}}}`
};

export default { bundlePath, messages };
