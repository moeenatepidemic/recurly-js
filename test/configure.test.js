import each from 'lodash.foreach';
import after from 'lodash.after';
import clone from 'component-clone';
import assert from 'assert';
import {fixture} from './support/fixtures';
import {Recurly} from '../lib/recurly';

describe('Recurly.configure', function () {
  let recurly;

  beforeEach(function () {
    if (this.currentTest.ctx.fixture) fixture(this.currentTest.ctx.fixture);
    recurly = new Recurly;
  });

  describe('when options.publicKey is not given', function () {
    var examples = [
      {},
      { invalid: 'parameter' },
      { currency: 'USD' },
      { currency: 'AUD', api: 'https://localhost' },
      { currency: 'USD', api: 'https://localhost', required: ['postal_code'] }
    ];

    it('throws', function () {
      examples.forEach((opts) => {
        assert.throws(recurly.configure.bind(recurly, opts));
      });
    });

    it('Recurly.configured remains false', function () {
      examples.forEach((opts) => {
        try {
          recurly.configure(opts);
        } catch (e) {
          assert(recurly.configured === false);
        }
      });
    });
  });

  describe('when options.publicKey is given', function () {
    var examples = [
      { publicKey: 'foo' },
      { publicKey: 'foo', currency: 'USD' },
      { publicKey: 'foo', currency: 'AUD', api: 'https://localhost' },
      { publicKey: 'foo', currency: 'AUD', api: 'https://localhost', cors: true },
      { publicKey: 'foo', currency: 'USD', api: 'https://localhost', required: ['country'] },
      { publicKey: 'foo', currency: 'USD', api: 'https://localhost', required: ['postal_code', 'country'] }
    ];

    it('sets Recurly.config to the options given', function () {
      examples.forEach((opts) => {
        var recurly = new Recurly;
        recurly.configure(opts);
        each(opts, (val, opt) => {
          if (opts[opt]) assert.equal(JSON.stringify(recurly.config[opt]), JSON.stringify(val));
        });
      });
    });

    it('sets default values for options not given', function () {
      examples.forEach(function (opts) {
        var recurly = new Recurly();
        recurly.configure(opts);
        each(recurly.config, (val, opt) => {
          if (opts[opt]) {
            assert.equal(JSON.stringify(opts[opt]), JSON.stringify(val));
          } else {
            assert(val !== undefined);
            assert(val !== opts[opt]);
          }
        });
      });
    });

    describe('when options.api is given', function () {
      it('sets Recurly.config.api to the given api', function () {
        recurly.configure({ publicKey: 'foo', api: 'http://localhost' });
        assert(recurly.config.api === 'http://localhost');
      });
    });

    describe('when options.cors is given', function () {
      it('sets Recurly.config.cors to the given value', function () {
        recurly.configure({ publicKey: 'foo', cors: true });
        assert(recurly.config.cors === true);
      });
    });

    describe('as a string parameter', function () {
      it('sets the publicKey', function () {
        recurly.configure('bar');
        assert(recurly.config.publicKey === 'bar');
      });
    });
  });

  describe('when options.style is given (deprecated)', function () {
    const example = {
      publicKey: 'foo',
      style: {
        all: {
          fontFamily: '"Droid Sans", Helvetica, sans-serif',
          fontSize: '20px',
          fontColor: 'green',
          fontWeight: 'bold',
          fontVariant: 'small-caps',
          lineHeight: '1em',
          padding: '5px 8px',
          placeholder: { fontStyle: 'italic' }
        },
        number: {
          color: 'green',
          fontWeight: 'normal',
          placeholder: {
            content: 'Credit Card Number'
          }
        },
        month: {
          placeholder: {
            content: 'Month (mm)'
          }
        },
        year: {
          color: 'persimmon',
          placeholder: {
            content: 'Year (yy)'
          }
        },
        cvv: {
          placeholder: {
            content: 'Security Code',
            color: 'orange !important'
          }
        }
      }
    };

    it('is absent on final configuration', function () {
      assert.equal(recurly.config.style, undefined);
    });

    describe('when options.fields is not given', function () {
      it('coerces the given styles into options.fields', function () {
        recurly.configure(example);
        assert.deepStrictEqual(recurly.config.fields.number.style, example.style.number);
        assert.deepStrictEqual(recurly.config.fields.month.style, example.style.month);
        assert.deepStrictEqual(recurly.config.fields.year.style, example.style.year);
        assert.deepStrictEqual(recurly.config.fields.cvv.style, example.style.cvv);
        assert.deepStrictEqual(recurly.config.fields.all.style, example.style.all);
      });

      describe('when only options.style.all is set', function () {
        it('sets options.fields.all.style', function () {
          let ex = clone(example);
          ex.style = { all: example.style.all };
          recurly.configure(ex);
          assert.deepStrictEqual(recurly.config.fields.all.style, example.style.all);
        });
      });
    });

    describe('when options.fields is given', function () {
      describe('with string values', function () {
        it('coerces the given styles and selectors into options.fields', function () {
          let opts = clone(example);
          opts.fields = {
            number: '#custom-number-selector',
            cvv: '#custom-cvv-selector'
          };
          recurly.configure(opts);
          assert.deepStrictEqual(recurly.config.fields.number.style, example.style.number);
          assert.equal(recurly.config.fields.number.selector, '#custom-number-selector');
          assert.equal(recurly.config.fields.cvv.selector, '#custom-cvv-selector');
        });
      });

      describe('with object values', function () {
        let objectExample = clone(example);
        objectExample.fields = {
          number: {
            selector: '#custom-number-selector',
            style: {
              color: 'orangutan',
              placeholder: { content: 'test placeholder content', color: 'plum' }
            },
          }
        };

        it('merges with the object values', function () {
          recurly.configure(objectExample);
          assert.equal(recurly.config.fields.number.style.fontWeight, 'normal');
          assert.equal(recurly.config.fields.month.style.placeholder.content, 'Month (mm)');
          assert.equal(recurly.config.fields.year.style.placeholder.content, 'Year (yy)');
          assert.equal(recurly.config.fields.year.style.color, 'persimmon');
          assert.equal(recurly.config.fields.cvv.style.placeholder.content, 'Security Code');
          assert.equal(recurly.config.fields.cvv.style.placeholder.color, 'orange !important');
        });

        it('does not override the object values', function () {
          recurly.configure(objectExample);
          assert.equal(recurly.config.fields.number.selector, '#custom-number-selector');
          assert.equal(recurly.config.fields.number.style.color, 'orangutan');
          assert.equal(recurly.config.fields.number.style.fontWeight, 'normal');
          assert.equal(recurly.config.fields.number.style.placeholder.content, 'test placeholder content');
          assert.equal(recurly.config.fields.number.style.placeholder.color, 'plum');
        });
      });
    });
  });

  describe('when falsey options are given', function () {
    var examples = [0, '', null, false, undefined];

    it('sets default values instead', function () {
      examples.forEach(function (falsey) {
        var recurly = new Recurly();

        recurly.configure({
          publicKey: 'foo',
          currency: falsey,
          api: falsey,
          timeout: falsey,
          cors: falsey
        });

        assert(recurly.config.currency === 'USD');
        assert(recurly.config.timeout === 60000);
        assert(recurly.config.api === 'https://api.recurly.com/js/v1');
      });
    });
  });

  describe('when reconfiguring', function () {
    this.ctx.fixture = 'multipleForms';

    it('resets and reinstantiates', function (done) {
      let party = after(4, done);;
      let part = function (log) {
        party();
        console.log(log)
      }

      recurly.configure({
        publicKey: 'foo',
        fields: {
          number: '#number-1',
          month: '#month-1',
          year: '#year-1',
          cvv: '#cvv-1'
        }
      });
      assert(recurly.configured === true);
      recurly.ready(() => {
        assert(document.querySelector('#number-1 iframe') instanceof HTMLElement);
        part('1');
      });
      recurly.ready(() => {
        assert(document.querySelector('#number-2 iframe') === null);
        part('2');
      });

      recurly.configure({
        publicKey: 'bar',
        fields: {
          number: '#number-2',
          month: '#month-2',
          year: '#year-2',
          cvv: '#cvv-2'
        }
      });
      assert(recurly.configured === true);
      console.log(`my readyState: ${recurly.readyState}`);
      recurly.ready(() => {
        assert(document.querySelector('#number-1 iframe') === null);
        part('3');
      });
      recurly.ready(() => {
        assert(document.querySelector('#number-2 iframe') instanceof HTMLElement);
        part('4');
      });
    });
  });
});
