const YEAR = '\\d{4}';
const MONTH = '(?<month>0[1-9]|1[0-2])';
const DAY = '(0[1-9]|[12][0-9]|3[01])';
const DATE = `(?<date>${YEAR}-${MONTH}-${DAY})`;
const HOUR = '(0[0-9]|1[0-9]|2[0-3])';
const MINUTE = '[0-5][0-9]';
const SECOND = '[0-5][0-9]';
const ZONE_ID = '(\\[[^\\]]+\\])';
const TIMEZONE = `(Z|([+-](0[0-9]|1[0-3]):[0-5][0-9]${ZONE_ID}?))`;

const ISO_DATE = `${DATE}T${HOUR}:${MINUTE}:${SECOND}${TIMEZONE}`;
const ISO_DATE_REGEX = new RegExp(`^${ISO_DATE}$`);
const ISO_DURATION = 'P(?!$)(\\d+(\\.\\d+)?[Yy])?(\\d+(\\.\\d+)?[Mm])?(\\d+(\\.\\d+)?[Ww])?(\\d+(\\.\\d+)?[Dd])?(T(?!$)(\\d+(\\.\\d+)?[Hh])?(\\d+(\\.\\d+)?[Mm])?(\\d+(\\.\\d+)?[Ss])?)?$';
const ISO_DURATION_REGEX = new RegExp(`^${ISO_DURATION}$`);
const ISO_CYCLE = `R(-1|\\d+)?/(${ISO_DATE}/)?${ISO_DURATION}`;
const ISO_CYCLE_REGEX = new RegExp(`^${ISO_CYCLE}$`);

module.exports = {
  validateCycle,
  validateDate,
  validateDuration
};

function validateCycle(value) {
  return ISO_CYCLE_REGEX.test(value);
}

function validateDate(value) {
  const result = ISO_DATE_REGEX.exec(value);

  if (!result) {
    return false;
  }

  return isDateValid(result);
}

function validateDuration(value) {
  return ISO_DURATION_REGEX.test(value);
}

function isDateValid(result) {
  const {
    date,
    month
  } = result.groups;

  const dateParsedMonth = new Date(date).getMonth() + 1;
  const parsedMonth = Number.parseInt(month, 10);

  return dateParsedMonth === parsedMonth;
}
