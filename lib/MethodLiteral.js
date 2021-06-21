
// const kMethod = Symbol(':method');
// const kValue = Symbol(':value');

// class MethodLiteral {
//   constructor(name, value) {
//     this[kMethod] = name;
//     this[kValue] = value;
//   }

//   to_liquid() {
//     return this[kValue];
//   }

//   to_s() {
//     return this[kValue];
//   }

//   toString() {
//     return this.to_s();
//   }

//   get method_name() {
//     return this[kMethod];
//   }
// }

// const LITERALS = Object.freeze({
//   '': null,
//   'nil': null,
//   'null': null,
//   'true': true,
//   'false': false,
//   'blank': new MethodLiteral('blank', ''),
//   'empty': new MethodLiteral('empty', '')
// });
