const { expect } = require('chai');

const {
  validateCronExpression
} = require('../../rules/utils/cron');


describe('utils/cron', function() {

  describe('#validateCronExpression', function() {

    // given
    const VALID = [
      '0 0 * * * *',
      '*/10 * * * * *',
      '0 0 8-10 * * *',
      '0 0 6,19 * * *',
      '0 0/30 8-10 * * *',
      '*/80 * * * * *',
      '0 0 9-17 * * MON-FRI',
      '0 0 0 25 12 ?',
      '0 0 0 L * *',
      '0 0 0 L-3 * *',
      '0 0 0 1W * *',
      '0 0 0 LW * *',
      '0 0 0 * * 5L',
      '0 0 0 * * THUL',
      '0 0 0 * * tHuL',
      '0 0 0 ? * 5#2',
      '0 0 0 ? * MON#1',
      '0 0 0 ? * mon#1',
      '0 0 0 ? JAN mon#1'
    ];
    for (const valid of VALID) {
      it(`should return 'true' for valid cron expression: ${valid}`, function() {

        // then
        expect(validateCronExpression(valid)).to.be.true;
      });
    }

    // given
    const INVALID = [
      'INVALID',
      '70 0 * * * *',
      '0 60 0 * * *',
      '0 0 0 * * THUG',
      '0 0 0 ? * SON',
      '0 0 0 LD * *',
      '0 0 0 ? * MON#6',
      '? ? ? ? ? ?',
      '* * * * * * * *',
      '0 0 0 * JOHN MON#2'
    ];
    for (const invalid of INVALID) {
      it(`should return 'false' for invalid cron expression: ${invalid}`, function() {

        // then
        expect(validateCronExpression(invalid)).to.be.false;
      });
    }

    // given
    const VALID_MACRO = [
      '@yearly',
      '@annually',
      '@monthly',
      '@weekly',
      '@daily',
      '@midnight',
      '@hourly'
    ];
    for (const valid of VALID_MACRO) {
      it(`should return 'true' for valid macro: ${valid}`, function() {

        // then
        expect(validateCronExpression(valid)).to.be.true;
      });
    }


    // given
    const INVALID_MACRO = [
      '@yearlies',
      '@annuallys',
      '@monthlys',
      '@weeklys',
      '@dailys',
      '@midnights',
      '@hourlys',
      '@___@'
    ];
    for (const invalid of INVALID_MACRO) {
      it(`should return 'false' for invalid macro: ${invalid}`, function() {

        // then
        expect(validateCronExpression(invalid)).to.be.false;
      });
    }

  });
});