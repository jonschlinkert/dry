'use strict';

const { isNumber, isValidDate, strftime } = require('../utils');

exports.date = (value, arg) => {
  let date = value;
  if (value === 'now' || value === 'today') {
    date = new Date();
  } else if (isNumber(value)) {
    date = new Date(value * 1000);
  } else if (typeof value === 'string') {
    date = /^[0-9]+$/.test(value) ? new Date(Number(value) * 1000) : new Date(value);
  }
  return isValidDate(date) ? strftime(date, arg) : value;
};
