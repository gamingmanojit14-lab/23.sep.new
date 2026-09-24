/* ============================================================
   TextilePOS — Common Utilities
   Includes:
   - Embedded QR Code Generator
   - Barcode Generator
   - Camera QR Scanner
   - Remote Scanner Session
   - Remote Payment Device Session
   - Customer Help ID System
   - ⭐ P2P Wallet API Integration (NEW)
   - WhatsApp helpers
   - Hold/Park Sale
   - Discount Presets
   - Split Payment Parser
   - Commission Calculator
   - CSV Parser
   - Activity Log
   - Label Sheet Print
   - Dark Mode
   - Multi-Language (EN/HI)
   - AI Sales Forecast
   - GST Calculator
   - PWA Install
   All user-facing text in English.
   
   ⚠️ REMOVED: Local loyalty points system (100=1 point)
   ⚠️ REMOVED: pointsRequests collection & helpers
   ✅ ADDED: P2P Wallet external API integration
   ============================================================ */

if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === 'PASTE_YOUR_API_KEY_HERE') {
  document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;max-width:600px;margin:auto;line-height:1.8">
    <h1 style="color:#dc2626">⚠️ Firebase Config Missing</h1>
    <p>Open <b>firebase-config.js</b> and paste your Firebase credentials.</p>
  </div>`;
  throw new Error('Firebase config missing');
}

if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const FV = firebase.firestore.FieldValue;

/* ═══════════════════════════════════════════════════════════
   EMBEDDED QR CODE GENERATOR
   Based on qrcode-generator by Kazuhiko Arase (MIT License)
   ═══════════════════════════════════════════════════════════ */
(function(global){
  var QRMath = (function(){
    var EXP = [], LOG = [];
    for (var i = 0; i < 8; i++) EXP[i] = 1 << i;
    for (var i = 8; i < 256; i++) EXP[i] = EXP[i-4] ^ EXP[i-5] ^ EXP[i-6] ^ EXP[i-8];
    for (var i = 0; i < 255; i++) LOG[EXP[i]] = i;
    return {
      glog: function(n){ if (n < 1) throw 'glog(' + n + ')'; return LOG[n]; },
      gexp: function(n){ while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP[n]; }
    };
  })();

  var QrPolynomial = function(num, shift){
    var _num = (function(){
      var offset = 0;
      while (offset < num.length && num[offset] == 0) offset++;
      var arr = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i++) arr[i] = num[i + offset];
      return arr;
    })();
    return {
      getAt: function(i){ return _num[i]; },
      getLength: function(){ return _num.length; },
      multiply: function(e){
        var num = new Array(this.getLength() + e.getLength() - 1);
        for (var i = 0; i < this.getLength(); i++)
          for (var j = 0; j < e.getLength(); j++)
            num[i+j] ^= QRMath.gexp(QRMath.glog(this.getAt(i)) + QRMath.glog(e.getAt(j)));
        return QrPolynomial(num, 0);
      },
      mod: function(e){
        if (this.getLength() - e.getLength() < 0) return this;
        var ratio = QRMath.glog(this.getAt(0)) - QRMath.glog(e.getAt(0));
        var num = new Array(this.getLength());
        for (var i = 0; i < this.getLength(); i++) num[i] = this.getAt(i);
        for (var i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
        return QrPolynomial(num, 0).mod(e);
      }
    };
  };

  var RS_BLOCK_TABLE = [
    [1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],
    [1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],
    [1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],
    [2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],
    [2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],
    [2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],
    [2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],
    [4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],
    [2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],
    [4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],
    [3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],
    [5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],
    [5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],
    [1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],
    [5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],
    [3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],
    [3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],
    [4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],
    [2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],
    [4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],
    [6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],
    [8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],
    [10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],
    [8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],
    [3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],
    [7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],
    [5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],
    [13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],
    [17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],
    [17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],
    [13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],
    [12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],
    [6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],
    [17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],
    [4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],
    [20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],
    [19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]
  ];

  var QRRSBlock = {
    getRSBlocks: function(typeNumber, ecl){
      var idx;
      if (ecl == 1) idx = 0; else if (ecl == 0) idx = 1; else if (ecl == 3) idx = 2; else idx = 3;
      var rsBlock = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + idx];
      if (!rsBlock) throw 'bad rs block';
      var length = rsBlock.length / 3;
      var list = [];
      for (var i = 0; i < length; i++) {
        var count = rsBlock[i*3], totalCount = rsBlock[i*3+1], dataCount = rsBlock[i*3+2];
        for (var j = 0; j < count; j++) list.push({ totalCount: totalCount, dataCount: dataCount });
      }
      return list;
    }
  };

  var PATTERN_POSITION_TABLE = [
    [],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],
    [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],
    [6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],
    [6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],
    [6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],
    [6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],
    [6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]
  ];

  var G15 = (1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0);
  var G18 = (1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0);
  var G15_MASK = (1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1);

  function getBCHDigit(data){ var d = 0; while (data != 0) { d++; data >>>= 1; } return d; }
  function getBCHTypeInfo(data){ var d = data << 10; while (getBCHDigit(d) - getBCHDigit(G15) >= 0) d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15))); return ((data << 10) | d) ^ G15_MASK; }
  function getBCHTypeNumber(data){ var d = data << 12; while (getBCHDigit(d) - getBCHDigit(G18) >= 0) d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18))); return (data << 12) | d; }

  function getMaskFunction(maskPattern){
    switch (maskPattern) {
      case 0: return function(i,j){ return (i+j)%2==0; };
      case 1: return function(i,j){ return i%2==0; };
      case 2: return function(i,j){ return j%3==0; };
      case 3: return function(i,j){ return (i+j)%3==0; };
      case 4: return function(i,j){ return (Math.floor(i/2)+Math.floor(j/3))%2==0; };
      case 5: return function(i,j){ return (i*j)%2+(i*j)%3==0; };
      case 6: return function(i,j){ return ((i*j)%2+(i*j)%3)%2==0; };
      case 7: return function(i,j){ return ((i*j)%3+(i+j)%2)%2==0; };
      default: return null;
    }
  }

  function getErrorCorrectPolynomial(len){
    var a = QrPolynomial([1], 0);
    for (var i = 0; i < len; i++) a = a.multiply(QrPolynomial([1, QRMath.gexp(i)], 0));
    return a;
  }

  function getLengthInBits(mode, type){
    if (1 <= type && type < 10) {
      switch (mode) { case 1: return 10; case 2: return 9; case 4: return 8; case 8: return 8; }
    } else if (type < 27) {
      switch (mode) { case 1: return 12; case 2: return 11; case 4: return 16; case 8: return 10; }
    } else if (type < 41) {
      switch (mode) { case 1: return 14; case 2: return 13; case 4: return 16; case 8: return 12; }
    }
    return 0;
  }

  function getLostPoint(qr){
    var moduleCount = qr.getModuleCount(), lostPoint = 0;
    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount; col++) {
        var sameCount = 0, dark = qr.isDark(row, col);
        for (var r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (var c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r == 0 && c == 0) continue;
            if (dark == qr.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += (3 + sameCount - 5);
      }
    }
    for (var row = 0; row < moduleCount - 1; row++) {
      for (var col = 0; col < moduleCount - 1; col++) {
        var count = 0;
        if (qr.isDark(row, col)) count++;
        if (qr.isDark(row+1, col)) count++;
        if (qr.isDark(row, col+1)) count++;
        if (qr.isDark(row+1, col+1)) count++;
        if (count == 0 || count == 4) lostPoint += 3;
      }
    }
    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount - 6; col++) {
        if (qr.isDark(row,col) && !qr.isDark(row,col+1) && qr.isDark(row,col+2) && qr.isDark(row,col+3) && qr.isDark(row,col+4) && !qr.isDark(row,col+5) && qr.isDark(row,col+6)) lostPoint += 40;
      }
    }
    for (var col = 0; col < moduleCount; col++) {
      for (var row = 0; row < moduleCount - 6; row++) {
        if (qr.isDark(row,col) && !qr.isDark(row+1,col) && qr.isDark(row+2,col) && qr.isDark(row+3,col) && qr.isDark(row+4,col) && !qr.isDark(row+5,col) && qr.isDark(row+6,col)) lostPoint += 40;
      }
    }
    var darkCount = 0;
    for (var col = 0; col < moduleCount; col++)
      for (var row = 0; row < moduleCount; row++)
        if (qr.isDark(row, col)) darkCount++;
    lostPoint += Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5 * 10;
    return lostPoint;
  }

  function qrBitBuffer(){
    var _buffer = [], _length = 0;
    return {
      getBuffer: function(){ return _buffer; },
      getAt: function(i){ return _buffer[i]; },
      put: function(num, length){ for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) == 1); },
      getLengthInBits: function(){ return _length; },
      putBit: function(bit){
        var bufIndex = Math.floor(_length / 8);
        if (_buffer.length <= bufIndex) _buffer.push(0);
        if (bit) _buffer[bufIndex] |= (0x80 >>> (_length % 8));
        _length++;
      }
    };
  }

  function stringToBytes(s){
    var bytes = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) { bytes.push(0xc0 | (c >> 6)); bytes.push(0x80 | (c & 0x3f)); }
      else if (c < 0xd800 || c >= 0xe000) { bytes.push(0xe0 | (c >> 12)); bytes.push(0x80 | ((c >> 6) & 0x3f)); bytes.push(0x80 | (c & 0x3f)); }
      else {
        i++;
        var c2 = s.charCodeAt(i);
        var uc = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff));
        bytes.push(0xf0 | (uc >> 18)); bytes.push(0x80 | ((uc >> 12) & 0x3f));
        bytes.push(0x80 | ((uc >> 6) & 0x3f)); bytes.push(0x80 | (uc & 0x3f));
      }
    }
    return bytes;
  }

  function qr8BitByte(data){
    var _bytes = stringToBytes(data);
    return {
      getMode: function(){ return 4; },
      getLength: function(){ return _bytes.length; },
      write: function(buffer){ for (var i = 0; i < _bytes.length; i++) buffer.put(_bytes[i], 8); }
    };
  }

  var QRErrorCorrectionLevel = { L: 1, M: 0, Q: 3, H: 2 };

  global.qrcode = function(typeNumber, errorCorrectionLevel){
    var PAD0 = 0xEC, PAD1 = 0x11;
    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null, _moduleCount = 0, _dataCache = null, _dataList = [];
    var _this = {};

    var setupPositionProbePattern = function(row, col){
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || _moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || _moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
              (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
              (2 <= r && r <= 4 && 2 <= c && c <= 4)) _modules[row+r][col+c] = true;
          else _modules[row+r][col+c] = false;
        }
      }
    };

    var setupTimingPattern = function(){
      for (var r = 8; r < _moduleCount - 8; r++) { if (_modules[r][6] != null) continue; _modules[r][6] = (r % 2 == 0); }
      for (var c = 8; c < _moduleCount - 8; c++) { if (_modules[6][c] != null) continue; _modules[6][c] = (c % 2 == 0); }
    };

    var setupPositionAdjustPattern = function(){
      var pos = PATTERN_POSITION_TABLE[_typeNumber - 1];
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i], col = pos[j];
          if (_modules[row][col] != null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) _modules[row+r][col+c] = true;
              else _modules[row+r][col+c] = false;
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test){
      var bits = getBCHTypeNumber(_typeNumber);
      for (var i = 0; i < 18; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }
      for (var i = 0; i < 18; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern){
      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 6) _modules[i][8] = mod;
        else if (i < 8) _modules[i + 1][8] = mod;
        else _modules[_moduleCount - 15 + i][8] = mod;
      }
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 8) _modules[8][_moduleCount - i - 1] = mod;
        else if (i < 9) _modules[8][15 - i - 1 + 1] = mod;
        else _modules[8][15 - i - 1] = mod;
      }
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern){
      var inc = -1, row = _moduleCount - 1, bitIndex = 7, byteIndex = 0;
      var maskFunc = getMaskFunction(maskPattern);
      for (var col = _moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col -= 1;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (_modules[row][col - c] == null) {
              var dark = false;
              if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
              if (maskFunc && maskFunc(row, col - c)) dark = !dark;
              _modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex == -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || _moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks){
      var offset = 0, maxDcCount = 0, maxEcCount = 0;
      var dcdata = [], ecdata = [];
      for (var r = 0; r < rsBlocks.length; r++) {
        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;
        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);
        dcdata[r] = [];
        for (var i = 0; i < dcCount; i++) dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        offset += dcCount;
        var rsPoly = getErrorCorrectPolynomial(ecCount);
        var rawPoly = QrPolynomial(dcdata[r], rsPoly.getLength() - 1);
        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = [];
        for (var i = 0; i < rsPoly.getLength() - 1; i++) {
          var modIndex = i + modPoly.getLength() - (rsPoly.getLength() - 1);
          ecdata[r][i] = (modIndex >= 0) ? modPoly.getAt(modIndex) : 0;
        }
      }
      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
      var data = [], index = 0;
      for (var i = 0; i < maxDcCount; i++)
        for (var r = 0; r < rsBlocks.length; r++)
          if (i < dcdata[r].length) { data[index] = dcdata[r][i]; index++; }
      for (var i = 0; i < maxEcCount; i++)
        for (var r = 0; r < rsBlocks.length; r++)
          if (i < ecdata[r].length) { data[index] = ecdata[r][i]; index++; }
      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList){
      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
      var buffer = qrBitBuffer();
      for (var i = 0; i < dataList.length; i++) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), getLengthInBits(data.getMode(), typeNumber));
        data.write(buffer);
      }
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
      if (buffer.getLengthInBits() > totalDataCount * 8) throw 'code length overflow';
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
      while (true) {
        if (buffer.getLengthInBits() >= totalDataCount * 8) break;
        buffer.put(PAD0, 8);
        if (buffer.getLengthInBits() >= totalDataCount * 8) break;
        buffer.put(PAD1, 8);
      }
      return createBytes(buffer, rsBlocks);
    };

    var getBestMaskPattern = function(){
      var minLostPoint = 0, pattern = 0;
      for (var i = 0; i < 8; i++) {
        makeImpl(true, i);
        var lostPoint = getLostPoint(_this);
        if (i == 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
      }
      return pattern;
    };

    var makeImpl = function(test, maskPattern){
      _moduleCount = _typeNumber * 4 + 17;
      _modules = [];
      for (var row = 0; row < _moduleCount; row++) {
        _modules[row] = [];
        for (var col = 0; col < _moduleCount; col++) _modules[row][col] = null;
      }
      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);
      if (_typeNumber >= 7) setupTypeNumber(test);
      if (_dataCache == null) _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      mapData(_dataCache, maskPattern);
    };

    _this.addData = function(data){
      _dataList.push(qr8BitByte(String(data)));
      _dataCache = null;
    };
    _this.isDark = function(row, col){
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) throw row + ',' + col;
      return _modules[row][col];
    };
    _this.getModuleCount = function(){ return _moduleCount; };
    _this.make = function(){
      if (_typeNumber < 1) {
        var typeNumber = 1;
        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();
          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), getLengthInBits(data.getMode(), typeNumber));
            data.write(buffer);
          }
          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
          if (buffer.getLengthInBits() <= totalDataCount * 8) break;
        }
        _typeNumber = typeNumber;
      }
      makeImpl(false, getBestMaskPattern());
    };

    return _this;
  };
})(window);
/* END EMBEDDED QR GENERATOR */

/* ═══════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const BN = '০১২৩৪৫৬৭৮৯';
const bn = n => String(n ?? '').replace(/[0-9]/g, d => BN[+d]);

const money = n => {
  n = Number(n) || 0;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return '₹' + s;
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayKey = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

const fmtDate = iso => {
  if (!iso) return '';
  const d = iso.toDate ? iso.toDate() : new Date(iso);
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
};

const isToday = iso => {
  if (!iso) return false;
  const d = iso.toDate ? iso.toDate() : new Date(iso);
  return todayKey(d) === todayKey();
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const copyText = t => {
  if (navigator.clipboard) return navigator.clipboard.writeText(t);
  const el = document.createElement('textarea'); el.value = t; document.body.appendChild(el);
  el.select(); document.execCommand('copy'); el.remove();
  return Promise.resolve();
};

/* ── Barcode Generator ── */
function generateBarcode() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return yy + mm + dd + rand;
}

/* ═══════════════════════════════════════════════════════════
   QR DATA URL
   ═══════════════════════════════════════════════════════════ */
async function generateQRDataURL(text, size = 500) {
  if (typeof window.qrcode === 'undefined') throw new Error('QR library not loaded');
  const qr = window.qrcode(0, 'M');
  qr.addData(String(text));
  qr.make();
  const moduleCount = qr.getModuleCount();
  const cellSize = Math.max(3, Math.floor(size / (moduleCount + 4)));
  const margin = 2 * cellSize;
  const totalSize = moduleCount * cellSize + 2 * margin;
  const canvas = document.createElement('canvas');
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalSize, totalSize);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < moduleCount; r++)
    for (let c = 0; c < moduleCount; c++)
      if (qr.isDark(r, c))
        ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
  return canvas.toDataURL('image/png');
}

function downloadDataURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download.png';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 150);
}

async function showQRModal(text, title, filename) {
  const old = document.getElementById('_tpQRModal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = '_tpQRModal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:22px;max-width:420px;width:100%;padding:24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)">
      <h3 style="font-weight:800;font-size:18px;margin:0 0 4px">${esc(title)}</h3>
      <p style="color:#6b7280;font-size:12px;margin:0 0 16px">Scan or download</p>
      <div id="_qrLoading" style="padding:40px;color:#6b7280">Generating QR...</div>
      <div id="_qrWrap" style="display:none">
        <div style="background:#fff;padding:12px;border-radius:14px;display:inline-block;box-shadow:0 2px 14px rgba(0,0,0,.1);border:1px solid #e5e7eb">
          <img id="_qrImg" style="width:260px;height:260px;display:block">
        </div>
        <div style="margin-top:10px;font-size:11px;color:#9ca3af;font-family:monospace;word-break:break-all;line-height:1.5">${esc(text)}</div>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px">
        <button id="_qrDownload" style="flex:1;background:#2563eb;color:#fff;padding:13px;border:none;border-radius:12px;font-weight:700;font-family:inherit;font-size:14px;cursor:pointer">Download PNG</button>
        <button id="_qrClose" style="flex:1;background:#f3f4f6;color:#374151;padding:13px;border:none;border-radius:12px;font-weight:700;font-family:inherit;font-size:14px;cursor:pointer">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  try {
    const dataURL = await generateQRDataURL(text, 500);
    document.getElementById('_qrLoading').style.display = 'none';
    document.getElementById('_qrWrap').style.display = '';
    document.getElementById('_qrImg').src = dataURL;
    document.getElementById('_qrDownload').onclick = () => downloadDataURL(dataURL, filename || 'qr.png');
  } catch (err) {
    console.error(err);
    document.getElementById('_qrLoading').innerHTML = '⚠️ QR failed<br><span style="font-size:11px">' + esc(err.message) + '</span>';
  }
  document.getElementById('_qrClose').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/* ═══════════════════════════════════════════════════════════
   CAMERA QR SCANNER
   ═══════════════════════════════════════════════════════════ */
let _activeScanner = null;
function openQRScanner(onScan, options) {
  options = options || {};
  const title = options.title || '📷 Scan QR Code';
  const hint = options.hint || 'Point camera at QR code';
  const boxSize = options.qrbox || 260;

  if (_activeScanner) return;
  if (typeof Html5Qrcode === 'undefined') {
    toast('QR scanner library not loaded', 'error');
    return;
  }
  const old = document.getElementById('_tpQRScan');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = '_tpQRScan';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;display:flex;flex-direction:column;font-family:Inter,sans-serif`;
  modal.innerHTML = `
    <div style="padding:14px;display:flex;align-items:center;gap:10px;color:#fff">
      <div style="flex:1;font-weight:800;font-size:16px">${title}</div>
      <button id="_qrScanClose" style="background:#dc2626;color:#fff;border:none;width:42px;height:42px;border-radius:12px;font-size:22px;font-weight:800;cursor:pointer;line-height:1">×</button>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:16px">
      <div id="qrReader" style="width:100%;max-width:440px;background:#111;border-radius:18px;overflow:hidden;border:2px solid #22c55e"></div>
    </div>
    <div style="padding:16px;text-align:center;color:#e5e7eb;font-size:13px;line-height:1.6">
      📱 ${hint}<br>
      <span style="font-size:11px;color:#9ca3af">Auto-closes on scan</span>
    </div>`;
  document.body.appendChild(modal);

  const qr = new Html5Qrcode("qrReader", { verbose: false });
  _activeScanner = qr;
  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: boxSize, height: boxSize }, aspectRatio: 1.0 },
    (decoded) => {
      try { navigator.vibrate && navigator.vibrate(100); } catch {}
      qr.stop().then(() => {
        _activeScanner = null;
        modal.remove();
        onScan(decoded);
      }).catch(() => {
        _activeScanner = null;
        modal.remove();
        onScan(decoded);
      });
    },
    () => {}
  ).catch(err => {
    console.error('Scanner error:', err);
    _activeScanner = null;
    modal.remove();
    toast('Camera could not start', 'error');
  });

  document.getElementById('_qrScanClose').onclick = () => {
    if (_activeScanner) _activeScanner.stop().finally(() => { _activeScanner = null; modal.remove(); });
    else modal.remove();
  };
}

/* ═══════════════════════════════════════════════════════════
   VALIDATION
   ═══════════════════════════════════════════════════════════ */
function normalizeEmail(raw) { return String(raw || '').trim().toLowerCase(); }
function isValidGmail(email) {
  return /^[a-z0-9][a-z0-9._%+-]{2,}@gmail\.com$/i.test(String(email || '').trim());
}

function normalizePhone(raw) {
  let p = String(raw || '').replace(/\D/g, '');
  if (p.startsWith('880') && p.length === 13) p = '0' + p.slice(3);
  if (p.startsWith('88') && p.length === 12) p = '0' + p.slice(2);
  if (p.startsWith('91') && p.length === 12) p = p.slice(2);
  return p;
}
function isValidPhone(p) {
  if (!p) return false;
  if (/^01[3-9]\d{8}$/.test(p)) return true;
  if (/^[6-9]\d{9}$/.test(p)) return true;
  if (/^\d{10,13}$/.test(p)) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════
   SHOP ID
   ═══════════════════════════════════════════════════════════ */
function generateShopId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'SHOP-' + s;
}
const shopIdKey = id => String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const salesmanEmail = (sid, u) => `s-${shopIdKey(sid)}-${String(u||'').toLowerCase().replace(/[^a-z0-9]/g,'')}@textilepos-user.app`;

/* ═══════════════════════════════════════════════════════════
   CUSTOMER HELP ID SYSTEM
   ═══════════════════════════════════════════════════════════ */
function generateCustomerCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'C-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
async function generateUniqueCustomerCode() {
  for (let attempt = 0; attempt < 15; attempt++) {
    const code = generateCustomerCode();
    const doc = await db.collection('customerCodes').doc(code).get();
    if (!doc.exists) return code;
  }
  throw new Error('Could not generate unique customer code');
}
async function registerCustomerCode(code, shopId, customerId, phone, name, batch) {
  const data = {
    code, shopId, customerId,
    phone: phone || '',
    name: name || '',
    createdAt: FV.serverTimestamp(),
  };
  if (batch) {
    batch.set(db.collection('customerCodes').doc(code), data);
  } else {
    await db.collection('customerCodes').doc(code).set(data);
  }
  return data;
}

/* ═══════════════════════════════════════════════════════════
   ⭐ P2P WALLET API INTEGRATION (NEW)
   
   Backend: https://mpointwallwt-1.onrender.com
   Wallet App: https://gamingmanojit14-lab.github.io/Mpointwallwtap
   
   Flow:
   - Admin configures Shop ID + Secret Code via admin.html
   - Salesman POS calls createPaymentRequest → QR shown
   - Customer pays via Wallet App
   - Backend writes to shops/{shopId}/walletPayments/{txId}
   - Salesman onSnapshot listener detects → sale complete
   ═══════════════════════════════════════════════════════════ */
window.TP = window.TP || {};

TP.walletAPI = {
  DEFAULT_BACKEND: 'https://mpointwallwt-1.onrender.com',
  DEFAULT_WALLET_APP: 'https://gamingmanojit14-lab.github.io/Mpointwallwtap',

  // ─────────────────────────────────────────────────────────
  // Internal: fetch wrapper with error handling
  // ─────────────────────────────────────────────────────────
  async _fetch(backendUrl, path, { method = 'POST', shopId, secretCode, body } = {}) {
    if (!backendUrl) throw new Error('Backend URL missing');
    if (!shopId) throw new Error('Shop ID missing');
    if (!secretCode) throw new Error('Secret code missing');

    const url = backendUrl.replace(/\/$/, '') + path;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': secretCode,
        'x-shop-id': shopId,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    });

    let data;
    try { data = await res.json(); }
    catch (e) { throw new Error('Invalid response from server'); }

    if (!res.ok || data.success === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  },

  // ─────────────────────────────────────────────────────────
  // Config: read/write from shops/{shopId}/integrationConfig/p2p
  // ─────────────────────────────────────────────────────────
  async getConfig(shopId) {
    try {
      const doc = await db.collection('shops').doc(shopId)
        .collection('integrationConfig').doc('p2p').get();
      if (!doc.exists) return null;
      return doc.data();
    } catch (e) {
      console.warn('getConfig error:', e);
      return null;
    }
  },

  async saveConfig(shopId, config) {
    const doc = db.collection('shops').doc(shopId)
      .collection('integrationConfig').doc('p2p');
    await doc.set({
      ...config,
      updatedAt: FV.serverTimestamp(),
    }, { merge: true });
    return true;
  },

  async clearConfig(shopId) {
    await db.collection('shops').doc(shopId)
      .collection('integrationConfig').doc('p2p').delete();
    return true;
  },

  // ─────────────────────────────────────────────────────────
  // Test connection
  // ─────────────────────────────────────────────────────────
  async verifyConnection(backendUrl, shopId, secretCode) {
    return await this._fetch(backendUrl, '/api/verifyConnection', {
      method: 'POST', shopId, secretCode, body: {},
    });
  },

  // ─────────────────────────────────────────────────────────
  // Create payment request (returns QR URL)
  // ─────────────────────────────────────────────────────────
  async createPaymentRequest(backendUrl, shopId, secretCode, { amount, invoiceNo, expiresIn = 300 }) {
    return await this._fetch(backendUrl, '/api/createPaymentRequest', {
      method: 'POST', shopId, secretCode,
      body: { amount, invoiceNo, expiresIn },
    });
  },

  // ─────────────────────────────────────────────────────────
  // Poll payment status
  // ─────────────────────────────────────────────────────────
  async getPaymentStatus(backendUrl, shopId, secretCode, requestId) {
    return await this._fetch(
      backendUrl,
      `/api/paymentStatus?requestId=${encodeURIComponent(requestId)}`,
      { method: 'GET', shopId, secretCode }
    );
  },

  // ─────────────────────────────────────────────────────────
  // Manual debit (fallback)
  // ─────────────────────────────────────────────────────────
  async debitPoints(backendUrl, shopId, secretCode, { customerWalletId, amount, externalRef, note }) {
    return await this._fetch(backendUrl, '/api/debitPoints', {
      method: 'POST', shopId, secretCode,
      body: { customerWalletId, amount, externalRef, note },
    });
  },

  // ─────────────────────────────────────────────────────────
  // Credit loyalty points to customer wallet
  // ─────────────────────────────────────────────────────────
  async creditPoints(backendUrl, shopId, secretCode, { customerWalletId, amount, externalRef, note }) {
    return await this._fetch(backendUrl, '/api/creditPoints', {
      method: 'POST', shopId, secretCode,
      body: { customerWalletId, amount, externalRef, note },
    });
  },

  // ─────────────────────────────────────────────────────────
  // Get wallet balance
  // ─────────────────────────────────────────────────────────
  async getBalance(backendUrl, shopId, secretCode, walletId) {
    return await this._fetch(
      backendUrl,
      `/api/getBalance?walletId=${encodeURIComponent(walletId)}`,
      { method: 'GET', shopId, secretCode }
    );
  },

  // ─────────────────────────────────────────────────────────
  // Listen for incoming payments via Firestore mirror
  // Backend writes to shops/{shopId}/walletPayments/{txId}
  // ─────────────────────────────────────────────────────────
  listenForPayments(shopId, requestId, callback) {
    const ref = db.collection('shops').doc(shopId)
      .collection('walletPayments')
      .where('requestId', '==', requestId)
      .limit(1);

    let fired = false;
    return ref.onSnapshot(snap => {
      if (snap.empty) return;
      if (fired) return;
      fired = true;
      const doc = snap.docs[0];
      callback({ id: doc.id, ...doc.data() });
    }, err => {
      console.error('listenForPayments error:', err);
    });
  },

  // ─────────────────────────────────────────────────────────
  // Helper: extract walletId from customer doc
  // ─────────────────────────────────────────────────────────
  async getCustomerWalletId(shopId, customerId) {
    if (!customerId) return null;
    try {
      const doc = await db.collection('shops').doc(shopId)
        .collection('customers').doc(customerId).get();
      if (!doc.exists) return null;
      return doc.data().walletId || null;
    } catch (e) { return null; }
  },
};

// In-memory config cache
TP._p2pConfigCache = null;
TP.getP2PConfig = async function(shopId) {
  if (TP._p2pConfigCache && TP._p2pConfigCache.shopId === shopId) {
    return TP._p2pConfigCache;
  }
  const cfg = await TP.walletAPI.getConfig(shopId);
  if (cfg) TP._p2pConfigCache = { shopId, ...cfg };
  return cfg;
};
TP.invalidateP2PConfig = function() { TP._p2pConfigCache = null; };

/* ═══════════════════════════════════════════════════════════
   SCANNER SESSION
   ═══════════════════════════════════════════════════════════ */
function generateSessionId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(24);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
  else for (let i = 0; i < 24; i++) arr[i] = Math.floor(Math.random() * 256);
  let s = '';
  for (let i = 0; i < 24; i++) s += chars[arr[i] % chars.length];
  return s;
}
function buildScannerURL(sessionId) {
  const url = new URL('scanner.html', location.href);
  url.searchParams.set('s', sessionId);
  return url.href;
}
async function createScannerSession(shopId, salesmanId, salesmanName, shopName) {
  const sessionId = generateSessionId();
  await db.collection('scannerSessions').doc(sessionId).set({
    sessionId, shopId, shopName: shopName || '',
    salesmanId, salesmanName: salesmanName || '',
    scannerConnected: false,
    createdAt: FV.serverTimestamp(), lastPing: FV.serverTimestamp(),
  });
  return sessionId;
}
async function deleteScannerSession(sessionId) {
  if (!sessionId) return;
  try {
    const ref = db.collection('scannerSessions').doc(sessionId);
    const scans = await ref.collection('scans').get();
    const batch = db.batch();
    scans.docs.forEach(d => batch.delete(d.ref));
    batch.delete(ref);
    await batch.commit();
  } catch (e) { console.error('deleteScannerSession:', e); }
}

/* ═══════════════════════════════════════════════════════════
   PAYMENT SESSION (Remote UPI Device)
   ═══════════════════════════════════════════════════════════ */
async function createPaymentSession(shopId, salesmanId, salesmanName, shopName, upiId, upiName) {
  const sessionId = generateSessionId();
  await db.collection('paymentSessions').doc(sessionId).set({
    sessionId, shopId, shopName: shopName || '',
    salesmanId, salesmanName: salesmanName || '',
    upiId, upiName: upiName || '',
    deviceConnected: false,
    createdAt: FV.serverTimestamp(), lastPing: FV.serverTimestamp(),
  });
  return sessionId;
}
function buildPaymentURL(sessionId) {
  const url = new URL('payment.html', location.href);
  url.searchParams.set('s', sessionId);
  return url.href;
}
async function deletePaymentSession(sessionId) {
  if (!sessionId) return;
  try {
    const ref = db.collection('paymentSessions').doc(sessionId);
    const reqs = await ref.collection('requests').get();
    const batch = db.batch();
    reqs.docs.forEach(d => batch.delete(d.ref));
    batch.delete(ref);
    await batch.commit();
  } catch (e) { console.error('deletePaymentSession:', e); }
}
async function createPaymentRequest(sessionId, { amount, invoiceNo, customerName }) {
  const reqRef = db.collection('paymentSessions').doc(sessionId).collection('requests').doc();
  await reqRef.set({
    amount: Number(amount) || 0,
    invoiceNo: invoiceNo || '',
    customerName: customerName || '',
    status: 'pending',
    createdAt: FV.serverTimestamp(),
  });
  return reqRef;
}
async function confirmPaymentRequest(reqRef) {
  await reqRef.update({ status: 'paid', confirmedAt: FV.serverTimestamp() });
}
async function cancelPaymentRequest(reqRef) {
  await reqRef.update({ status: 'cancelled', cancelledAt: FV.serverTimestamp() });
}

/* ═══════════════════════════════════════════════════════════
   UPI HELPERS
   ═══════════════════════════════════════════════════════════ */
function buildUPIURL({ upiId, name, amount, note, currency = 'INR' }) {
  if (!upiId) throw new Error('UPI ID not set');
  const params = new URLSearchParams();
  params.set('pa', String(upiId).trim());
  if (name) params.set('pn', String(name).trim());
  if (amount != null && amount !== '') params.set('am', Number(amount).toFixed(2));
  params.set('cu', currency);
  if (note) params.set('tn', String(note).trim());
  return 'upi://pay?' + params.toString();
}

function showUPIPaymentModal({ upiId, upiName, amount, invoiceNo, shopName }) {
  return new Promise(async (resolve) => {
    const old = document.getElementById('_upiPayModal');
    if (old) old.remove();
    let qrDataURL = '', err = '';
    try {
      const upiURL = buildUPIURL({ upiId, name: upiName || shopName, amount, note: invoiceNo });
      qrDataURL = await generateQRDataURL(upiURL, 600);
    } catch (e) { err = e.message || 'QR generation failed'; }
    const modal = document.createElement('div');
    modal.id = '_upiPayModal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;font-family:Inter,sans-serif;overflow-y:auto`;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:24px;max-width:440px;width:100%;padding:24px;text-align:center;box-shadow:0 25px 70px rgba(0,0,0,.5)">
        <div style="font-size:38px;margin-bottom:6px">💳</div>
        <h3 style="font-weight:800;font-size:20px;margin:0 0 4px;color:#111">UPI Payment</h3>
        <p style="color:#6b7280;font-size:12px;margin:0 0 16px">Customer scans with GPay / PhonePe / Paytm</p>
        <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:16px;padding:14px;margin-bottom:14px">
          <div style="font-size:11px;opacity:.85">Amount to pay</div>
          <div style="font-size:30px;font-weight:800;letter-spacing:.5px">${money(amount)}</div>
          ${invoiceNo ? `<div style="font-size:11px;opacity:.85;font-family:monospace;margin-top:4px">${esc(invoiceNo)}</div>` : ''}
        </div>
        ${err ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;color:#991b1b;font-size:13px">⚠️ ${esc(err)}</div>` :
        `<div style="background:#fff;padding:12px;border-radius:16px;display:inline-block;border:2px solid #e5e7eb">
          <img src="${qrDataURL}" style="width:250px;height:250px;display:block">
        </div>
        <div style="margin-top:10px;background:#f9fafb;border-radius:10px;padding:8px">
          <div style="font-size:10px;color:#6b7280">UPI ID</div>
          <div style="font-family:monospace;font-weight:700;font-size:13px;color:#111;word-break:break-all">${esc(upiId)}</div>
        </div>`}
        <div style="margin-top:18px;display:flex;flex-direction:column;gap:8px">
          <button id="_upiReceived" style="background:#16a34a;color:#fff;padding:15px;border:none;border-radius:14px;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer">✓ Payment Received</button>
          <button id="_upiCancel" style="background:#f3f4f6;color:#374151;padding:13px;border:none;border-radius:14px;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('_upiReceived').onclick = () => { modal.remove(); resolve('received'); };
    document.getElementById('_upiCancel').onclick = () => { modal.remove(); resolve('cancelled'); };
  });
}

async function showShopUPIQR({ upiId, upiName, shopName }) {
  const old = document.getElementById('_shopUPIModal');
  if (old) old.remove();
  const upiURL = buildUPIURL({ upiId, name: upiName || shopName, amount: '', note: '' });
  const qr = await generateQRDataURL(upiURL, 600);
  const modal = document.createElement('div');
  modal.id = '_shopUPIModal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,sans-serif`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:22px;max-width:420px;width:100%;padding:24px;text-align:center">
      <div style="font-size:36px;margin-bottom:6px">📱</div>
      <h3 style="font-weight:800;font-size:18px;margin:0 0 4px">My UPI QR</h3>
      <p style="color:#6b7280;font-size:12px;margin:0 0 16px">Customer enters any amount</p>
      <div style="background:#fff;padding:12px;border-radius:14px;display:inline-block;border:1px solid #e5e7eb">
        <img src="${qr}" style="width:250px;height:250px;display:block">
      </div>
      <div style="margin-top:12px;background:#f9fafb;border-radius:10px;padding:8px">
        <div style="font-family:monospace;font-weight:700;font-size:13px;color:#111;word-break:break-all">${esc(upiId)}</div>
      </div>
      <button id="_shopUPIClose" style="width:100%;background:#f3f4f6;color:#374151;padding:13px;border:none;border-radius:12px;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer;margin-top:14px">Close</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('_shopUPIClose').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/* ═══════════════════════════════════════════════════════════
   WHATSAPP HELPERS
   ═══════════════════════════════════════════════════════════ */
function formatPhoneForWhatsApp(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.length === 10) p = '91' + p;
  else if (p.length === 11 && p.startsWith('01')) p = '880' + p.slice(1);
  return p;
}
function openWhatsApp(phone, message) {
  const intl = formatPhoneForWhatsApp(phone);
  if (!intl) { toast('Phone number not available', 'warn'); return; }
  window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`, '_blank');
}
function buildInvoiceMessage(sale, settings) {
  const L = [];
  L.push(`*${settings.shopName || 'Shop'}*`);
  if (settings.shopAddress) L.push(settings.shopAddress);
  if (settings.shopPhone) L.push(`📞 ${settings.shopPhone}`);
  L.push('');
  L.push(`*Invoice:* ${sale.invoiceNo}`);
  L.push(`*Date:* ${fmtDate(sale.saleDate)}`);
  if (sale.customerCode) L.push(`*Help ID:* ${sale.customerCode}`);
  L.push('');
  L.push('*Items:*');
  sale.items.forEach((it, i) => {
    L.push(`${i+1}. ${it.name} — ${it.qty} ${it.unit||''} × ₹${it.price} = ₹${(it.qty*it.price).toFixed(2)}`);
  });
  L.push('');
  L.push(`Subtotal: ₹${sale.subtotal.toFixed(2)}`);
  if (sale.discount > 0) L.push(`Discount: -₹${sale.discount.toFixed(2)}`);
  L.push(`*Total: ₹${sale.total.toFixed(2)}*`);
  L.push(`Paid: ₹${sale.paid.toFixed(2)}`);
  if (sale.due > 0) L.push(`*Due: ₹${sale.due.toFixed(2)}*`);
  L.push('');
  L.push('Thank you! Visit again 🙏');
  return L.join('\n');
}
function buildDueReminderMessage(customer, settings) {
  return `Dear ${customer.name},\n\n` +
    `Friendly reminder from *${settings.shopName || 'Shop'}*.\n\n` +
    `Your pending due: *₹${Number(customer.due||0).toFixed(2)}*\n\n` +
    `Please clear it when convenient.\n\n` +
    (settings.shopPhone ? `Contact: ${settings.shopPhone}\n\n` : '') +
    `Thank you! 🙏`;
}

/* ═══════════════════════════════════════════════════════════
   HOLD / PARK SALE
   ═══════════════════════════════════════════════════════════ */
function getHeldCarts() {
  try { return JSON.parse(localStorage.getItem('tp_held_carts') || '[]'); }
  catch { return []; }
}
function saveHeldCarts(list) { localStorage.setItem('tp_held_carts', JSON.stringify(list)); }
function holdCart(cart, saleType, note, shopId) {
  const list = getHeldCarts();
  const held = {
    id: 'HOLD-' + Date.now(),
    shopId, saleType,
    note: note || '',
    items: cart.map(it => ({ ...it })),
    createdAt: new Date().toISOString(),
  };
  list.push(held);
  saveHeldCarts(list);
  return held;
}
function deleteHeldCart(id) {
  const list = getHeldCarts().filter(c => c.id !== id);
  saveHeldCarts(list);
  return list;
}

/* ═══════════════════════════════════════════════════════════
   DISCOUNT PRESETS
   ═══════════════════════════════════════════════════════════ */
function applyDiscountPreset(subtotal, preset) {
  if (preset.type === 'pct') return Math.round(subtotal * preset.value / 100 * 100) / 100;
  if (preset.type === 'flat') return Math.min(subtotal, preset.value);
  return 0;
}

/* ═══════════════════════════════════════════════════════════
   SPLIT PAYMENT PARSER
   ═══════════════════════════════════════════════════════════ */
function parseSplitPayments(str, total) {
  const parts = String(str || '').split(',').map(x => x.trim()).filter(Boolean);
  const payments = [];
  let sum = 0;
  for (const p of parts) {
    const [method, amt] = p.split(':').map(x => x.trim());
    const n = +amt;
    if (!method || !n || n <= 0) continue;
    payments.push({ method, amount: n });
    sum += n;
  }
  if (sum > total) return { error: 'Sum exceeds total' };
  return { payments, paid: sum, due: total - sum };
}

/* ═══════════════════════════════════════════════════════════
   COMMISSION CALCULATOR
   ⚠️ Loyalty earn (100=1 point) REMOVED — handled by P2P Wallet now
   ═══════════════════════════════════════════════════════════ */
function calculateCommission(total, ratePercent) {
  return Math.round(Number(total || 0) * Number(ratePercent || 0)) / 100;
}

/* ═══════════════════════════════════════════════════════════
   CSV PARSER
   ═══════════════════════════════════════════════════════════ */
function parseCSV(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const parseRow = row => {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '"') {
        if (inQ && row[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(x => x.trim());
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY LOG
   ═══════════════════════════════════════════════════════════ */
async function logActivity(shopId, userId, userName, action, details) {
  try {
    await db.collection('shops').doc(shopId).collection('activityLogs').add({
      userId, userName, action,
      details: details || '',
      timestamp: FV.serverTimestamp(),
    });
  } catch (e) { console.warn('logActivity:', e); }
}

/* ═══════════════════════════════════════════════════════════
   LABEL SHEET PRINT
   ═══════════════════════════════════════════════════════════ */
function printLabelSheet(products, settings) {
  const itemsPerRow = 4;
  const rows = [];
  for (let i = 0; i < products.length; i += itemsPerRow) rows.push(products.slice(i, i + itemsPerRow));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; font-family: Inter, sans-serif; }
      body { margin: 0; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
      .label { border: 1px dashed #999; padding: 3mm 2mm; text-align: center; page-break-inside: avoid; border-radius: 3mm; }
      .label .name { font-size: 10px; font-weight: 700; margin-bottom: 2mm; line-height: 1.2; height: 6mm; overflow: hidden; }
      .label .price { font-size: 14px; font-weight: 800; color: #111; margin-bottom: 1mm; }
      .label img { width: 100%; max-width: 30mm; height: auto; }
      .label .code { font-family: monospace; font-size: 8px; margin-top: 1mm; color: #555; }
    </style>
  </head><body>
    <div class="grid">${products.map(p => `
      <div class="label">
        <div class="name">${esc(p.name).substring(0, 40)}</div>
        <div class="price">₹${(+p.retailPrice || 0).toFixed(0)}</div>
        <img id="qr-${p.id}" alt="">
        <div class="code">${esc(p.barcode || '')}</div>
      </div>`).join('')}</div>
  </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(async () => {
    for (const p of products) {
      try {
        const url = await generateQRDataURL(p.barcode || p.id, 200);
        const img = w.document.getElementById('qr-' + p.id);
        if (img) img.src = url;
      } catch {}
    }
    setTimeout(() => w.print(), 500);
  }, 300);
}

/* ═══════════════════════════════════════════════════════════
   DARK MODE
   ═══════════════════════════════════════════════════════════ */
function getDarkMode() { return localStorage.getItem('tp_dark') === '1'; }
function setDarkMode(on) {
  localStorage.setItem('tp_dark', on ? '1' : '0');
  document.documentElement.classList.toggle('dark', on);
}
function initDarkMode() { if (getDarkMode()) document.documentElement.classList.add('dark'); }
function toggleDarkMode() { setDarkMode(!getDarkMode()); }

/* ═══════════════════════════════════════════════════════════
   i18n
   ═══════════════════════════════════════════════════════════ */
const I18N = {
  en: { pos:'POS', dashboard:'Dashboard', sales:'Sales', products:'Products',
    customers:'Customers', salesmen:'Salesmen', reports:'Reports', settings:'Settings',
    cart:'Cart', checkout:'Checkout', logout:'Logout', search:'Search',
    add:'Add', save:'Save', cancel:'Cancel', delete:'Delete', edit:'Edit',
    total:'Total', subtotal:'Subtotal', discount:'Discount', paid:'Paid', due:'Due',
    change:'Change', customer:'Customer', walkin:'Walk-in', existing:'Existing', new:'New',
    cash:'Cash', upi:'UPI', card:'Card', bank:'Bank', credit:'Credit', print:'Print',
    invoice:'Invoice', completeSale:'Complete Sale', holdSale:'Hold Sale',
    todaySales:'Today Sales', totalSales:'Total Sales', stock:'Stock',
    outOfStock:'Out of stock', lowStock:'Low stock', inStock:'In stock' },
  hi: { pos:'पीओएस', dashboard:'डैशबोर्ड', sales:'बिक्री', products:'उत्पाद',
    customers:'ग्राहक', salesmen:'सेल्समैन', reports:'रिपोर्ट', settings:'सेटिंग्स',
    cart:'कार्ट', checkout:'चेकआउट', logout:'लॉगआउट', search:'खोजें',
    add:'जोड़ें', save:'सेव', cancel:'रद्द', delete:'हटाएं', edit:'संपादित',
    total:'कुल', subtotal:'उप-कुल', discount:'छूट', paid:'भुगतान', due:'बकाया',
    change:'परिवर्तन', customer:'ग्राहक', walkin:'वॉक-इन', existing:'मौजूदा', new:'नया',
    cash:'नकद', upi:'यूपीआई', card:'कार्ड', bank:'बैंक', credit:'उधार', print:'प्रिंट',
    invoice:'चालान', completeSale:'बिक्री पूरी', holdSale:'बिक्री रोकें',
    todaySales:'आज की बिक्री', totalSales:'कुल बिक्री', stock:'स्टॉक',
    outOfStock:'स्टॉक ख़त्म', lowStock:'कम स्टॉक', inStock:'स्टॉक में' },
};
function getLang() { return localStorage.getItem('tp_lang') || 'en'; }
function setLang(l) { localStorage.setItem('tp_lang', l); location.reload(); }
function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N.en[key]) || key;
}

/* ═══════════════════════════════════════════════════════════
   AI SALES FORECAST
   ═══════════════════════════════════════════════════════════ */
function forecastSales(dailyTotals, daysAhead = 7) {
  if (!dailyTotals.length) return { predictions: [], avg: 0, trend: 0 };
  const n = dailyTotals.length;
  const xs = dailyTotals.map((_, i) => i);
  const ys = dailyTotals.map(d => d.total || 0);
  const sumX = xs.reduce((a,b) => a+b, 0);
  const sumY = ys.reduce((a,b) => a+b, 0);
  const sumXY = xs.reduce((a,x,i) => a + x*ys[i], 0);
  const sumX2 = xs.reduce((a,x) => a + x*x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const avg = sumY / n;
  const predictions = [];
  for (let i = 0; i < daysAhead; i++) predictions.push(Math.max(0, slope * (n + i) + intercept));
  return { predictions, avg, trend: slope };
}

/* ═══════════════════════════════════════════════════════════
   GST CALCULATOR
   ═══════════════════════════════════════════════════════════ */
function calcGST(total, ratePercent) {
  const rate = Number(ratePercent) || 0;
  if (rate <= 0) return { base: total, gst: 0, cgst: 0, sgst: 0, igst: 0 };
  const base = Math.round(total / (1 + rate/100) * 100) / 100;
  const gst = Math.round((total - base) * 100) / 100;
  return {
    base, gst,
    cgst: Math.round(gst / 2 * 100) / 100,
    sgst: Math.round(gst / 2 * 100) / 100,
    igst: 0,
  };
}

/* ═══════════════════════════════════════════════════════════
   PWA INSTALL
   ═══════════════════════════════════════════════════════════ */
let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
});
async function promptPWAInstall() {
  if (!_deferredInstallPrompt) {
    toast('Use browser menu → "Add to Home screen"', 'info');
    return false;
  }
  _deferredInstallPrompt.prompt();
  const { outcome } = await _deferredInstallPrompt.userChoice;
  _deferredInstallPrompt = null;
  return outcome === 'accepted';
}
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW:', e));
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = './manifest.json';
    document.head.appendChild(l);
  }
  initDarkMode();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPWA);
else initPWA();

/* ═══════════════════════════════════════════════════════════
   BULK WHATSAPP CAMPAIGN
   ═══════════════════════════════════════════════════════════ */
function buildCampaignMessage(template, customer, settings) {
  return String(template || '')
    .replace(/{name}/g, customer.name || 'Customer')
    .replace(/{shop}/g, settings.shopName || 'Shop')
    .replace(/{phone}/g, settings.shopPhone || '');
}

/* ═══════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════ */
function toast(msg, type = 'info') {
  let tc = document.getElementById('toastContainer');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'toastContainer';
    tc.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:8px;width:90%;max-width:380px;pointer-events:none';
    document.body.appendChild(tc);
  }
  const colors = { info: '#1f2937', success: '#16a34a', error: '#dc2626', warn: '#f59e0b' };
  const icons  = { info: 'ℹ️', success: '✓', error: '✕', warn: '⚠️' };
  const el = document.createElement('div');
  el.style.cssText = `background:${colors[type]};color:#fff;padding:12px 16px;border-radius:12px;
    box-shadow:0 10px 30px rgba(0,0,0,.3);display:flex;align-items:center;gap:8px;font-size:14px;
    font-weight:500;font-family:Inter,sans-serif`;
  el.innerHTML = `<span>${icons[type]}</span><span>${esc(msg)}</span>`;
  tc.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0'; el.style.transform = 'translateY(-10px)';
    setTimeout(() => el.remove(), 320);
  }, 2400);
}

/* ═══════════════════════════════════════════════════════════
   CONFIRM
   ═══════════════════════════════════════════════════════════ */
let _confirmResolve = null;
function askConfirm(msg) {
  return new Promise(res => {
    _confirmResolve = res;
    let modal = document.getElementById('_tpConfirm');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = '_tpConfirm';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:none;align-items:center;justify-content:center;padding:16px;font-family:Inter,sans-serif';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:20px;max-width:380px;width:100%;padding:24px">
          <div style="text-align:center"><div style="font-size:40px;margin-bottom:8px">⚠️</div>
          <p id="_tpConfirmMsg" style="color:#374151;font-weight:500;margin-bottom:24px"></p></div>
          <div style="display:flex;gap:12px">
            <button id="_tpNo" style="flex:1;background:#f3f4f6;padding:12px;border-radius:12px;font-weight:600;font-family:inherit;cursor:pointer">No</button>
            <button id="_tpYes" style="flex:1;background:#dc2626;color:#fff;padding:12px;border-radius:12px;font-weight:600;font-family:inherit;cursor:pointer">Yes</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById('_tpNo').onclick = () => { modal.style.display = 'none'; _confirmResolve?.(false); };
      document.getElementById('_tpYes').onclick = () => { modal.style.display = 'none'; _confirmResolve?.(true); };
    }
    document.getElementById('_tpConfirmMsg').textContent = msg;
    modal.style.display = 'flex';
  });
}

/* ═══════════════════════════════════════════════════════════
   AUTH GUARD
   ═══════════════════════════════════════════════════════════ */
async function requireAuth(requiredRole) {
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(async user => {
      unsub();
      if (!user) { location.href = 'login.html'; return; }
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) { await auth.signOut(); location.href = 'login.html'; return; }
        const userData = userDoc.data();
        const shopDoc = await db.collection('shops').doc(userData.shopId).get();
        if (!shopDoc.exists) { await auth.signOut(); location.href = 'login.html'; return; }
        const profile = {
          uid: user.uid, email: user.email, ...userData,
          shop: { shopId: userData.shopId, ...shopDoc.data() },
        };
        if (requiredRole === 'admin' && profile.role !== 'admin') { location.href = 'salesman.html'; return; }
        resolve(profile);
      } catch (e) { console.error(e); location.href = 'login.html'; }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   EXPOSE
   ═══════════════════════════════════════════════════════════ */
window.TP = {
  // Core
  auth, db, FV, $, $$,
  // Format & utils
  bn, money, esc, todayKey, fmtDate, isToday, uid, copyText,
  // Barcode / QR / Scanner
  generateBarcode, generateQRDataURL, downloadDataURL, showQRModal, openQRScanner,
  // Validation
  normalizeEmail, isValidGmail, normalizePhone, isValidPhone,
  // Shop
  generateShopId, salesmanEmail,
  // Customer Help ID
  generateCustomerCode, generateUniqueCustomerCode, registerCustomerCode,
  // ⭐ P2P Wallet API Integration
  walletAPI: TP.walletAPI,
  getP2PConfig: TP.getP2PConfig,
  invalidateP2PConfig: TP.invalidateP2PConfig,
  // Remote Scanner
  generateSessionId, buildScannerURL, createScannerSession, deleteScannerSession,
  // Remote Payment (UPI device)
  createPaymentSession, buildPaymentURL, deletePaymentSession,
  createPaymentRequest, confirmPaymentRequest, cancelPaymentRequest,
  // UPI
  buildUPIURL, showUPIPaymentModal, showShopUPIQR,
  // WhatsApp
  openWhatsApp, formatPhoneForWhatsApp, buildInvoiceMessage, buildDueReminderMessage, buildCampaignMessage,
  // Hold / Discount / Split
  getHeldCarts, saveHeldCarts, holdCart, deleteHeldCart,
  applyDiscountPreset, parseSplitPayments,
  // Commission (loyalty removed)
  calculateCommission,
  // CSV / Log / Label
  parseCSV, logActivity, printLabelSheet,
  // Appearance / i18n
  getDarkMode, setDarkMode, toggleDarkMode, initDarkMode,
  t, getLang, setLang, I18N,
  // AI / GST / PWA
  forecastSales, calcGST, promptPWAInstall, initPWA,
  // UI
  toast, askConfirm,
  // Auth
  requireAuth,
};
