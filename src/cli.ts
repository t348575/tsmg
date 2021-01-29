import * as arg from 'arg';
import * as inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import {greenBright, redBright} from 'chalk';
import {Config, setDefaultTableOptions, stringToTable} from './config';
import {MysqlError} from 'mysql';
import {Column, Table} from './types';
import {convertCase, getField, tab, throwError} from './util';

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
	try {
		const options: { configFile: string; skipPrompts: boolean } = await promptForMissingOptions(parseArgumentsIntoOptions(args));
		const configFilePath = path.resolve(options.configFile);
		const config = new Config();
		let mysql;
		let temp;
		try {
			temp = JSON.parse(fs.readFileSync(configFilePath, { flag: 'r' }).toString());
		} catch (e) {
			if (e.code === 'ENOENT') {
				throwError(`Could not find file at path: ${configFilePath}`);
			}
			throwError('Config file not in JSON');
		}
		config.parseConfig(temp);
		console.log(greenBright('[VERIFY] ') + configFilePath);
		switch (config.driver) {
			case 'mysql': {
				mysql = await require('mysql');
				config.driverOptions.multipleStatements = true;
				config.connection = mysql.createConnection(config.driverOptions);
				config.connection.connect(async (connectionErr: MysqlError) => {
					if (connectionErr) {
						throwError('Could not connect to server');
					}
					try {
						console.log(greenBright('[CONNECTED]') + ' to server');
						await selectDatabase(config);
						const prev: string[] = [];
						if (config.entireDatabase) {
							config.tables = await getTables(config);
						}
						const filters = await filterTables(config);
						config.tables = config.tables.filter(e => filters.indexOf(e.name) > -1);
						for (const v of config.tables) {
							try {
								v.data = await getColumns(config, v.name);
							} catch(e) {
								v.err = true;
								if (e.errno === 1049) {
									console.error(redBright('[ERROR] ') + `${v.database} database does not exist!`)
								}
								else if (e.errno === 1146) {
									console.error(redBright('[ERROR] ') + `${v.name} table does not exist!`);
								}
								else {
									console.error(redBright('[ERROR] ') + `${v.name} executed with errors!`);
								}
							}
							if (v.data !== undefined && v.data.length > 0) {
								prev.push(writeFile(config, v, prev));
							}
						}
						config.connection.end();
					}
					catch(e) {
						console.log(e);
						throwError('Unknown error occurred');
					}
				});
				break;
			}
		}
	} catch (e) {
		console.log(e);
		throwError('Unknown error occurred');
	}
}

function selectDatabase(config: Config, db = config.defaultDb): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		switch (config.driver) {
			case 'mysql': {
				config.connection.query(`USE ${db}`, (err: MysqlError) => {
					if (err) {
						if (err.errno === 1049) {
							throwError(`${db} database does not exist!`);
						} else {
							reject(err);
						}
					}
					else {
						resolve();
					}
				})
				break;
			}
		}
	});
}

function getColumns(config: Config, name: string, db = config.defaultDb): Promise<Column[]> {
	return new Promise<Column[]>((resolve, reject) => {
		config.connection.query(`USE ${db}; SHOW FIELDS FROM ${name}`, (err: MysqlError, res: any[]) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(res[1].map((e: Column) => ({
					Field: e.Field.toLowerCase(),
					Type: e.Type.toLowerCase(),
					Null: e.Null,
					Key: e.Key,
					Default: e.Default,
					Extra: e.Extra
				})));
			}
		});
	});
}

function writeFile(config: Config, table: Table, prev: string[]): string {
	const name = (config.renameTableToCase ? convertCase(config.case, table.name): table.name) + convertCase(config.case, table.suffix, true);
	const tabSize = tab(config.tabSize);
	let data = `\nexport ${table.type} ${name} ${table.type === 'type' ? '=' : ''} {`;
	for (const v of table.data) {
		let skip = false;
		for (const o of table.omit) {
			const idx = o.lastIndexOf('/');
			if (idx > -1 && idx !== o.length - 1) {
				if (new RegExp(o.slice(0, idx + 1), o.slice(idx + 1)).test(v.Field)) {
					skip = true;
					break;
				}
			}
			else {
				if (new RegExp(o).test(v.Field)) {
					skip = true;
					break;
				}
			}
		}
		if (!skip) {
			data += `\n${tabSize}${getField(v.Field, v.Type, config.setNullAsOptional, config.renameAttributeToCase, config.case)}`
		}
	}
	if (table.type === 'class' && (table.constructor || table.sqlCRUD)) {
		if (table.constructor) {
			data += `\n${tabSize}constructor(opt ?: any | ${name}) {\n`;
			data += `${tabSize}${tabSize}if (opt instanceof ${name} || typeof opt === 'object') {\n`;
			data += `${tabSize}${tabSize}${tabSize}for (const v in opt) {\n`;
			data += `${tabSize}${tabSize}${tabSize}${tabSize}if (this.hasOwnProperty(v) && typeof opt[v] === typeof this[v]) {\n`;
			data += `${tabSize}${tabSize}${tabSize}${tabSize}${tabSize}this[v] = opt[v];\n`;
			data += `${tabSize}${tabSize}${tabSize}${tabSize}}\n`;
			data += `${tabSize}${tabSize}${tabSize}}\n`;
			data += `${tabSize}${tabSize}}\n`;
			data += `${tabSize}}\n`;
		}
	}
	data += `\n}`;
	if (table.type === 'type') {
		data += ';';
	}
	// @ts-ignore
	const file = path.resolve(config.dir, `${table.file}.ts`);
	const exists = fs.existsSync(file);
	try {
		let mode = 'a+';
		if (config.reWrite && prev.indexOf(file) === -1) {
			mode = 'w+';
		}
		prev.push(file);
		fs.writeFileSync(file, data, { flag: mode });
		console.log(greenBright(`[${exists ? 'APPEND' : 'CREATE'}] `) + file + ' ' + table.name);
	} catch (e) {
		console.log(redBright(`[${exists ? 'APPEND' : 'CREATE'}] `) + file + ' ' + table.name);
	}
	return file;
}
function getTables(config: Config): Promise<Table[]> {
	return new Promise<Table[]>((resolve, reject) => {
		config.connection.query(`SHOW TABLES FROM ${config.defaultDb}`, (err: any, res: any) => {
			if (err) {
				reject(err);
			}
			else if (res.length > 0) {
				const key = Object.keys(res[0])[0];
				res = res.map((e: any) => e[key]);
				for (const [idx, v] of res.entries()) {
					res[idx] = setDefaultTableOptions(stringToTable(v, config), config);
				}
				resolve(res);
			} else {
				reject(new Error('Empty database'));
			}
		});
	});
}
function filterTables(config: Config): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		config.connection.query(`SHOW FULL TABLES FROM ${config.defaultDb}`, (err: any, res: any) => {
			if (err) {
				reject(err);
			}
			else if (res.length > 0) {
				const keyMain = Object.keys(res[0])[0];
				const secondKey = Object.keys(res[0])[1];
				if (!config.modelViews) {
					res = res.filter((e: any) => e[secondKey].toLowerCase().indexOf('table') > -1);
				}
				res = res.map((e: any) => e[keyMain]);
				resolve(res);
			} else {
				reject(new Error('Empty database'));
			}
		});
	});
}
