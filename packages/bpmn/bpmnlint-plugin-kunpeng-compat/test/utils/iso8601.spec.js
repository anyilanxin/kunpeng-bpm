const { expect } = require('chai');

const {
  validateCycle,
  validateDate,
  validateDuration
} = require('../../rules/utils/iso8601');


describe('utils/iso8601', function() {

  describe('#validateDate', function() {

    // given
    const VALID = [
      '2019-01-01T00:00:00Z',
      '2019-01-01T00:00:00+01:00',
      '2019-01-01T00:00:00-01:00',
      '2019-01-01T00:00:00Z',
      '2019-01-01T00:00:00+01:00',
      '2019-01-01T00:00:00-01:00',
      '2019-01-01T00:00:00+01:00[Europe/Berlin]',
      '2019-01-01T00:00:00+00:00[UTC]',
      '2019-01-01T00:00:00+00:00[Zulu]',
      '2019-01-01T00:00:00+00:00[WET]',
      '1970-01-01T00:00:00Z'
    ];
    for (const valid of VALID) {
      it(`should return 'true' for valid ISO 8601 date: ${valid}`, function() {

        // then
        expect(validateDate(valid)).to.be.true;
      });
    }

    // given
    const INVALID = [
      'INVALID',
      '2019-01-01T00:00:00Z[Europe/Berlin]',
      '2019-01-01T00:00:00[Europe/Berlin]',
      '2019-13-01T00:00:00Z',
      '2019-01-01T23:70:00Z',
      '2019-01-01T23:00:70Z',

      // invalid date
      '2019-04-31T00:00:00Z',
      '2019-02-29T00:00:00Z',
      '2022-02-29T00:00:00Z',
      '2020-02-31T00:00:00Z',

      // local time is not supported
      '2019-01-01T00:00:00',

      // Zeebe does not accept ms
      '2019-01-01T00:00:00.000',
      '2019-01-01T00:00:00.000Z',
      '2019-01-01T00:00:00.000+01:00',
      '2019-01-01T00:00:00.000-01:00',

      // unsupported in Zeebe
      '2019-01-01T00:00:00+01:00@Europe/Berlin',
    ];
    for (const invalid of INVALID) {
      it(`should return 'false' for invalid ISO 8601 date: ${invalid}`, function() {

        // then
        expect(validateDate(invalid)).to.be.false;
      });
    }
  });


  describe('#validateCycle', function() {

    // given
    const VALID = [
      'R5/P1Y2M10DT2H30M',
      'R/P1Y2M10DT2H30M',
      'R-1/P1Y2M10DT2H30M',
      'R0/P1Y2M10DT2H30M',
      'R3/P1W',
      'R3/2024-01-01T12:00:00Z/P1D',
      'R5/2024-01-01T12:00:00Z/P1Y2M10DT2H30M',
      'R/2024-01-01T12:00:00+02:00[Europe/Berlin]/P1D'
    ];
    for (const valid of VALID) {
      it(`should return 'true' for valid ISO 8601 cycle: ${valid}`, function() {

        // then
        expect(validateCycle(valid)).to.be.true;
      });
    }

    // given
    const INVALID = [
      'INVALID',
      'R3/PT1W',

      // unsupported in Zeebe
      'R-2/P1Y2M10DT2H30M'
    ];
    for (const invalid of INVALID) {
      it(`should return 'false' for invalid ISO 8601 cycle: ${invalid}`, function() {

        // then
        expect(validateCycle(invalid)).to.be.false;
      });
    }
  });


  describe('#validateDuration', function() {

    // given
    const VALID = [
      'P1Y',
      'P1Y2M',
      'P1Y2M10D',
      'P1Y2M10DT2H',
      'P1Y2M10DT2H30M',
      'P1Y2M10DT2H30M2S',
      'P1Y2M10DT2S',
      'PT2H30M',
      'PT1S',
      'PT1s',
      'P1W',
      'P1WT2H30M'
    ];
    for (const valid of VALID) {
      it(`should return 'true' for valid ISO 8601 duration: ${valid}`, function() {

        // then
        expect(validateDuration(valid)).to.be.true;
      });
    }

    // given
    const INVALID = [
      'INVALID',
      'P1S',
      'P1Y2F',
      '1S',
      'T2M',
      'P',
      'PT',
      'P2DT',
      'P1W1Y',

      // unsupported in Zeebe
      '2007-03-01T13:00:00Z/2008-05-11T15:30:00Z',
      '2007-03-01T13:00:00Z/P1Y2M10DT2H30M',
      'P1Y2M10DT2H30M/2008-05-11T15:30:00Z'
    ];
    for (const invalid of INVALID) {
      it(`should return 'false' for invalid ISO 8601 duration: ${invalid}`, function() {

        // then
        expect(validateDuration(invalid)).to.be.false;
      });
    }
  });
});