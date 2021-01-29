import {throwError} from './util';

export class DateTime {
	date: Date | undefined;
	mysqlDate: string | undefined;
	constructor(date: string | Date | number) {
		if (date instanceof Date) {
			this.date = date;
			this.mysqlDate = this.formatDateTime(this.date);
		}
		else if (typeof date === 'string') {
			this.date = new Date(date);
			this.mysqlDate = this.formatDateTime(this.date);
		}
		else if (typeof date === 'number') {
			this.date = new Date(date);
			this.mysqlDate = this.formatDateTime(this.date);
		}
		else {
			throwError(`Improper input ${date}`);
		}
	}
	formatDate(date: Date): string {
		let month = '' + (date.getMonth() + 1), day = '' + date.getDate(), year = date.getFullYear();
		if (month.length < 2) {
			month = '0' + month;
		}
		if (day.length < 2) {
			day = '0' + day;
		}
		return [year, month, day].join('-');
	}
	formatDateTime(date: Date | number): string {
		if (typeof date === 'number') {
			date = new Date(date);
		}
		return this.formatDate(date) + ' ' + date.toTimeString().split(' ')[0];
	}
}
