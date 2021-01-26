import * as arg from 'arg';
import * as inquirer from 'inquirer';
function parseArgumentsIntoOptions(rawArgs: string[]) {
	const args = arg(
		{
			'--silent': Boolean,
			'--config': String,
			'-c': '--config',
			'-s': '--silent'
		},
		{
			argv: rawArgs.slice(2),
		}
	);
	return {
		skipPrompts: args['--silent'] || false,
		configFile: args['--config']
	};
}

async function promptForMissingOptions(options: { configFile: string | undefined; skipPrompts: boolean }) {
	const defaultConfigFile = 'config.json';
	if (options.skipPrompts) {
		return {
			...options,
			configFile: options.configFile || defaultConfigFile,
		};
	}

	const questions = [];
	if (!options.configFile) {
		questions.push({
			type: 'input',
			name: 'configFile',
			message: 'Please enter a configuration file',
			default: 'config.json',
		});
	}

	const answers = await inquirer.prompt(questions);
	return {
		...options,
		configFile: options.configFile || answers.configFile
	};
}

export async function cli(args: string[]) {
	console.log(await promptForMissingOptions(parseArgumentsIntoOptions(args)));
}
