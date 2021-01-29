import {Table} from './types';
import {checkGiven, convertCase, throwError} from './util';

export class Config {

	driver: 'mysql' = 'mysql';
	driverOptions: any;
	dir: string | undefined;
	defaultDb: string | undefined;
	entireDatabase = false;
	singleFile = false;
	defaultSuffix = 'model';
	defaultConnector = '-';
	renameTableToCase = true;
	renameAttributeToCase = false;
	setNullAsOptional = false;
	dateTimeAsDate = true;
	dateAsDate = true;
	reWrite = false;
	modelViews = false;
	classOptions = {
		constructor: false,
		sqlCRUD: false
	};
	case: 'camel' | 'pascal' | 'snake' = 'camel';
	tabSize = 4;
	defaultType: 'interface' | 'class' | 'type' = 'interface';
	tables: Table[] = [];
	connection: any;
	optionsList: { name: string, filter ?: string[] | number[] }[] = [
		{
			name: 'case',
			filter: ['camel', 'pascal', 'snake']
		},
		{
			name: 'renameTableToCase'
		},
		{
			name: 'renameAttributeToCase'
		},
		{
			name: 'setNullAsOptional'
		},
		{
			name: 'dateTimeAsDate'
		},
		{
			name: 'dateAsDate'
		},
		{
			name: 'defaultType',
			filter: ['class', 'interface', 'type']
		},
		{
			name: 'tabSize'
		},
		{
			name: 'modelViews'
		},
		{
			name: 'defaultConnector'
		},
		{
			name: 'defaultSuffix'
		},
		{
			name: 'reWrite'
		}
	]

	constructor(opt ?: any) {
		if (opt !== undefined && opt !== null) {
			this.parseConfig(opt)
		}
	}

	parseConfig(opt: any) {
		if (checkGiven(opt, 'driver')) {
			throwError('Database driver not specified');
		}
		if (checkGiven(opt, 'driverOptions', 'object')) {
			throwError('driverOptions not specified');
		}

		switch (opt.driver) {
			case 'mysql': {
				if (checkGiven(opt.driverOptions, 'host')) {
					throwError('No host specified');
				}
				if (checkGiven(opt.driverOptions, 'user')) {
					throwError('No user specified');
				}
				break;
			}
			default: {
				throwError(`Unrecognized database driver ${opt.driver}`);
			}
		}

		if (checkGiven(opt, 'dir')) {
			throwError('Default directory not specified');
		}
		if (checkGiven(opt, 'defaultDb')) {
			throwError('Default database not specified');
		}
		if (
			!checkGiven(opt, 'entireDatabase', 'boolean')
			&& opt.entireDatabase
		) {
			this.entireDatabase = true;
		}
		else {
			if (checkGiven(opt, 'tables', 'object')) {
				throwError('Tables not specified');
			}
			checkTables(opt.tables);
		}
		if (!checkGiven(opt, 'classOptions', 'object')) {
			const classOptions = ['constructor', 'sqlCRUD'];
			for (const v in opt.classOptions) {
				if (classOptions.indexOf(v) > -1 && !checkGiven(opt.classOptions, v, 'boolean')) {
					// @ts-ignore
					this.classOptions[v] = opt.classOptions[v];
				}
			}
		}
		this.driver = opt.driver;
		this.driverOptions = opt.driverOptions;
		this.dir = opt.dir;
		this.defaultDb = opt.defaultDb;
		for (const v of this.optionsList) {
			checkAndInsert(v.name, opt, this, v.filter);
		}
		if (!checkGiven(opt, 'tables', 'object') && opt.tables instanceof Array) {
			for (const [idx, v] of opt.tables.entries()) {
				if (typeof v === 'string') {
					opt.tables[idx] = stringToTable(v, this);
				}
				opt.tables[idx] = setDefaultTableOptions(opt.tables[idx], this);
			}
			this.tables = opt.tables as Table[];
		}
	}
}

function checkTables(tables: any[]): void {
	if (!(tables instanceof Array)) {
		throwError('Tables must be an array');
	}
	if (tables.length === 0) {
		throwError('Tables array empty');
	}
	for (const [idx, v] of tables.entries()) {
		if (typeof v === 'string') {
			if (v.length === 0) {
				throwError(`Empty item in tables at index ${idx}`);
			}
		}
		else if (typeof v === 'object') {
			if (checkGiven(v, 'name', 'string')) {
				throwError('Table name not given');
			}
		}
		else {
			throwError(`Elements of tables cannot have items of type ${typeof v}`);
		}
	}
}

export function setDefaultTableOptions(obj: any, config: Config): Table {
	const defaultTable = {
		name: '',
		type: config.defaultType,
		database: config.defaultDb,
		suffix: config.defaultSuffix,
		connector: config.defaultConnector,
		file: (!checkGiven(obj, 'file') ? obj.file : obj.name),
		omit: [],
		constructor: false,
		sqlCRUD: false,
		err: false,
		data: []
	} as Table;
	const checkList: { name: string, filter ?: string[] | number[] }[] = [
		{
			name: 'type',
			filter: ['interface', 'class', 'type']
		},
		{
			name: 'suffix'
		},
		{
			name: 'connector'
		},
		{
			name: 'database'
		},
		{
			name: 'file'
		},
		{
			name: 'omit'
		},
		{
			name: 'name'
		},
		{
			name: 'constructor'
		},
		{
			name: 'sqlCRUD'
		}
	];
	for (const v of checkList) {
		checkAndInsert(v.name, obj, defaultTable, v.filter);
	}
	return defaultTable;
}

export function stringToTable(str: string, config: Config): Table {
	return {
		type: config.defaultType,
		suffix: config.defaultSuffix,
		connector: config.defaultConnector,
		name: str,
		file: (config.renameTableToCase ? convertCase(config.case, str): str) + config.defaultConnector + convertCase(config.case, config.defaultSuffix)
	} as Table;
}

function checkAndInsert(name: string, opt: any, config: Config | Table, filter ?: string[] | number[]): void {
	// @ts-ignore
	if (filter && filter.length > 0 && !checkGiven(opt, name) && filter.indexOf(opt[name]) > -1) {
		// @ts-ignore
		config[name] = opt[name];
	}
	// @ts-ignore
	else if (!checkGiven(opt, name, typeof config[name]) && opt[name]) {
		// @ts-ignore
		config[name] = opt[name];
	}
}
