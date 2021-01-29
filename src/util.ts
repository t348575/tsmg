import {redBright} from 'chalk';
import {up} from 'inquirer/lib/utils/readline';

export function convertCase(stringCase: 'camel' | 'pascal' | 'snake', name: string, moveUp = false): string {
	let nameCase: 'pascal' | 'camel' | 'snake' = 'camel';
	if (name.indexOf('_') > 0 && name.lastIndexOf('-') !== name.length - 1) {
		nameCase = 'snake'
	}
	else if (name[0].toUpperCase() === name[0]) {
		nameCase = 'pascal';
	}
	else if(name[0].toLowerCase() === name[0]) {
		nameCase = 'camel';
	}
	if (moveUp && nameCase === 'camel') {
		stringCase = 'pascal';
	}
	switch (nameCase) {
		case 'pascal': {
			name = name[0].toLowerCase() + name.slice(1);
			if (stringCase === 'snake') {
				const upperCaseItems: number[] = [];
				const n = name.length;
				for (let i = 0; i < n; i++) {
					if (isLetter(name[i]) && name[i].toUpperCase() === name[i]) {
						upperCaseItems.push(i);
					}
				}
				name = name.toLowerCase();
				let count = 0;
				for (const v of upperCaseItems) {
					name = name.slice(0, v + count) + '_' + name.slice(v + count);
					count++;
				}
			}
			break;
		}
		case 'snake': {
			if (stringCase === 'camel' || stringCase === 'pascal') {
				name = name.toLowerCase();
				while (true) {
					const idx = name.indexOf('_');
					if (idx === -1) {
						break;
					}
					else {
						name = name.slice(0, idx) + name.slice(idx + 1, idx + 2).toUpperCase() + name.slice(idx + 2, name.length);
					}
				}
				if (stringCase === 'pascal') {
					name = name.slice(0, 1).toUpperCase() + name.slice(1);
				}
			}
			break;
		}
		case 'camel': {
			const upperCaseItems: number[] = [];
			const n = name.length;
			for (let i = 0; i < n; i++) {
				if (isLetter(name[i]) && name[i].toUpperCase() === name[i]) {
					upperCaseItems.push(i);
				}
			}
			name = name.toLowerCase();
			if (stringCase === 'snake') {
				let count = 0;
				for (const v of upperCaseItems) {
					name = name.slice(0, v + count) + '_' + name.slice(v + count);
					count++;
				}
			}
			else if (stringCase === 'pascal') {
				for (const v of upperCaseItems) {
					name = name.slice(0, v) + name.slice(v, v + 1).toUpperCase() + name.slice(v + 1);
				}
				name = name[0].toUpperCase() + name.slice(1);
			}
			break;
		}
	}
	return name;
}

export function isLetter(str: string): boolean {
	return str.length === 1 && /[a-z]/i.test(str);
}

export function checkGiven(
	obj: any,
	prop: string,
	given: 'string' | 'number' | 'object' | 'boolean' = 'string'
): boolean {
	return given === undefined || given === null || obj === undefined ||
		obj === null ? true : !obj.hasOwnProperty(prop) ||
		(obj.hasOwnProperty(prop) &&
			typeof obj[prop] !== given);
}

export function tab(size: number) {
	if (size > 0)
		return ' '.repeat(size);
	else
		return '';
}

export function getField(field: string, type: string, nullOptional: boolean, renameAttribute: boolean, stringCase: 'camel' | 'pascal' | 'snake') {
	if (type.indexOf('int') > -1 || type.indexOf('float') > -1 || type.indexOf('decimal') > -1 || type.indexOf('numeric') > -1) {
		return `${renameAttribute ? convertCase(stringCase, field) : field}${nullOptional ? '?:' : ':'} number;`;
	}
	if (
		type.indexOf('date') > -1 ||
		type.indexOf('time') > -1 ||
		type.indexOf('char') > -1 ||
		type.indexOf('text') > -1 ||
		type.indexOf('blob') > -1 ||
		type.indexOf('enum') > -1
	) {
		return `${renameAttribute ? convertCase(stringCase, field) : field}${nullOptional ? '?:' : ':'} string;`;
	}
}

export function throwError(error: string) {
	console.error(redBright('[ERROR] ') + error);
	process.exit(1);
}
