// A streaming byte oriented JSON parser.  Feed it a single byte at a time and
// it will emit complete objects as it comes across them.  Whitespace within and
// between objects is ignored.  This means it can parse newline delimited JSON.
function jsonMachine(emit, next) {
  next = next || $value;
  return $value;

  function $value(byte) {
    if (!byte) return;
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x20) {
      return $value; // Ignore whitespace
    }
    if (byte === 0x22) { // "
      return stringMachine(onValue);
    }
    if (byte === 0x2d || (byte >= 0x30 && byte < 0x40)) { // - or 0-9
      return numberMachine(byte, onNumber);
    }
    if (byte === 0x7b) { // {
      return objectMachine(onValue);
    }
    if (byte === 0x5b) { // [
      return arrayMachine(onValue);
    }
    if (byte === 0x74) { // t
      return constantMachine(TRUE, true, onValue);
    }
    if (byte === 0x66) { // f
      return constantMachine(FALSE, false, onValue);
    }
    if (byte === 0x6e) { // n
      return constantMachine(NULL, null, onValue);
    }
    if (next === $value) {
      throw new Error("Unexpected 0x" + byte.toString(16));
    }
    return next(byte);
  }

  function onValue(value) {
    emit(value);
    return next;
  }

  function onNumber(number, byte) {
    emit(number);
    return $value(byte);
  }

}

var TRUE = [0x72, 0x75, 0x65];
var FALSE = [0x61, 0x6c, 0x73, 0x65];
var NULL = [0x75, 0x6c, 0x6c];

function constantMachine(bytes, value, emit) {
  var i = 0, l = bytes.length;
  return $constant;

  function $constant(byte) {
    if (byte !== bytes[i++]) {
      throw new Error("Unexpected 0x" + byte.toString(16));
    }
    if (i < l) return $constant;
    return emit(value);
  }
}

function stringMachine(emit) {
  var string = "";
  return $string;

  function $string(byte) {
    if (byte === 0x22) { // "
      return emit(string);
    }
    if (byte === 0x5c) { // \
      return $escapedString;
    }
    if (byte & 0x80) { // UTF-8 handling
      return utf8Machine(byte, onCharCode);
    }
    if (byte < 0x20) { // ASCII control character
      throw new Error("Unexpected control character: 0x" + byte.toString(16));
    }
    string += String.fromCharCode(byte);
    return $string;
  }

  function $escapedString(byte) {
    if (byte === 0x22 || byte === 0x5c || byte === 0x2f) { // " \ /
      string += String.fromCharCode(byte);
      return $string;
    }
    if (byte === 0x62) { // b
      string += "\b";
      return $string;
    }
    if (byte === 0x66) { // f
      string += "\f";
      return $string;
    }
    if (byte === 0x6e) { // n
      string += "\n";
      return $string;
    }
    if (byte === 0x72) { // r
      string += "\r";
      return $string;
    }
    if (byte === 0x74) { // t
      string += "\t";
      return $string;
    }
    if (byte === 0x75) { // u
      return hexMachine(onCharCode);
    }
  }

  function onCharCode(charCode) {
    string += String.fromCharCode(charCode);
    return $string;
  }

}

// Nestable state machine for UTF-8 Decoding.
function utf8Machine(byte, emit) {

  var left = 0, num = 0;

  if (byte >= 0xc0 && byte < 0xe0) { // 2-byte UTF-8 Character
    left = 1;
    num = (byte & 0x1f) << 6;
    return $utf8;
  }
  if (byte >= 0xe0 && byte < 0xf0) { // 3-byte UTF-8 Character
    left = 2;
    num = (byte & 0xf) << 12;
    return $utf8;
  }
  if (byte >= 0xf0 && byte < 0xf8) { // 4-byte UTF-8 Character
    left = 3;
    num = (byte & 0x07) << 18;
    return $utf8;
  }
  throw new Error("Invalid byte in UTF-8 string: 0x" + byte.toString(16));

  function $utf8(byte) {
    if ((byte & 0xc0) !== 0x80) {
      throw new Error("Invalid byte in UTF-8 character: 0x" + byte.toString(16));
    }
    num |= (byte & 0x3f) << (--left * 6);
    if (left) return $utf8;
    return emit(num);
  }

}

// Nestable state machine for hex escaped characters
function hexMachine(emit) {
  var left = 4, num = 0;

  return $hex;

  function $hex(byte) {
    var i = 0; // Parse the hex byte
    if (byte >= 0x30 && byte < 0x40) i = byte - 0x30;
    else if (byte >= 0x61 && byte <= 0x66) i = byte - 0x57;
    else if (byte >= 0x41 && byte <= 0x46) i = byte - 0x37;
    else throw new Error("Expected hex char in string hex escape");

    num |= i << (--left * 4);
    if (left) return $hex;
    return emit(num);
  }

}

function numberMachine(byte, emit) {

  var sign = 1;
  var number = 0;
  var decimal = 0;
  var esign = 1;
  var exponent = 0;

  if (byte === 0x2d) { // -
    sign = -1;
    return $start;
  }
  return $start(byte);

  function $start(byte) {
    if (byte === 0x30) {
      return $mid;
    }
    if (byte > 0x30 && byte < 0x40) {
      return $number(byte);
    }
    throw new Error("Invalid number: 0x" + byte.toString(16));
  }

  function $mid(byte) {
    if (byte === 0x2e) { // .
      return $decimal;
    }
    return $later(byte);
  }

  function $number(byte) {
    if (byte >= 0x30 && byte < 0x40) {
      number = number * 10 + (byte - 0x30);
      return $number;
    }
    return $mid(byte);
  }

  function $decimal(byte) {
    if (byte >= 0x30 && byte < 0x40) {
      decimal = (decimal + byte - 0x30) / 10;
      return $decimal;
    }
    return $later(byte);
  }

  function $later(byte) {
    if (byte === 0x45 || byte === 0x65) { // E e
      return $esign;
    }
    return $done(byte);
  }

  function $esign(byte) {
    if (byte === 0x2b) { // +
      return $exponent;
    }
    if (byte === 0x2d) { // -
      esign = -1;
      return $exponent;
    }
    return $exponent(byte);
  }

  function $exponent(byte) {
    if (byte >= 0x30 && byte < 0x40) {
      exponent = exponent * 10 + (byte - 0x30);
      return $exponent;
    }
    return $done(byte);
  }

  function $done(byte) {
    var value = sign * (number + decimal);
    if (exponent) {
      value *= Math.pow(10, esign * exponent);
    }
    return emit(value, byte);
  }

}

function arrayMachine(emit) {
  var array = [];

  return $array;

  function $array(byte) {
    if (byte === 0x5d) { // ]
      return emit(array);
    }
    return jsonMachine(onValue, $comma)(byte);
  }

  function onValue(value) {
    array.push(value);
  }

  function $comma(byte) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x20) {
      return $comma; // Ignore whitespace
    }
    if (byte === 0x2c) { // ,
      return jsonMachine(onValue, $comma);
    }
    if (byte === 0x5d) { // ]
      return emit(array);
    }
    throw new Error("Unexpected byte: 0x" + byte.toString(16) + " in array body");
  }
}

function objectMachine(emit) {
  var object = {};
  var key;

  return $object;

  function $object(byte) {
    if (byte === 0x7d) { // }
      return emit(object);
    }
    return $key(byte);
  }

  function $key(byte) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x20) {
      return $object; // Ignore whitespace
    }
    if (byte === 0x22) {
      return stringMachine(onKey);
    }
    throw new Error("Unexpected byte: 0x" + byte.toString(16));
  }

  function onKey(result) {
    key = result;
    return $colon;
  }

  function $colon(byte) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x20) {
      return $colon; // Ignore whitespace
    }
    if (byte === 0x3a) { // :
      return jsonMachine(onValue, $comma);
    }
    throw new Error("Unexpected byte: 0x" + byte.toString(16));
  }

  function onValue(value) {
    object[key] = value;
  }

  function $comma(byte) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x20) {
      return $comma; // Ignore whitespace
    }
    if (byte === 0x2c) { // ,
      return $key;
    }
    if (byte === 0x7d) { // }
      return emit(object);
    }
    throw new Error("Unexpected byte: 0x" + byte.toString(16));
  }
}

module.exports = parseStream;

function parseStream(emit) {
  var state = jsonMachine(emit);
  return function (chunk) {
    if (chunk === undefined) {
      state();
      return emit();
    }
    for (var i = 0, l = chunk.length; i < l; i++) {
      state = state(chunk[i]);
    }
  };
}
