export type Table = {
	name: string;
	type: 'type' | 'interface';
	suffix: string;
	connector: string;
	database: string;
	file: string;
	omit: string[];
	err: boolean;
	data: Column[];
} | {
	name: string;
	type: 'class';
	database: string;
	suffix: string;
	connector: string;
	file: string;
	omit: string[];
	constructor: boolean;
	getterSetter: boolean;
	sqlCRUD: boolean;
	err: boolean;
	data: Column[];
};
export type Column = {
	Field: string;
	Type: string;
	Null: 'YES' | 'NO';
	Key: string;
	Default: string;
	Extra: string;
}
