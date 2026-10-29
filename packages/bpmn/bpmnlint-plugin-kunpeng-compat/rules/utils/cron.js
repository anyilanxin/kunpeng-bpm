const MACROS = [
  '@yearly',
  '@annually',
  '@monthly',
  '@weekly',
  '@daily',
  '@midnight',
  '@hourly'
];
const MACRO_REGEX = new RegExp(`^(${ MACROS.join('|') })$`);

function validateMacro(text) {
  return MACRO_REGEX.test(text);
}

const ASTERISK = '\\*';
const QUESTION_MARK = '\\?';
const COMMA = ',';

const SECOND = '([0-5]?[0-9])';
const MINUTE = '([0-5]?[0-9])';
const HOUR = '([01]?[0-9]|2[0-3])';
const DAY_OF_MONTH = or(`L(-${ or('[0-2]?[0-9]', '3[0-1]') })?`, '[0-2]?[0-9]', '3[0-1]', dayOfMonthSuffix(or('L', '[0-2]?[0-9]', '3[0-1]')));

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC'
];
const MONTH = or('[0]?[1-9]', '1[0-2]', ...MONTHS);

const WEEK_DAYS = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN'
];
const DAY_OF_WEEK = or('[0-7]', ...WEEK_DAYS);

const SECOND_REGEX = or(ASTERISK, interval(ASTERISK), commaSeparated(or(interval(SECOND), optionalRange(SECOND))));
const MINUTE_REGEX = or(ASTERISK, interval(ASTERISK), commaSeparated(or(interval(MINUTE), optionalRange(MINUTE))));
const HOUR_REGEX = or(ASTERISK, interval(ASTERISK), commaSeparated(or(interval(HOUR), optionalRange(HOUR))));
const DAY_OF_MONTH_REGEX = or(ASTERISK, QUESTION_MARK, commaSeparated(optionalRange(DAY_OF_MONTH)));
const MONTH_REGEX = or(ASTERISK, commaSeparated(optionalRange(MONTH)));
const DAY_OF_WEEK_REGEX = or(ASTERISK, QUESTION_MARK, commaSeparated(or(optionalRange(DAY_OF_WEEK), dayOfWeekSuffix(DAY_OF_WEEK))));

const CRON_REGEX = new RegExp(`^${ SECOND_REGEX } ${ MINUTE_REGEX } ${ HOUR_REGEX } ${ DAY_OF_MONTH_REGEX } ${ MONTH_REGEX } ${ DAY_OF_WEEK_REGEX }$`, 'i');

function validateCron(value) {
  return CRON_REGEX.test(value);
}

module.exports.validateCronExpression = function(value) {
  return validateMacro(value) || validateCron(value);
};



// helper //////////////

function or(...patterns) {
  return `(${patterns.join('|')})`;
}

function optionalRange(pattern) {
  return `${pattern}(-${pattern})?`;
}

function commaSeparated(pattern) {
  return `${pattern}(${COMMA}${pattern})*`;
}

function interval(pattern) {
  return `${pattern}/\\d+`;
}

function dayOfMonthSuffix(pattern) {
  return `${pattern}W`;
}

function dayOfWeekSuffix(pattern) {
  return `${pattern}(#[1-5]|L)`;
}
