(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function a (f) {
	var f2 = f*f;
	return 1.2588966 * 148840000 * f2*f2 /
	((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000));
};

},{}],2:[function(require,module,exports){
/* 
 *  DSP.js - a comprehensive digital signal processing  library for javascript
 * 
 *  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
 *  Copyright 2010 Corban Brook. All rights reserved.
 *
 */

////////////////////////////////////////////////////////////////////////////////
//                                  CONSTANTS                                 //
////////////////////////////////////////////////////////////////////////////////

/**
 * DSP is an object which contains general purpose utility functions and constants
 */
var DSP = {
  // Channels
  LEFT:           0,
  RIGHT:          1,
  MIX:            2,

  // Waveforms
  SINE:           1,
  TRIANGLE:       2,
  SAW:            3,
  SQUARE:         4,

  // Filters
  LOWPASS:        0,
  HIGHPASS:       1,
  BANDPASS:       2,
  NOTCH:          3,

  // Window functions
  BARTLETT:       1,
  BARTLETTHANN:   2,
  BLACKMAN:       3,
  COSINE:         4,
  GAUSS:          5,
  HAMMING:        6,
  HANN:           7,
  LANCZOS:        8,
  RECTANGULAR:    9,
  TRIANGULAR:     10,

  // Loop modes
  OFF:            0,
  FW:             1,
  BW:             2,
  FWBW:           3,

  // Math
  TWO_PI:         2*Math.PI
};

// Setup arrays for platforms which do not support byte arrays
function setupTypedArray(name, fallback) {
  // check if TypedArray exists
  // typeof on Minefield and Chrome return function, typeof on Webkit returns object.
  if (typeof this[name] !== "function" && typeof this[name] !== "object") {
    // nope.. check if WebGLArray exists
    if (typeof this[fallback] === "function" && typeof this[fallback] !== "object") {
      this[name] = this[fallback];
    } else {
      // nope.. set as Native JS array
      this[name] = function(obj) {
        if (obj instanceof Array) {
          return obj;
        } else if (typeof obj === "number") {
          return new Array(obj);
        }
      };
    }
  }
}

setupTypedArray("Float64Array", "WebGLFloatArray");
setupTypedArray("Int32Array",   "WebGLIntArray");
setupTypedArray("Uint16Array",  "WebGLUnsignedShortArray");
setupTypedArray("Uint8Array",   "WebGLUnsignedByteArray");


////////////////////////////////////////////////////////////////////////////////
//                            DSP UTILITY FUNCTIONS                           //
////////////////////////////////////////////////////////////////////////////////

/**
 * Inverts the phase of a signal
 *
 * @param {Array} buffer A sample buffer
 *
 * @returns The inverted sample buffer
 */
DSP.invert = function(buffer) {
  for (var i = 0, len = buffer.length; i < len; i++) {
    buffer[i] *= -1;
  }

  return buffer;
};

/**
 * Converts split-stereo (dual mono) sample buffers into a stereo interleaved sample buffer
 *
 * @param {Array} left  A sample buffer
 * @param {Array} right A sample buffer
 *
 * @returns The stereo interleaved buffer
 */
DSP.interleave = function(left, right) {
  if (left.length !== right.length) {
    throw "Can not interleave. Channel lengths differ.";
  }
 
  var stereoInterleaved = new Float64Array(left.length * 2);
 
  for (var i = 0, len = left.length; i < len; i++) {
    stereoInterleaved[2*i]   = left[i];
    stereoInterleaved[2*i+1] = right[i];
  }
 
  return stereoInterleaved;
};

/**
 * Converts a stereo-interleaved sample buffer into split-stereo (dual mono) sample buffers
 *
 * @param {Array} buffer A stereo-interleaved sample buffer
 *
 * @returns an Array containing left and right channels
 */
DSP.deinterleave = (function() {
  var left, right, mix, deinterleaveChannel = []; 

  deinterleaveChannel[DSP.MIX] = function(buffer) {
    for (var i = 0, len = buffer.length/2; i < len; i++) {
      mix[i] = (buffer[2*i] + buffer[2*i+1]) / 2;
    }
    return mix;
  };

  deinterleaveChannel[DSP.LEFT] = function(buffer) {
    for (var i = 0, len = buffer.length/2; i < len; i++) {
      left[i]  = buffer[2*i];
    }
    return left;
  };

  deinterleaveChannel[DSP.RIGHT] = function(buffer) {
    for (var i = 0, len = buffer.length/2; i < len; i++) {
      right[i]  = buffer[2*i+1];
    }
    return right;
  };

  return function(channel, buffer) { 
    left  = left  || new Float64Array(buffer.length/2);
    right = right || new Float64Array(buffer.length/2);
    mix   = mix   || new Float64Array(buffer.length/2);

    if (buffer.length/2 !== left.length) {
      left  = new Float64Array(buffer.length/2);
      right = new Float64Array(buffer.length/2);
      mix   = new Float64Array(buffer.length/2);
    }

    return deinterleaveChannel[channel](buffer);
  };
}());

/**
 * Separates a channel from a stereo-interleaved sample buffer
 *
 * @param {Array}  buffer A stereo-interleaved sample buffer
 * @param {Number} channel A channel constant (LEFT, RIGHT, MIX)
 *
 * @returns an Array containing a signal mono sample buffer
 */
DSP.getChannel = DSP.deinterleave;

/**
 * Helper method (for Reverb) to mix two (interleaved) samplebuffers. It's possible
 * to negate the second buffer while mixing and to perform a volume correction
 * on the final signal.
 *
 * @param {Array} sampleBuffer1 Array containing Float values or a Float64Array
 * @param {Array} sampleBuffer2 Array containing Float values or a Float64Array
 * @param {Boolean} negate When true inverts/flips the audio signal
 * @param {Number} volumeCorrection When you add multiple sample buffers, use this to tame your signal ;)
 *
 * @returns A new Float64Array interleaved buffer.
 */
DSP.mixSampleBuffers = function(sampleBuffer1, sampleBuffer2, negate, volumeCorrection){
  var outputSamples = new Float64Array(sampleBuffer1);

  for(var i = 0; i<sampleBuffer1.length; i++){
    outputSamples[i] += (negate ? -sampleBuffer2[i] : sampleBuffer2[i]) / volumeCorrection;
  }
 
  return outputSamples;
}; 

// Biquad filter types
DSP.LPF = 0;                // H(s) = 1 / (s^2 + s/Q + 1)
DSP.HPF = 1;                // H(s) = s^2 / (s^2 + s/Q + 1)
DSP.BPF_CONSTANT_SKIRT = 2; // H(s) = s / (s^2 + s/Q + 1)  (constant skirt gain, peak gain = Q)
DSP.BPF_CONSTANT_PEAK = 3;  // H(s) = (s/Q) / (s^2 + s/Q + 1)      (constant 0 dB peak gain)
DSP.NOTCH = 4;              // H(s) = (s^2 + 1) / (s^2 + s/Q + 1)
DSP.APF = 5;                // H(s) = (s^2 - s/Q + 1) / (s^2 + s/Q + 1)
DSP.PEAKING_EQ = 6;         // H(s) = (s^2 + s*(A/Q) + 1) / (s^2 + s/(A*Q) + 1)
DSP.LOW_SHELF = 7;          // H(s) = A * (s^2 + (sqrt(A)/Q)*s + A)/(A*s^2 + (sqrt(A)/Q)*s + 1)
DSP.HIGH_SHELF = 8;         // H(s) = A * (A*s^2 + (sqrt(A)/Q)*s + 1)/(s^2 + (sqrt(A)/Q)*s + A)

// Biquad filter parameter types
DSP.Q = 1;
DSP.BW = 2; // SHARED with BACKWARDS LOOP MODE
DSP.S = 3;

// Find RMS of signal
DSP.RMS = function(buffer) {
  var total = 0;
  
  for (var i = 0, n = buffer.length; i < n; i++) {
    total += buffer[i] * buffer[i];
  }
  
  return Math.sqrt(total / n);
};

// Find Peak of signal
DSP.Peak = function(buffer) {
  var peak = 0;
  
  for (var i = 0, n = buffer.length; i < n; i++) {
    peak = (Math.abs(buffer[i]) > peak) ? Math.abs(buffer[i]) : peak; 
  }
  
  return peak;
};

// Fourier Transform Module used by DFT, FFT, RFFT
function FourierTransform(bufferSize, sampleRate) {
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;
  this.bandwidth  = 2 / bufferSize * sampleRate / 2;

  this.spectrum   = new Float64Array(bufferSize/2);
  this.real       = new Float64Array(bufferSize);
  this.imag       = new Float64Array(bufferSize);

  this.peakBand   = 0;
  this.peak       = 0;

  /**
   * Calculates the *middle* frequency of an FFT band.
   *
   * @param {Number} index The index of the FFT band.
   *
   * @returns The middle frequency in Hz.
   */
  this.getBandFrequency = function(index) {
    return this.bandwidth * index + this.bandwidth / 2;
  };

  this.calculateSpectrum = function() {
    var spectrum  = this.spectrum,
        real      = this.real,
        imag      = this.imag,
        bSi       = 2 / this.bufferSize,
        sqrt      = Math.sqrt,
        rval, 
        ival,
        mag;

    for (var i = 0, N = bufferSize/2; i < N; i++) {
      rval = real[i];
      ival = imag[i];
      mag = bSi * sqrt(rval * rval + ival * ival);

      if (mag > this.peak) {
        this.peakBand = i;
        this.peak = mag;
      }

      spectrum[i] = mag;
    }
  };
}

/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
function DFT(bufferSize, sampleRate) {
  FourierTransform.call(this, bufferSize, sampleRate);

  var N = bufferSize/2 * bufferSize;
  var TWO_PI = 2 * Math.PI;

  this.sinTable = new Float64Array(N);
  this.cosTable = new Float64Array(N);

  for (var i = 0; i < N; i++) {
    this.sinTable[i] = Math.sin(i * TWO_PI / bufferSize);
    this.cosTable[i] = Math.cos(i * TWO_PI / bufferSize);
  }
}

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer
 *
 * @returns The frequency spectrum array
 */
DFT.prototype.forward = function(buffer) {
  var real = this.real, 
      imag = this.imag,
      rval,
      ival;

  for (var k = 0; k < this.bufferSize/2; k++) {
    rval = 0.0;
    ival = 0.0;

    for (var n = 0; n < buffer.length; n++) {
      rval += this.cosTable[k*n] * buffer[n];
      ival += this.sinTable[k*n] * buffer[n];
    }

    real[k] = rval;
    imag[k] = ival;
  }

  return this.calculateSpectrum();
};


/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
function FFT(bufferSize, sampleRate) {
  FourierTransform.call(this, bufferSize, sampleRate);
   
  this.reverseTable = new Uint32Array(bufferSize);

  var limit = 1;
  var bit = bufferSize >> 1;

  var i;

  while (limit < bufferSize) {
    for (i = 0; i < limit; i++) {
      this.reverseTable[i + limit] = this.reverseTable[i] + bit;
    }

    limit = limit << 1;
    bit = bit >> 1;
  }

  this.sinTable = new Float64Array(bufferSize);
  this.cosTable = new Float64Array(bufferSize);

  for (i = 0; i < bufferSize; i++) {
    this.sinTable[i] = Math.sin(-Math.PI/i);
    this.cosTable[i] = Math.cos(-Math.PI/i);
  }
}

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
 *
 * @returns The frequency spectrum array
 */
FFT.prototype.forward = function(buffer) {
  // Locally scope variables for speed up
  var bufferSize      = this.bufferSize,
      cosTable        = this.cosTable,
      sinTable        = this.sinTable,
      reverseTable    = this.reverseTable,
      real            = this.real,
      imag            = this.imag,
      spectrum        = this.spectrum;

  var k = Math.floor(Math.log(bufferSize) / Math.LN2);

  if (Math.pow(2, k) !== bufferSize) { throw "Invalid buffer size, must be a power of 2."; }
  if (bufferSize !== buffer.length)  { throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length; }

  var halfSize = 1,
      phaseShiftStepReal,
      phaseShiftStepImag,
      currentPhaseShiftReal,
      currentPhaseShiftImag,
      off,
      tr,
      ti,
      tmpReal,
      i;

  for (i = 0; i < bufferSize; i++) {
    real[i] = buffer[reverseTable[i]];
    imag[i] = 0;
  }

  while (halfSize < bufferSize) {
    //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
    //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
    phaseShiftStepReal = cosTable[halfSize];
    phaseShiftStepImag = sinTable[halfSize];
    
    currentPhaseShiftReal = 1;
    currentPhaseShiftImag = 0;

    for (var fftStep = 0; fftStep < halfSize; fftStep++) {
      i = fftStep;

      while (i < bufferSize) {
        off = i + halfSize;
        tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
        ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

        real[off] = real[i] - tr;
        imag[off] = imag[i] - ti;
        real[i] += tr;
        imag[i] += ti;

        i += halfSize << 1;
      }

      tmpReal = currentPhaseShiftReal;
      currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
      currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
    }

    halfSize = halfSize << 1;
  }

  return this.calculateSpectrum();
};

FFT.prototype.inverse = function(real, imag) {
  // Locally scope variables for speed up
  var bufferSize      = this.bufferSize,
      cosTable        = this.cosTable,
      sinTable        = this.sinTable,
      reverseTable    = this.reverseTable,
      spectrum        = this.spectrum;
     
      real = real || this.real;
      imag = imag || this.imag;

  var halfSize = 1,
      phaseShiftStepReal,
      phaseShiftStepImag,
      currentPhaseShiftReal,
      currentPhaseShiftImag,
      off,
      tr,
      ti,
      tmpReal,
      i;

  for (i = 0; i < bufferSize; i++) {
    imag[i] *= -1;
  }

  var revReal = new Float64Array(bufferSize);
  var revImag = new Float64Array(bufferSize);
 
  for (i = 0; i < real.length; i++) {
    revReal[i] = real[reverseTable[i]];
    revImag[i] = imag[reverseTable[i]];
  }
 
  real = revReal;
  imag = revImag;

  while (halfSize < bufferSize) {
    phaseShiftStepReal = cosTable[halfSize];
    phaseShiftStepImag = sinTable[halfSize];
    currentPhaseShiftReal = 1;
    currentPhaseShiftImag = 0;

    for (var fftStep = 0; fftStep < halfSize; fftStep++) {
      i = fftStep;

      while (i < bufferSize) {
        off = i + halfSize;
        tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
        ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

        real[off] = real[i] - tr;
        imag[off] = imag[i] - ti;
        real[i] += tr;
        imag[i] += ti;

        i += halfSize << 1;
      }

      tmpReal = currentPhaseShiftReal;
      currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
      currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
    }

    halfSize = halfSize << 1;
  }

  var buffer = new Float64Array(bufferSize); // this should be reused instead
  for (i = 0; i < bufferSize; i++) {
    buffer[i] = real[i] / bufferSize;
  }

  return buffer;
};

/**
 * RFFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * This method currently only contains a forward transform but is highly optimized.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */

// lookup tables don't really gain us any speed, but they do increase
// cache footprint, so don't use them in here

// also we don't use sepearate arrays for real/imaginary parts

// this one a little more than twice as fast as the one in FFT
// however I only did the forward transform

// the rest of this was translated from C, see http://www.jjj.de/fxt/
// this is the real split radix FFT

function RFFT(bufferSize, sampleRate) {
  FourierTransform.call(this, bufferSize, sampleRate);

  this.trans = new Float64Array(bufferSize);

  this.reverseTable = new Uint32Array(bufferSize);

  // don't use a lookup table to do the permute, use this instead
  this.reverseBinPermute = function (dest, source) {
    var bufferSize  = this.bufferSize, 
        halfSize    = bufferSize >>> 1, 
        nm1         = bufferSize - 1, 
        i = 1, r = 0, h;

    dest[0] = source[0];

    do {
      r += halfSize;
      dest[i] = source[r];
      dest[r] = source[i];
      
      i++;

      h = halfSize << 1;
      while (h = h >> 1, !((r ^= h) & h));

      if (r >= i) { 
        dest[i]     = source[r]; 
        dest[r]     = source[i];

        dest[nm1-i] = source[nm1-r]; 
        dest[nm1-r] = source[nm1-i];
      }
      i++;
    } while (i < halfSize);
    dest[nm1] = source[nm1];
  };

  this.generateReverseTable = function () {
    var bufferSize  = this.bufferSize, 
        halfSize    = bufferSize >>> 1, 
        nm1         = bufferSize - 1, 
        i = 1, r = 0, h;

    this.reverseTable[0] = 0;

    do {
      r += halfSize;
      
      this.reverseTable[i] = r;
      this.reverseTable[r] = i;

      i++;

      h = halfSize << 1;
      while (h = h >> 1, !((r ^= h) & h));

      if (r >= i) { 
        this.reverseTable[i] = r;
        this.reverseTable[r] = i;

        this.reverseTable[nm1-i] = nm1-r;
        this.reverseTable[nm1-r] = nm1-i;
      }
      i++;
    } while (i < halfSize);

    this.reverseTable[nm1] = nm1;
  };

  this.generateReverseTable();
}


// Ordering of output:
//
// trans[0]     = re[0] (==zero frequency, purely real)
// trans[1]     = re[1]
//             ...
// trans[n/2-1] = re[n/2-1]
// trans[n/2]   = re[n/2]    (==nyquist frequency, purely real)
//
// trans[n/2+1] = im[n/2-1]
// trans[n/2+2] = im[n/2-2]
//             ...
// trans[n-1]   = im[1] 

RFFT.prototype.forward = function(buffer) {
  var n         = this.bufferSize, 
      spectrum  = this.spectrum,
      x         = this.trans, 
      TWO_PI    = 2*Math.PI,
      sqrt      = Math.sqrt,
      i         = n >>> 1,
      bSi       = 2 / n,
      n2, n4, n8, nn, 
      t1, t2, t3, t4, 
      i1, i2, i3, i4, i5, i6, i7, i8, 
      st1, cc1, ss1, cc3, ss3,
      e, 
      a,
      rval, ival, mag; 

  this.reverseBinPermute(x, buffer);

  /*
  var reverseTable = this.reverseTable;

  for (var k = 0, len = reverseTable.length; k < len; k++) {
    x[k] = buffer[reverseTable[k]];
  }
  */

  for (var ix = 0, id = 4; ix < n; id *= 4) {
    for (var i0 = ix; i0 < n; i0 += id) {
      //sumdiff(x[i0], x[i0+1]); // {a, b}  <--| {a+b, a-b}
      st1 = x[i0] - x[i0+1];
      x[i0] += x[i0+1];
      x[i0+1] = st1;
    } 
    ix = 2*(id-1);
  }

  n2 = 2;
  nn = n >>> 1;

  while((nn = nn >>> 1)) {
    ix = 0;
    n2 = n2 << 1;
    id = n2 << 1;
    n4 = n2 >>> 2;
    n8 = n2 >>> 3;
    do {
      if(n4 !== 1) {
        for(i0 = ix; i0 < n; i0 += id) {
          i1 = i0;
          i2 = i1 + n4;
          i3 = i2 + n4;
          i4 = i3 + n4;
     
          //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
          t1 = x[i3] + x[i4];
          x[i4] -= x[i3];
          //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
          x[i3] = x[i1] - t1; 
          x[i1] += t1;
     
          i1 += n8;
          i2 += n8;
          i3 += n8;
          i4 += n8;
         
          //sumdiff(x[i3], x[i4], t1, t2); // {s, d}  <--| {a+b, a-b}
          t1 = x[i3] + x[i4];
          t2 = x[i3] - x[i4];
         
          t1 = -t1 * Math.SQRT1_2;
          t2 *= Math.SQRT1_2;
     
          // sumdiff(t1, x[i2], x[i4], x[i3]); // {s, d}  <--| {a+b, a-b}
          st1 = x[i2];
          x[i4] = t1 + st1; 
          x[i3] = t1 - st1;
          
          //sumdiff3(x[i1], t2, x[i2]); // {a, b, d} <--| {a+b, b, a-b}
          x[i2] = x[i1] - t2;
          x[i1] += t2;
        }
      } else {
        for(i0 = ix; i0 < n; i0 += id) {
          i1 = i0;
          i2 = i1 + n4;
          i3 = i2 + n4;
          i4 = i3 + n4;
     
          //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
          t1 = x[i3] + x[i4]; 
          x[i4] -= x[i3];
          
          //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
          x[i3] = x[i1] - t1; 
          x[i1] += t1;
        }
      }
   
      ix = (id << 1) - n2;
      id = id << 2;
    } while (ix < n);
 
    e = TWO_PI / n2;

    for (var j = 1; j < n8; j++) {
      a = j * e;
      ss1 = Math.sin(a);
      cc1 = Math.cos(a);

      //ss3 = sin(3*a); cc3 = cos(3*a);
      cc3 = 4*cc1*(cc1*cc1-0.75);
      ss3 = 4*ss1*(0.75-ss1*ss1);
   
      ix = 0; id = n2 << 1;
      do {
        for (i0 = ix; i0 < n; i0 += id) {
          i1 = i0 + j;
          i2 = i1 + n4;
          i3 = i2 + n4;
          i4 = i3 + n4;
       
          i5 = i0 + n4 - j;
          i6 = i5 + n4;
          i7 = i6 + n4;
          i8 = i7 + n4;
       
          //cmult(c, s, x, y, &u, &v)
          //cmult(cc1, ss1, x[i7], x[i3], t2, t1); // {u,v} <--| {x*c-y*s, x*s+y*c}
          t2 = x[i7]*cc1 - x[i3]*ss1; 
          t1 = x[i7]*ss1 + x[i3]*cc1;
          
          //cmult(cc3, ss3, x[i8], x[i4], t4, t3);
          t4 = x[i8]*cc3 - x[i4]*ss3; 
          t3 = x[i8]*ss3 + x[i4]*cc3;
       
          //sumdiff(t2, t4);   // {a, b} <--| {a+b, a-b}
          st1 = t2 - t4;
          t2 += t4;
          t4 = st1;
          
          //sumdiff(t2, x[i6], x[i8], x[i3]); // {s, d}  <--| {a+b, a-b}
          //st1 = x[i6]; x[i8] = t2 + st1; x[i3] = t2 - st1;
          x[i8] = t2 + x[i6]; 
          x[i3] = t2 - x[i6];
         
          //sumdiff_r(t1, t3); // {a, b} <--| {a+b, b-a}
          st1 = t3 - t1;
          t1 += t3;
          t3 = st1;
          
          //sumdiff(t3, x[i2], x[i4], x[i7]); // {s, d}  <--| {a+b, a-b}
          //st1 = x[i2]; x[i4] = t3 + st1; x[i7] = t3 - st1;
          x[i4] = t3 + x[i2]; 
          x[i7] = t3 - x[i2];
         
          //sumdiff3(x[i1], t1, x[i6]);   // {a, b, d} <--| {a+b, b, a-b}
          x[i6] = x[i1] - t1; 
          x[i1] += t1;
          
          //diffsum3_r(t4, x[i5], x[i2]); // {a, b, s} <--| {a, b-a, a+b}
          x[i2] = t4 + x[i5]; 
          x[i5] -= t4;
        }
     
        ix = (id << 1) - n2;
        id = id << 2;
   
      } while (ix < n);
    }
  }

  while (--i) {
    rval = x[i];
    ival = x[n-i-1];
    mag = bSi * sqrt(rval * rval + ival * ival);

    if (mag > this.peak) {
      this.peakBand = i;
      this.peak = mag;
    }

    spectrum[i] = mag;
  }

  spectrum[0] = bSi * x[0];

  return spectrum;
};

function Sampler(file, bufferSize, sampleRate, playStart, playEnd, loopStart, loopEnd, loopMode) {
  this.file = file;
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;
  this.playStart  = playStart || 0; // 0%
  this.playEnd    = playEnd   || 1; // 100%
  this.loopStart  = loopStart || 0;
  this.loopEnd    = loopEnd   || 1;
  this.loopMode   = loopMode  || DSP.OFF;
  this.loaded     = false;
  this.samples    = [];
  this.signal     = new Float64Array(bufferSize);
  this.frameCount = 0;
  this.envelope   = null;
  this.amplitude  = 1;
  this.rootFrequency = 110; // A2 110
  this.frequency  = 550;
  this.step       = this.frequency / this.rootFrequency;
  this.duration   = 0;
  this.samplesProcessed = 0;
  this.playhead   = 0;
 
  var audio = /* new Audio();*/ document.createElement("AUDIO");
  var self = this;
 
  this.loadSamples = function(event) {
    var buffer = DSP.getChannel(DSP.MIX, event.frameBuffer);
    for ( var i = 0; i < buffer.length; i++) {
      self.samples.push(buffer[i]);
    }
  };
 
  this.loadComplete = function() {
    // convert flexible js array into a fast typed array
    self.samples = new Float64Array(self.samples);
    self.loaded = true;
  };
 
  this.loadMetaData = function() {
    self.duration = audio.duration;
  };
 
  audio.addEventListener("MozAudioAvailable", this.loadSamples, false);
  audio.addEventListener("loadedmetadata", this.loadMetaData, false);
  audio.addEventListener("ended", this.loadComplete, false);
  audio.muted = true;
  audio.src = file;
  audio.play();
}

Sampler.prototype.applyEnvelope = function() {
  this.envelope.process(this.signal);
  return this.signal;
};

Sampler.prototype.generate = function() {
  var frameOffset = this.frameCount * this.bufferSize;
 
  var loopWidth = this.playEnd * this.samples.length - this.playStart * this.samples.length;
  var playStartSamples = this.playStart * this.samples.length; // ie 0.5 -> 50% of the length
  var playEndSamples = this.playEnd * this.samples.length; // ie 0.5 -> 50% of the length
  var offset;

  for ( var i = 0; i < this.bufferSize; i++ ) {
    switch (this.loopMode) {
      case DSP.OFF:
        this.playhead = Math.round(this.samplesProcessed * this.step + playStartSamples);
        if (this.playhead < (this.playEnd * this.samples.length) ) {
          this.signal[i] = this.samples[this.playhead] * this.amplitude;
        } else {
          this.signal[i] = 0;
        }
        break;
     
      case DSP.FW:
        this.playhead = Math.round((this.samplesProcessed * this.step) % loopWidth + playStartSamples);
        if (this.playhead < (this.playEnd * this.samples.length) ) {
          this.signal[i] = this.samples[this.playhead] * this.amplitude;
        }
        break;
       
      case DSP.BW:
        this.playhead = playEndSamples - Math.round((this.samplesProcessed * this.step) % loopWidth);
        if (this.playhead < (this.playEnd * this.samples.length) ) {
          this.signal[i] = this.samples[this.playhead] * this.amplitude;
        }
        break;
       
      case DSP.FWBW:
        if ( Math.floor(this.samplesProcessed * this.step / loopWidth) % 2 === 0 ) {
          this.playhead = Math.round((this.samplesProcessed * this.step) % loopWidth + playStartSamples);
        } else {
          this.playhead = playEndSamples - Math.round((this.samplesProcessed * this.step) % loopWidth);
        }  
        if (this.playhead < (this.playEnd * this.samples.length) ) {
          this.signal[i] = this.samples[this.playhead] * this.amplitude;
        }
        break;
    }
    this.samplesProcessed++;
  }

  this.frameCount++;

  return this.signal;
};

Sampler.prototype.setFreq = function(frequency) {
    var totalProcessed = this.samplesProcessed * this.step;
    this.frequency = frequency;
    this.step = this.frequency / this.rootFrequency;
    this.samplesProcessed = Math.round(totalProcessed/this.step);
};

Sampler.prototype.reset = function() {
  this.samplesProcessed = 0;
  this.playhead = 0;
};

/**
 * Oscillator class for generating and modifying signals
 *
 * @param {Number} type       A waveform constant (eg. DSP.SINE)
 * @param {Number} frequency  Initial frequency of the signal
 * @param {Number} amplitude  Initial amplitude of the signal
 * @param {Number} bufferSize Size of the sample buffer to generate
 * @param {Number} sampleRate The sample rate of the signal
 *
 * @contructor
 */
function Oscillator(type, frequency, amplitude, bufferSize, sampleRate) {
  this.frequency  = frequency;
  this.amplitude  = amplitude;
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;
  //this.pulseWidth = pulseWidth;
  this.frameCount = 0;
 
  this.waveTableLength = 2048;

  this.cyclesPerSample = frequency / sampleRate;

  this.signal = new Float64Array(bufferSize);
  this.envelope = null;

  switch(parseInt(type, 10)) {
    case DSP.TRIANGLE:
      this.func = Oscillator.Triangle;
      break;

    case DSP.SAW:
      this.func = Oscillator.Saw;
      break;

    case DSP.SQUARE:
      this.func = Oscillator.Square;
      break;

    default:
    case DSP.SINE:
      this.func = Oscillator.Sine;
      break;
  }

  this.generateWaveTable = function() {
    Oscillator.waveTable[this.func] = new Float64Array(2048);
    var waveTableTime = this.waveTableLength / this.sampleRate;
    var waveTableHz = 1 / waveTableTime;

    for (var i = 0; i < this.waveTableLength; i++) {
      Oscillator.waveTable[this.func][i] = this.func(i * waveTableHz/this.sampleRate);
    }
  };

  if ( typeof Oscillator.waveTable === 'undefined' ) {
    Oscillator.waveTable = {};
  }

  if ( typeof Oscillator.waveTable[this.func] === 'undefined' ) {
    this.generateWaveTable();
  }
 
  this.waveTable = Oscillator.waveTable[this.func];
}

/**
 * Set the amplitude of the signal
 *
 * @param {Number} amplitude The amplitude of the signal (between 0 and 1)
 */
Oscillator.prototype.setAmp = function(amplitude) {
  if (amplitude >= 0 && amplitude <= 1) {
    this.amplitude = amplitude;
  } else {
    throw "Amplitude out of range (0..1).";
  }
};
  
/**
 * Set the frequency of the signal
 *
 * @param {Number} frequency The frequency of the signal
 */  
Oscillator.prototype.setFreq = function(frequency) {
  this.frequency = frequency;
  this.cyclesPerSample = frequency / this.sampleRate;
};
     
// Add an oscillator
Oscillator.prototype.add = function(oscillator) {
  for ( var i = 0; i < this.bufferSize; i++ ) {
    //this.signal[i] += oscillator.valueAt(i);
    this.signal[i] += oscillator.signal[i];
  }
 
  return this.signal;
};
     
// Add a signal to the current generated osc signal
Oscillator.prototype.addSignal = function(signal) {
  for ( var i = 0; i < signal.length; i++ ) {
    if ( i >= this.bufferSize ) {
      break;
    }
    this.signal[i] += signal[i];
   
    /*
    // Constrain amplitude
    if ( this.signal[i] > 1 ) {
      this.signal[i] = 1;
    } else if ( this.signal[i] < -1 ) {
      this.signal[i] = -1;
    }
    */
  }
  return this.signal;
};
     
// Add an envelope to the oscillator
Oscillator.prototype.addEnvelope = function(envelope) {
  this.envelope = envelope;
};

Oscillator.prototype.applyEnvelope = function() {
  this.envelope.process(this.signal);
};
     
Oscillator.prototype.valueAt = function(offset) {
  return this.waveTable[offset % this.waveTableLength];
};
     
Oscillator.prototype.generate = function() {
  var frameOffset = this.frameCount * this.bufferSize;
  var step = this.waveTableLength * this.frequency / this.sampleRate;
  var offset;

  for ( var i = 0; i < this.bufferSize; i++ ) {
    //var step = (frameOffset + i) * this.cyclesPerSample % 1;
    //this.signal[i] = this.func(step) * this.amplitude;
    //this.signal[i] = this.valueAt(Math.round((frameOffset + i) * step)) * this.amplitude;
    offset = Math.round((frameOffset + i) * step);
    this.signal[i] = this.waveTable[offset % this.waveTableLength] * this.amplitude;
  }

  this.frameCount++;

  return this.signal;
};

Oscillator.Sine = function(step) {
  return Math.sin(DSP.TWO_PI * step);
};

Oscillator.Square = function(step) {
  return step < 0.5 ? 1 : -1;
};

Oscillator.Saw = function(step) {
  return 2 * (step - Math.round(step));
};

Oscillator.Triangle = function(step) {
  return 1 - 4 * Math.abs(Math.round(step) - step);
};

Oscillator.Pulse = function(step) {
  // stub
};
 
function ADSR(attackLength, decayLength, sustainLevel, sustainLength, releaseLength, sampleRate) {
  this.sampleRate = sampleRate;
  // Length in seconds
  this.attackLength  = attackLength;
  this.decayLength   = decayLength;
  this.sustainLevel  = sustainLevel;
  this.sustainLength = sustainLength;
  this.releaseLength = releaseLength;
  this.sampleRate    = sampleRate;
 
  // Length in samples
  this.attackSamples  = attackLength  * sampleRate;
  this.decaySamples   = decayLength   * sampleRate;
  this.sustainSamples = sustainLength * sampleRate;
  this.releaseSamples = releaseLength * sampleRate;
 
  // Updates the envelope sample positions
  this.update = function() {
    this.attack         =                this.attackSamples;
    this.decay          = this.attack  + this.decaySamples;
    this.sustain        = this.decay   + this.sustainSamples;
    this.release        = this.sustain + this.releaseSamples;
  };
 
  this.update();
 
  this.samplesProcessed = 0;
}

ADSR.prototype.noteOn = function() {
  this.samplesProcessed = 0;
  this.sustainSamples = this.sustainLength * this.sampleRate;
  this.update();
};

// Send a note off when using a sustain of infinity to let the envelope enter the release phase
ADSR.prototype.noteOff = function() {
  this.sustainSamples = this.samplesProcessed - this.decaySamples;
  this.update();
};

ADSR.prototype.processSample = function(sample) {
  var amplitude = 0;

  if ( this.samplesProcessed <= this.attack ) {
    amplitude = 0 + (1 - 0) * ((this.samplesProcessed - 0) / (this.attack - 0));
  } else if ( this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay ) {
    amplitude = 1 + (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
  } else if ( this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain ) {
    amplitude = this.sustainLevel;
  } else if ( this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release ) {
    amplitude = this.sustainLevel + (0 - this.sustainLevel) * ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
  }
 
  return sample * amplitude;
};

ADSR.prototype.value = function() {
  var amplitude = 0;

  if ( this.samplesProcessed <= this.attack ) {
    amplitude = 0 + (1 - 0) * ((this.samplesProcessed - 0) / (this.attack - 0));
  } else if ( this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay ) {
    amplitude = 1 + (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
  } else if ( this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain ) {
    amplitude = this.sustainLevel;
  } else if ( this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release ) {
    amplitude = this.sustainLevel + (0 - this.sustainLevel) * ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
  }
 
  return amplitude;
};
     
ADSR.prototype.process = function(buffer) {
  for ( var i = 0; i < buffer.length; i++ ) {
    buffer[i] *= this.value();

    this.samplesProcessed++;
  }
 
  return buffer;
};
     
     
ADSR.prototype.isActive = function() {
  if ( this.samplesProcessed > this.release || this.samplesProcessed === -1 ) {
    return false;
  } else {
    return true;
  }
};

ADSR.prototype.disable = function() {
  this.samplesProcessed = -1;
};
 
function IIRFilter(type, cutoff, resonance, sampleRate) {
  this.sampleRate = sampleRate;

  switch(type) {
    case DSP.LOWPASS:
    case DSP.LP12:
      this.func = new IIRFilter.LP12(cutoff, resonance, sampleRate);
      break;
  }
}

IIRFilter.prototype.__defineGetter__('cutoff',
  function() {
    return this.func.cutoff;
  }
);

IIRFilter.prototype.__defineGetter__('resonance',
  function() {
    return this.func.resonance;
  }
);

IIRFilter.prototype.set = function(cutoff, resonance) {
  this.func.calcCoeff(cutoff, resonance);
};

IIRFilter.prototype.process = function(buffer) {
  this.func.process(buffer);
};

// Add an envelope to the filter
IIRFilter.prototype.addEnvelope = function(envelope) {
  if ( envelope instanceof ADSR ) {
    this.func.addEnvelope(envelope);
  } else {
    throw "Not an envelope.";
  }
};

IIRFilter.LP12 = function(cutoff, resonance, sampleRate) {
  this.sampleRate = sampleRate;
  this.vibraPos   = 0;
  this.vibraSpeed = 0;
  this.envelope = false;
 
  this.calcCoeff = function(cutoff, resonance) {
    this.w = 2.0 * Math.PI * cutoff / this.sampleRate;
    this.q = 1.0 - this.w / (2.0 * (resonance + 0.5 / (1.0 + this.w)) + this.w - 2.0);
    this.r = this.q * this.q;
    this.c = this.r + 1.0 - 2.0 * Math.cos(this.w) * this.q;
   
    this.cutoff = cutoff;
    this.resonance = resonance;
  };

  this.calcCoeff(cutoff, resonance);

  this.process = function(buffer) {
    for ( var i = 0; i < buffer.length; i++ ) {
      this.vibraSpeed += (buffer[i] - this.vibraPos) * this.c;
      this.vibraPos   += this.vibraSpeed;
      this.vibraSpeed *= this.r;
   
      /*
      var temp = this.vibraPos;
     
      if ( temp > 1.0 ) {
        temp = 1.0;
      } else if ( temp < -1.0 ) {
        temp = -1.0;
      } else if ( temp != temp ) {
        temp = 1;
      }
     
      buffer[i] = temp;
      */

      if (this.envelope) {
        buffer[i] = (buffer[i] * (1 - this.envelope.value())) + (this.vibraPos * this.envelope.value());
        this.envelope.samplesProcessed++;
      } else {
        buffer[i] = this.vibraPos;
      }
    }
  };
}; 

IIRFilter.LP12.prototype.addEnvelope = function(envelope) {
  this.envelope = envelope;
};

function IIRFilter2(type, cutoff, resonance, sampleRate) {
  this.type = type;
  this.cutoff = cutoff;
  this.resonance = resonance;
  this.sampleRate = sampleRate;

  this.f = Float64Array(4);
  this.f[0] = 0.0; // lp
  this.f[1] = 0.0; // hp
  this.f[2] = 0.0; // bp
  this.f[3] = 0.0; // br 
 
  this.calcCoeff = function(cutoff, resonance) {
    this.freq = 2 * Math.sin(Math.PI * Math.min(0.25, cutoff/(this.sampleRate*2)));  
    this.damp = Math.min(2 * (1 - Math.pow(resonance, 0.25)), Math.min(2, 2/this.freq - this.freq * 0.5));
  };

  this.calcCoeff(cutoff, resonance);
}

IIRFilter2.prototype.process = function(buffer) {
  var input, output;
  var f = this.f;

  for ( var i = 0; i < buffer.length; i++ ) {
    input = buffer[i];

    // first pass
    f[3] = input - this.damp * f[2];
    f[0] = f[0] + this.freq * f[2];
    f[1] = f[3] - f[0];
    f[2] = this.freq * f[1] + f[2];
    output = 0.5 * f[this.type];

    // second pass
    f[3] = input - this.damp * f[2];
    f[0] = f[0] + this.freq * f[2];
    f[1] = f[3] - f[0];
    f[2] = this.freq * f[1] + f[2];
    output += 0.5 * f[this.type];

    if (this.envelope) {
      buffer[i] = (buffer[i] * (1 - this.envelope.value())) + (output * this.envelope.value());
      this.envelope.samplesProcessed++;
    } else {
      buffer[i] = output;
    }
  }
};

IIRFilter2.prototype.addEnvelope = function(envelope) {
  if ( envelope instanceof ADSR ) {
    this.envelope = envelope;
  } else {
    throw "This is not an envelope.";
  }
};

IIRFilter2.prototype.set = function(cutoff, resonance) {
  this.calcCoeff(cutoff, resonance);
};



function WindowFunction(type, alpha) {
  this.alpha = alpha;
 
  switch(type) {
    case DSP.BARTLETT:
      this.func = WindowFunction.Bartlett;
      break;
     
    case DSP.BARTLETTHANN:
      this.func = WindowFunction.BartlettHann;
      break;
     
    case DSP.BLACKMAN:
      this.func = WindowFunction.Blackman;
      this.alpha = this.alpha || 0.16;
      break;
   
    case DSP.COSINE:
      this.func = WindowFunction.Cosine;
      break;
     
    case DSP.GAUSS:
      this.func = WindowFunction.Gauss;
      this.alpha = this.alpha || 0.25;
      break;
     
    case DSP.HAMMING:
      this.func = WindowFunction.Hamming;
      break;
     
    case DSP.HANN:
      this.func = WindowFunction.Hann;
      break;
   
    case DSP.LANCZOS:
      this.func = WindowFunction.Lanczoz;
      break;
     
    case DSP.RECTANGULAR:
      this.func = WindowFunction.Rectangular;
      break;
     
    case DSP.TRIANGULAR:
      this.func = WindowFunction.Triangular;
      break;
  }
}

WindowFunction.prototype.process = function(buffer) {
  var length = buffer.length;
  for ( var i = 0; i < length; i++ ) {
    buffer[i] *= this.func(length, i, this.alpha);
  }
  return buffer;
};

WindowFunction.Bartlett = function(length, index) {
  return 2 / (length - 1) * ((length - 1) / 2 - Math.abs(index - (length - 1) / 2));
};

WindowFunction.BartlettHann = function(length, index) {
  return 0.62 - 0.48 * Math.abs(index / (length - 1) - 0.5) - 0.38 * Math.cos(DSP.TWO_PI * index / (length - 1));
};

WindowFunction.Blackman = function(length, index, alpha) {
  var a0 = (1 - alpha) / 2;
  var a1 = 0.5;
  var a2 = alpha / 2;

  return a0 - a1 * Math.cos(DSP.TWO_PI * index / (length - 1)) + a2 * Math.cos(4 * Math.PI * index / (length - 1));
};

WindowFunction.Cosine = function(length, index) {
  return Math.cos(Math.PI * index / (length - 1) - Math.PI / 2);
};

WindowFunction.Gauss = function(length, index, alpha) {
  return Math.pow(Math.E, -0.5 * Math.pow((index - (length - 1) / 2) / (alpha * (length - 1) / 2), 2));
};

WindowFunction.Hamming = function(length, index) {
  return 0.54 - 0.46 * Math.cos(DSP.TWO_PI * index / (length - 1));
};

WindowFunction.Hann = function(length, index) {
  return 0.5 * (1 - Math.cos(DSP.TWO_PI * index / (length - 1)));
};

WindowFunction.Lanczos = function(length, index) {
  var x = 2 * index / (length - 1) - 1;
  return Math.sin(Math.PI * x) / (Math.PI * x);
};

WindowFunction.Rectangular = function(length, index) {
  return 1;
};

WindowFunction.Triangular = function(length, index) {
  return 2 / length * (length / 2 - Math.abs(index - (length - 1) / 2));
};

function sinh (arg) {
  // Returns the hyperbolic sine of the number, defined as (exp(number) - exp(-number))/2 
  //
  // version: 1004.2314
  // discuss at: http://phpjs.org/functions/sinh    // +   original by: Onno Marsman
  // *     example 1: sinh(-0.9834330348825909);
  // *     returns 1: -1.1497971402636502
  return (Math.exp(arg) - Math.exp(-arg))/2;
}

/* 
 *  Biquad filter
 * 
 *  Created by Ricard Marxer <email@ricardmarxer.com> on 2010-05-23.
 *  Copyright 2010 Ricard Marxer. All rights reserved.
 *
 */
// Implementation based on:
// http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
function Biquad(type, sampleRate) {
  this.Fs = sampleRate;
  this.type = type;  // type of the filter
  this.parameterType = DSP.Q; // type of the parameter

  this.x_1_l = 0;
  this.x_2_l = 0;
  this.y_1_l = 0;
  this.y_2_l = 0;

  this.x_1_r = 0;
  this.x_2_r = 0;
  this.y_1_r = 0;
  this.y_2_r = 0;

  this.b0 = 1;
  this.a0 = 1;

  this.b1 = 0;
  this.a1 = 0;

  this.b2 = 0;
  this.a2 = 0;

  this.b0a0 = this.b0 / this.a0;
  this.b1a0 = this.b1 / this.a0;
  this.b2a0 = this.b2 / this.a0;
  this.a1a0 = this.a1 / this.a0;
  this.a2a0 = this.a2 / this.a0;

  this.f0 = 3000;   // "wherever it's happenin', man."  Center Frequency or
                    // Corner Frequency, or shelf midpoint frequency, depending
                    // on which filter type.  The "significant frequency".

  this.dBgain = 12; // used only for peaking and shelving filters

  this.Q = 1;       // the EE kind of definition, except for peakingEQ in which A*Q is
                    // the classic EE Q.  That adjustment in definition was made so that
                    // a boost of N dB followed by a cut of N dB for identical Q and
                    // f0/Fs results in a precisely flat unity gain filter or "wire".

  this.BW = -3;     // the bandwidth in octaves (between -3 dB frequencies for BPF
                    // and notch or between midpoint (dBgain/2) gain frequencies for
                    // peaking EQ

  this.S = 1;       // a "shelf slope" parameter (for shelving EQ only).  When S = 1,
                    // the shelf slope is as steep as it can be and remain monotonically
                    // increasing or decreasing gain with frequency.  The shelf slope, in
                    // dB/octave, remains proportional to S for all other values for a
                    // fixed f0/Fs and dBgain.

  this.coefficients = function() {
    var b = [this.b0, this.b1, this.b2];
    var a = [this.a0, this.a1, this.a2];
    return {b: b, a:a};
  };

  this.setFilterType = function(type) {
    this.type = type;
    this.recalculateCoefficients();
  };

  this.setSampleRate = function(rate) {
    this.Fs = rate;
    this.recalculateCoefficients();
  };

  this.setQ = function(q) {
    this.parameterType = DSP.Q;
    this.Q = Math.max(Math.min(q, 115.0), 0.001);
    this.recalculateCoefficients();
  };

  this.setBW = function(bw) {
    this.parameterType = DSP.BW;
    this.BW = bw;
    this.recalculateCoefficients();
  };

  this.setS = function(s) {
    this.parameterType = DSP.S;
    this.S = Math.max(Math.min(s, 5.0), 0.0001);
    this.recalculateCoefficients();
  };

  this.setF0 = function(freq) {
    this.f0 = freq;
    this.recalculateCoefficients();
  }; 
 
  this.setDbGain = function(g) {
    this.dBgain = g;
    this.recalculateCoefficients();
  };

  this.recalculateCoefficients = function() {
    var A;
    if (type === DSP.PEAKING_EQ || type === DSP.LOW_SHELF || type === DSP.HIGH_SHELF ) {
      A = Math.pow(10, (this.dBgain/40));  // for peaking and shelving EQ filters only
    } else {
      A  = Math.sqrt( Math.pow(10, (this.dBgain/20)) );   
    }

    var w0 = DSP.TWO_PI * this.f0 / this.Fs;

    var cosw0 = Math.cos(w0);
    var sinw0 = Math.sin(w0);

    var alpha = 0;
   
    switch (this.parameterType) {
      case DSP.Q:
        alpha = sinw0/(2*this.Q);
        break;
           
      case DSP.BW:
        alpha = sinw0 * sinh( Math.LN2/2 * this.BW * w0/sinw0 );
        break;

      case DSP.S:
        alpha = sinw0/2 * Math.sqrt( (A + 1/A)*(1/this.S - 1) + 2 );
        break;
    }

    /**
        FYI: The relationship between bandwidth and Q is
             1/Q = 2*sinh(ln(2)/2*BW*w0/sin(w0))     (digital filter w BLT)
        or   1/Q = 2*sinh(ln(2)/2*BW)             (analog filter prototype)

        The relationship between shelf slope and Q is
             1/Q = sqrt((A + 1/A)*(1/S - 1) + 2)
    */

    var coeff;

    switch (this.type) {
      case DSP.LPF:       // H(s) = 1 / (s^2 + s/Q + 1)
        this.b0 =  (1 - cosw0)/2;
        this.b1 =   1 - cosw0;
        this.b2 =  (1 - cosw0)/2;
        this.a0 =   1 + alpha;
        this.a1 =  -2 * cosw0;
        this.a2 =   1 - alpha;
        break;

      case DSP.HPF:       // H(s) = s^2 / (s^2 + s/Q + 1)
        this.b0 =  (1 + cosw0)/2;
        this.b1 = -(1 + cosw0);
        this.b2 =  (1 + cosw0)/2;
        this.a0 =   1 + alpha;
        this.a1 =  -2 * cosw0;
        this.a2 =   1 - alpha;
        break;

      case DSP.BPF_CONSTANT_SKIRT:       // H(s) = s / (s^2 + s/Q + 1)  (constant skirt gain, peak gain = Q)
        this.b0 =   sinw0/2;
        this.b1 =   0;
        this.b2 =  -sinw0/2;
        this.a0 =   1 + alpha;
        this.a1 =  -2*cosw0;
        this.a2 =   1 - alpha;
        break;

      case DSP.BPF_CONSTANT_PEAK:       // H(s) = (s/Q) / (s^2 + s/Q + 1)      (constant 0 dB peak gain)
        this.b0 =   alpha;
        this.b1 =   0;
        this.b2 =  -alpha;
        this.a0 =   1 + alpha;
        this.a1 =  -2*cosw0;
        this.a2 =   1 - alpha;
        break;

      case DSP.NOTCH:     // H(s) = (s^2 + 1) / (s^2 + s/Q + 1)
        this.b0 =   1;
        this.b1 =  -2*cosw0;
        this.b2 =   1;
        this.a0 =   1 + alpha;
        this.a1 =  -2*cosw0;
        this.a2 =   1 - alpha;
        break;

      case DSP.APF:       // H(s) = (s^2 - s/Q + 1) / (s^2 + s/Q + 1)
        this.b0 =   1 - alpha;
        this.b1 =  -2*cosw0;
        this.b2 =   1 + alpha;
        this.a0 =   1 + alpha;
        this.a1 =  -2*cosw0;
        this.a2 =   1 - alpha;
        break;

      case DSP.PEAKING_EQ:  // H(s) = (s^2 + s*(A/Q) + 1) / (s^2 + s/(A*Q) + 1)
        this.b0 =   1 + alpha*A;
        this.b1 =  -2*cosw0;
        this.b2 =   1 - alpha*A;
        this.a0 =   1 + alpha/A;
        this.a1 =  -2*cosw0;
        this.a2 =   1 - alpha/A;
        break;

      case DSP.LOW_SHELF:   // H(s) = A * (s^2 + (sqrt(A)/Q)*s + A)/(A*s^2 + (sqrt(A)/Q)*s + 1)
        coeff = sinw0 * Math.sqrt( (A^2 + 1)*(1/this.S - 1) + 2*A );
        this.b0 =    A*((A+1) - (A-1)*cosw0 + coeff);
        this.b1 =  2*A*((A-1) - (A+1)*cosw0);
        this.b2 =    A*((A+1) - (A-1)*cosw0 - coeff);
        this.a0 =       (A+1) + (A-1)*cosw0 + coeff;
        this.a1 =   -2*((A-1) + (A+1)*cosw0);
        this.a2 =       (A+1) + (A-1)*cosw0 - coeff;
        break;

      case DSP.HIGH_SHELF:   // H(s) = A * (A*s^2 + (sqrt(A)/Q)*s + 1)/(s^2 + (sqrt(A)/Q)*s + A)
        coeff = sinw0 * Math.sqrt( (A^2 + 1)*(1/this.S - 1) + 2*A );
        this.b0 =    A*((A+1) + (A-1)*cosw0 + coeff);
        this.b1 = -2*A*((A-1) + (A+1)*cosw0);
        this.b2 =    A*((A+1) + (A-1)*cosw0 - coeff);
        this.a0 =       (A+1) - (A-1)*cosw0 + coeff;
        this.a1 =    2*((A-1) - (A+1)*cosw0);
        this.a2 =       (A+1) - (A-1)*cosw0 - coeff;
        break;
    }
   
    this.b0a0 = this.b0/this.a0;
    this.b1a0 = this.b1/this.a0;
    this.b2a0 = this.b2/this.a0;
    this.a1a0 = this.a1/this.a0;
    this.a2a0 = this.a2/this.a0;
  };

  this.process = function(buffer) {
      //y[n] = (b0/a0)*x[n] + (b1/a0)*x[n-1] + (b2/a0)*x[n-2]
      //       - (a1/a0)*y[n-1] - (a2/a0)*y[n-2]

      var len = buffer.length;
      var output = new Float64Array(len);

      for ( var i=0; i<buffer.length; i++ ) {
        output[i] = this.b0a0*buffer[i] + this.b1a0*this.x_1_l + this.b2a0*this.x_2_l - this.a1a0*this.y_1_l - this.a2a0*this.y_2_l;
        this.y_2_l = this.y_1_l;
        this.y_1_l = output[i];
        this.x_2_l = this.x_1_l;
        this.x_1_l = buffer[i];
      }

      return output;
  };

  this.processStereo = function(buffer) {
      //y[n] = (b0/a0)*x[n] + (b1/a0)*x[n-1] + (b2/a0)*x[n-2]
      //       - (a1/a0)*y[n-1] - (a2/a0)*y[n-2]

      var len = buffer.length;
      var output = new Float64Array(len);
     
      for (var i = 0; i < len/2; i++) {
        output[2*i] = this.b0a0*buffer[2*i] + this.b1a0*this.x_1_l + this.b2a0*this.x_2_l - this.a1a0*this.y_1_l - this.a2a0*this.y_2_l;
        this.y_2_l = this.y_1_l;
        this.y_1_l = output[2*i];
        this.x_2_l = this.x_1_l;
        this.x_1_l = buffer[2*i];

        output[2*i+1] = this.b0a0*buffer[2*i+1] + this.b1a0*this.x_1_r + this.b2a0*this.x_2_r - this.a1a0*this.y_1_r - this.a2a0*this.y_2_r;
        this.y_2_r = this.y_1_r;
        this.y_1_r = output[2*i+1];
        this.x_2_r = this.x_1_r;
        this.x_1_r = buffer[2*i+1];
      }

      return output;
  };
}

/* 
 *  Magnitude to decibels
 * 
 *  Created by Ricard Marxer <email@ricardmarxer.com> on 2010-05-23.
 *  Copyright 2010 Ricard Marxer. All rights reserved.
 *
 *  @buffer array of magnitudes to convert to decibels
 *
 *  @returns the array in decibels
 *
 */
DSP.mag2db = function(buffer) {
  var minDb = -120;
  var minMag = Math.pow(10.0, minDb / 20.0);

  var log = Math.log;
  var max = Math.max;
 
  var result = Float64Array(buffer.length);
  for (var i=0; i<buffer.length; i++) {
    result[i] = 20.0*log(max(buffer[i], minMag));
  }

  return result;
};

/* 
 *  Frequency response
 * 
 *  Created by Ricard Marxer <email@ricardmarxer.com> on 2010-05-23.
 *  Copyright 2010 Ricard Marxer. All rights reserved.
 *
 *  Calculates the frequency response at the given points.
 *
 *  @b b coefficients of the filter
 *  @a a coefficients of the filter
 *  @w w points (normally between -PI and PI) where to calculate the frequency response
 *
 *  @returns the frequency response in magnitude
 *
 */
DSP.freqz = function(b, a, w) {
  var i, j;

  if (!w) {
    w = Float64Array(200);
    for (i=0;i<w.length; i++) {
      w[i] = DSP.TWO_PI/w.length * i - Math.PI;
    }
  }

  var result = Float64Array(w.length);
 
  var sqrt = Math.sqrt;
  var cos = Math.cos;
  var sin = Math.sin;
 
  for (i=0; i<w.length; i++) {
    var numerator = {real:0.0, imag:0.0};
    for (j=0; j<b.length; j++) {
      numerator.real += b[j] * cos(-j*w[i]);
      numerator.imag += b[j] * sin(-j*w[i]);
    }

    var denominator = {real:0.0, imag:0.0};
    for (j=0; j<a.length; j++) {
      denominator.real += a[j] * cos(-j*w[i]);
      denominator.imag += a[j] * sin(-j*w[i]);
    }
 
    result[i] =  sqrt(numerator.real*numerator.real + numerator.imag*numerator.imag) / sqrt(denominator.real*denominator.real + denominator.imag*denominator.imag);
  }

  return result;
};

/* 
 *  Graphical Equalizer
 *
 *  Implementation of a graphic equalizer with a configurable bands-per-octave
 *  and minimum and maximum frequencies
 * 
 *  Created by Ricard Marxer <email@ricardmarxer.com> on 2010-05-23.
 *  Copyright 2010 Ricard Marxer. All rights reserved.
 *
 */
function GraphicalEq(sampleRate) {
  this.FS = sampleRate;
  this.minFreq = 40.0;
  this.maxFreq = 16000.0;

  this.bandsPerOctave = 1.0;

  this.filters = [];
  this.freqzs = [];

  this.calculateFreqzs = true;

  this.recalculateFilters = function() {
    var bandCount = Math.round(Math.log(this.maxFreq/this.minFreq) * this.bandsPerOctave/ Math.LN2);

    this.filters = [];
    for (var i=0; i<bandCount; i++) {
      var freq = this.minFreq*(Math.pow(2, i/this.bandsPerOctave));
      var newFilter = new Biquad(DSP.PEAKING_EQ, this.FS);
      newFilter.setDbGain(0);
      newFilter.setBW(1/this.bandsPerOctave);
      newFilter.setF0(freq);
      this.filters[i] = newFilter;
      this.recalculateFreqz(i);
    }
  };

  this.setMinimumFrequency = function(freq) {
    this.minFreq = freq;
    this.recalculateFilters();
  };

  this.setMaximumFrequency = function(freq) {
    this.maxFreq = freq;
    this.recalculateFilters();
  };

  this.setBandsPerOctave = function(bands) {
    this.bandsPerOctave = bands;
    this.recalculateFilters();
  };

  this.setBandGain = function(bandIndex, gain) {
    if (bandIndex < 0 || bandIndex > (this.filters.length-1)) {
      throw "The band index of the graphical equalizer is out of bounds.";
    }

    if (!gain) {
      throw "A gain must be passed.";
    }
   
    this.filters[bandIndex].setDbGain(gain);
    this.recalculateFreqz(bandIndex);
  };
 
  this.recalculateFreqz = function(bandIndex) {
    if (!this.calculateFreqzs) {
      return;
    }

    if (bandIndex < 0 || bandIndex > (this.filters.length-1)) {
      throw "The band index of the graphical equalizer is out of bounds. " + bandIndex + " is out of [" + 0 + ", " + this.filters.length-1 + "]";
    }
       
    if (!this.w) {
      this.w = Float64Array(400);
      for (var i=0; i<this.w.length; i++) {
         this.w[i] = Math.PI/this.w.length * i;
      }
    }
   
    var b = [this.filters[bandIndex].b0, this.filters[bandIndex].b1, this.filters[bandIndex].b2];
    var a = [this.filters[bandIndex].a0, this.filters[bandIndex].a1, this.filters[bandIndex].a2];

    this.freqzs[bandIndex] = DSP.mag2db(DSP.freqz(b, a, this.w));
  };

  this.process = function(buffer) {
    var output = buffer;

    for (var i = 0; i < this.filters.length; i++) {
      output = this.filters[i].process(output);
    }

    return output;
  };

  this.processStereo = function(buffer) {
    var output = buffer;

    for (var i = 0; i < this.filters.length; i++) {
      output = this.filters[i].processStereo(output);
    }

    return output;
  };
}

/**
 * MultiDelay effect by Almer Thie (http://code.almeros.com).
 * Copyright 2010 Almer Thie. All rights reserved.
 * Example: http://code.almeros.com/code-examples/delay-firefox-audio-api/
 *
 * This is a delay that feeds it's own delayed signal back into its circular
 * buffer. Also known as a CombFilter.
 *
 * Compatible with interleaved stereo (or more channel) buffers and
 * non-interleaved mono buffers.
 *
 * @param {Number} maxDelayInSamplesSize Maximum possible delay in samples (size of circular buffer)
 * @param {Number} delayInSamples Initial delay in samples
 * @param {Number} masterVolume Initial master volume. Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 * @param {Number} delayVolume Initial feedback delay volume. Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 *
 * @constructor
 */
function MultiDelay(maxDelayInSamplesSize, delayInSamples, masterVolume, delayVolume) {
  this.delayBufferSamples   = new Float64Array(maxDelayInSamplesSize); // The maximum size of delay
  this.delayInputPointer     = delayInSamples;
  this.delayOutputPointer   = 0;
 
  this.delayInSamples   = delayInSamples;
  this.masterVolume     = masterVolume;
  this.delayVolume     = delayVolume;
}

/**
 * Change the delay time in samples.
 *
 * @param {Number} delayInSamples Delay in samples
 */
MultiDelay.prototype.setDelayInSamples = function (delayInSamples) {
  this.delayInSamples = delayInSamples;
 
  this.delayInputPointer = this.delayOutputPointer + delayInSamples;

  if (this.delayInputPointer >= this.delayBufferSamples.length-1) {
    this.delayInputPointer = this.delayInputPointer - this.delayBufferSamples.length; 
  }
};

/**
 * Change the master volume.
 *
 * @param {Number} masterVolume Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 */
MultiDelay.prototype.setMasterVolume = function(masterVolume) {
  this.masterVolume = masterVolume;
};

/**
 * Change the delay feedback volume.
 *
 * @param {Number} delayVolume Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 */
MultiDelay.prototype.setDelayVolume = function(delayVolume) {
  this.delayVolume = delayVolume;
};

/**
 * Process a given interleaved or mono non-interleaved float value Array and adds the delayed audio.
 *
 * @param {Array} samples Array containing Float values or a Float64Array
 *
 * @returns A new Float64Array interleaved or mono non-interleaved as was fed to this function.
 */
MultiDelay.prototype.process = function(samples) {
  // NB. Make a copy to put in the output samples to return.
  var outputSamples = new Float64Array(samples.length);

  for (var i=0; i<samples.length; i++) {
    // delayBufferSamples could contain initial NULL's, return silence in that case
    var delaySample = (this.delayBufferSamples[this.delayOutputPointer] === null ? 0.0 : this.delayBufferSamples[this.delayOutputPointer]);
   
    // Mix normal audio data with delayed audio
    var sample = (delaySample * this.delayVolume) + samples[i];
   
    // Add audio data with the delay in the delay buffer
    this.delayBufferSamples[this.delayInputPointer] = sample;
   
    // Return the audio with delay mix
    outputSamples[i] = sample * this.masterVolume;
   
    // Manage circulair delay buffer pointers
    this.delayInputPointer++;
    if (this.delayInputPointer >= this.delayBufferSamples.length-1) {
      this.delayInputPointer = 0;
    }
     
    this.delayOutputPointer++;
    if (this.delayOutputPointer >= this.delayBufferSamples.length-1) {
      this.delayOutputPointer = 0; 
    } 
  }
 
  return outputSamples;
};

/**
 * SingleDelay effect by Almer Thie (http://code.almeros.com).
 * Copyright 2010 Almer Thie. All rights reserved.
 * Example: See usage in Reverb class
 *
 * This is a delay that does NOT feeds it's own delayed signal back into its 
 * circular buffer, neither does it return the original signal. Also known as
 * an AllPassFilter(?).
 *
 * Compatible with interleaved stereo (or more channel) buffers and
 * non-interleaved mono buffers.
 *
 * @param {Number} maxDelayInSamplesSize Maximum possible delay in samples (size of circular buffer)
 * @param {Number} delayInSamples Initial delay in samples
 * @param {Number} delayVolume Initial feedback delay volume. Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 *
 * @constructor
 */

function SingleDelay(maxDelayInSamplesSize, delayInSamples, delayVolume) {
  this.delayBufferSamples = new Float64Array(maxDelayInSamplesSize); // The maximum size of delay
  this.delayInputPointer  = delayInSamples;
  this.delayOutputPointer = 0;
 
  this.delayInSamples     = delayInSamples;
  this.delayVolume        = delayVolume;
}

/**
 * Change the delay time in samples.
 *
 * @param {Number} delayInSamples Delay in samples
 */
SingleDelay.prototype.setDelayInSamples = function(delayInSamples) {
  this.delayInSamples = delayInSamples;
  this.delayInputPointer = this.delayOutputPointer + delayInSamples;

  if (this.delayInputPointer >= this.delayBufferSamples.length-1) {
    this.delayInputPointer = this.delayInputPointer - this.delayBufferSamples.length; 
  }
};

/**
 * Change the return signal volume.
 *
 * @param {Number} delayVolume Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 */
SingleDelay.prototype.setDelayVolume = function(delayVolume) {
  this.delayVolume = delayVolume;
};

/**
 * Process a given interleaved or mono non-interleaved float value Array and
 * returns the delayed audio.
 *
 * @param {Array} samples Array containing Float values or a Float64Array
 *
 * @returns A new Float64Array interleaved or mono non-interleaved as was fed to this function.
 */
SingleDelay.prototype.process = function(samples) {
  // NB. Make a copy to put in the output samples to return.
  var outputSamples = new Float64Array(samples.length);

  for (var i=0; i<samples.length; i++) {

    // Add audio data with the delay in the delay buffer
    this.delayBufferSamples[this.delayInputPointer] = samples[i];
   
    // delayBufferSamples could contain initial NULL's, return silence in that case
    var delaySample = this.delayBufferSamples[this.delayOutputPointer];

    // Return the audio with delay mix
    outputSamples[i] = delaySample * this.delayVolume;

    // Manage circulair delay buffer pointers
    this.delayInputPointer++;

    if (this.delayInputPointer >= this.delayBufferSamples.length-1) {
      this.delayInputPointer = 0;
    }
     
    this.delayOutputPointer++;

    if (this.delayOutputPointer >= this.delayBufferSamples.length-1) {
      this.delayOutputPointer = 0; 
    } 
  }
 
  return outputSamples;
};

/**
 * Reverb effect by Almer Thie (http://code.almeros.com).
 * Copyright 2010 Almer Thie. All rights reserved.
 * Example: http://code.almeros.com/code-examples/reverb-firefox-audio-api/
 *
 * This reverb consists of 6 SingleDelays, 6 MultiDelays and an IIRFilter2
 * for each of the two stereo channels.
 *
 * Compatible with interleaved stereo buffers only!
 *
 * @param {Number} maxDelayInSamplesSize Maximum possible delay in samples (size of circular buffers)
 * @param {Number} delayInSamples Initial delay in samples for internal (Single/Multi)delays
 * @param {Number} masterVolume Initial master volume. Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 * @param {Number} mixVolume Initial reverb signal mix volume. Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 * @param {Number} delayVolume Initial feedback delay volume for internal (Single/Multi)delays. Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 * @param {Number} dampFrequency Initial low pass filter frequency. 0 to 44100 (depending on your maximum sampling frequency)
 *
 * @constructor
 */
function Reverb(maxDelayInSamplesSize, delayInSamples, masterVolume, mixVolume, delayVolume, dampFrequency) {
  this.delayInSamples   = delayInSamples;
  this.masterVolume     = masterVolume;
  this.mixVolume       = mixVolume;
  this.delayVolume     = delayVolume;
  this.dampFrequency     = dampFrequency;
 
  this.NR_OF_MULTIDELAYS = 6;
  this.NR_OF_SINGLEDELAYS = 6;
 
  this.LOWPASSL = new IIRFilter2(DSP.LOWPASS, dampFrequency, 0, 44100);
  this.LOWPASSR = new IIRFilter2(DSP.LOWPASS, dampFrequency, 0, 44100);
 
  this.singleDelays = [];
  
  var i, delayMultiply;

  for (i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
    delayMultiply = 1.0 + (i/7.0); // 1.0, 1.1, 1.2...
    this.singleDelays[i] = new SingleDelay(maxDelayInSamplesSize, Math.round(this.delayInSamples * delayMultiply), this.delayVolume);
  }
 
  this.multiDelays = [];

  for (i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
    delayMultiply = 1.0 + (i/10.0); // 1.0, 1.1, 1.2... 
    this.multiDelays[i] = new MultiDelay(maxDelayInSamplesSize, Math.round(this.delayInSamples * delayMultiply), this.masterVolume, this.delayVolume);
  }
}

/**
 * Change the delay time in samples as a base for all delays.
 *
 * @param {Number} delayInSamples Delay in samples
 */
Reverb.prototype.setDelayInSamples = function (delayInSamples){
  this.delayInSamples = delayInSamples;

  var i, delayMultiply;
 
  for (i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
    delayMultiply = 1.0 + (i/7.0); // 1.0, 1.1, 1.2...
    this.singleDelays[i].setDelayInSamples( Math.round(this.delayInSamples * delayMultiply) );
  }
   
  for (i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
    delayMultiply = 1.0 + (i/10.0); // 1.0, 1.1, 1.2...
    this.multiDelays[i].setDelayInSamples( Math.round(this.delayInSamples * delayMultiply) );
  }
};

/**
 * Change the master volume.
 *
 * @param {Number} masterVolume Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 */
Reverb.prototype.setMasterVolume = function (masterVolume){
  this.masterVolume = masterVolume;
};

/**
 * Change the reverb signal mix level.
 *
 * @param {Number} mixVolume Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 */
Reverb.prototype.setMixVolume = function (mixVolume){
  this.mixVolume = mixVolume;
};

/**
 * Change all delays feedback volume.
 *
 * @param {Number} delayVolume Float value: 0.0 (silence), 1.0 (normal), >1.0 (amplify)
 */
Reverb.prototype.setDelayVolume = function (delayVolume){
  this.delayVolume = delayVolume;
 
  var i;

  for (i = 0; i<this.NR_OF_SINGLEDELAYS; i++) {
    this.singleDelays[i].setDelayVolume(this.delayVolume);
  } 
 
  for (i = 0; i<this.NR_OF_MULTIDELAYS; i++) {
    this.multiDelays[i].setDelayVolume(this.delayVolume);
  } 
};

/**
 * Change the Low Pass filter frequency.
 *
 * @param {Number} dampFrequency low pass filter frequency. 0 to 44100 (depending on your maximum sampling frequency)
 */
Reverb.prototype.setDampFrequency = function (dampFrequency){
  this.dampFrequency = dampFrequency;
 
  this.LOWPASSL.set(dampFrequency, 0);
  this.LOWPASSR.set(dampFrequency, 0); 
};

/**
 * Process a given interleaved float value Array and copies and adds the reverb signal.
 *
 * @param {Array} samples Array containing Float values or a Float64Array
 *
 * @returns A new Float64Array interleaved buffer.
 */
Reverb.prototype.process = function (interleavedSamples){ 
  // NB. Make a copy to put in the output samples to return.
  var outputSamples = new Float64Array(interleavedSamples.length);
 
  // Perform low pass on the input samples to mimick damp
  var leftRightMix = DSP.deinterleave(interleavedSamples);
  this.LOWPASSL.process( leftRightMix[DSP.LEFT] );
  this.LOWPASSR.process( leftRightMix[DSP.RIGHT] ); 
  var filteredSamples = DSP.interleave(leftRightMix[DSP.LEFT], leftRightMix[DSP.RIGHT]);

  var i;

  // Process MultiDelays in parallel
  for (i = 0; i<this.NR_OF_MULTIDELAYS; i++) {
    // Invert the signal of every even multiDelay
    outputSamples = DSP.mixSampleBuffers(outputSamples, this.multiDelays[i].process(filteredSamples), 2%i === 0, this.NR_OF_MULTIDELAYS);
  }
 
  // Process SingleDelays in series
  var singleDelaySamples = new Float64Array(outputSamples.length);
  for (i = 0; i<this.NR_OF_SINGLEDELAYS; i++) {
    // Invert the signal of every even singleDelay
    singleDelaySamples = DSP.mixSampleBuffers(singleDelaySamples, this.singleDelays[i].process(outputSamples), 2%i === 0, 1);
  }

  // Apply the volume of the reverb signal
  for (i = 0; i<singleDelaySamples.length; i++) {
    singleDelaySamples[i] *= this.mixVolume;
  }
 
  // Mix the original signal with the reverb signal
  outputSamples = DSP.mixSampleBuffers(singleDelaySamples, interleavedSamples, 0, 1);

  // Apply the master volume to the complete signal
  for (i = 0; i<outputSamples.length; i++) {
    outputSamples[i] *= this.masterVolume;
  }
   
  return outputSamples;
};

if (module && typeof module.exports !== 'undefined') {
  module.exports = {
    DSP: DSP,
    DFT: DFT,
    FFT: FFT,
    RFFT: RFFT,
    Sampler: Sampler,
    Oscillator: Oscillator,
    ADSR: ADSR,
    IIRFilter: IIRFilter,
    IIRFilter2: IIRFilter2,
    WindowFunction: WindowFunction,
    sinh: sinh,
    Biquad: Biquad,
    GraphicalEq: GraphicalEq,
    MultiDelay: MultiDelay,
    SingleDelay: SingleDelay,
    Reverb: Reverb
  };
}
},{}],3:[function(require,module,exports){
module.exports = Rectangle;

function Rectangle(x,y,w,h){
	this.set(x,y,w,h);
}

Rectangle.prototype = {
	set: function(x,y,w,h){
		x |= 0;
		y |= 0;
		w |= 0;
		h |= 0;
		this.x0 = x;
		this.y0 = y;
		this.w = w;
		this.h = h;
		this.x1 = x + w - 1;
		this.y1 = y + h - 1;
		this.area = w*h;
	},
	excludesRect: function(x0,y0,x1,y1){
		return x1 < this.x0 || y1 < this.y0 || x0 > this.x1 || y0 > this.y1;
	},
	excludesPoint: function(x,y){
		return x < this.x0 || y < this.y0 || x > this.x1 || y > this.y1;
	},
	expandToPoint: function(x,y){
		var x0 = Math.min(this.x0, x);
		var y0 = Math.min(this.y0, y);
		this.set(
			x0,
			y0,
			Math.max(this.x1, x) - x0 + 1,
			Math.max(this.y1, y) - y0 + 1
		);
	}
};
},{}],4:[function(require,module,exports){
var code = '';

exports.codeset = function(codeString){
	code = codeString;
};

exports.codeget = function(){
	return code;
};

exports.run = function(){
	eval.call(null, code);
};
},{}],5:[function(require,module,exports){
exports.defaultPalette = function(){
	return [
		0x000000, // 0
		0x1d2b53, // 1
		0x7e2553, // 2
		0x008751, // 3

		0xab5236, // 4
		0x5f574f, // 5
		0xc2c3c7, // 6
		0xfff1e8, // 7

		0xff004d, // 8
		0xffa300, // 9
		0xfff024, // 10
		0x00e756, // 11

		0x29adff, // 12
		0x83769c, // 13
		0xff77a8, // 14
		0xffccaa  // 15
	];
};

exports.int2hex = function(int){
	var hex = int.toString(16);
	// left pad
	while(hex.length < 6){
		hex = "0" + hex;
	}
	hex = '#' + hex;

	return hex;
}
},{}],6:[function(require,module,exports){
var utils = require('./utils');

var coloredFontCanvases = [];
var coloredSpecialCharsCanvases = [];
var fontX = 4;
var fontY = 5;
var paletteHex = [];
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="a+-!{}<>;_|&*~%#';
var specialChars = "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x8b\x8c\x8d\x8e\x8f\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99";
var dirty = true; // Should redraw!

exports.init = function(palHex){
	exports.changePalette(palHex);
};

exports.changePalette = function(palHex){
	paletteHex = palHex.slice();
	dirty = true;
};

function redrawCanvases(){
	var backgroundColor = [0,0,0,0];
	for(var i=0; i<paletteHex.length; i++){
		var rgba = utils.hexToRgb(paletteHex[i]);
		rgba[3] = 255;

		var colorMap = {
			'#': rgba,
			' ': backgroundColor
		};

		// Normal font
		coloredFontCanvases[i] = utils.createCanvasFromAscii([
			"### ###  ## ##  ### ###  ## # # ### ### # # #   ### ##   ## ###  #  ###  ## ### # # # # # # # # # # ### ### ##  ### ### # # ### #   ### ### ###          #  ###  #   #  ##   ##       # #       # #  #           #   ## ##    # #            #   ## # #     # # # #",
			"# # # # #   # # #   #   #   # #  #   #  # # #   ### # # # # # # # # # # #    #  # # # # # # # # # #   # # #  #    #   # # # #   #     # # # # #         # #   # #     # #     #  #   #   #  ### # # #    #       #   #   #   #   #    #      #  #    #    #   # ###",
			"### ##  #   # # ##  ##  #   ###  #   #  ##  #   # # # # # # ### # # ##  ###  #  # # # # # #  #  ###  #  # #  #  ###  ## ### ### ###   # ### ###              ## #     # #     #      #   #              ### ###  #  #     # #     #          #   #  ### ###  #  # #",
			"# # # # #   # # #   #   # # # #  #   #  # # #   # # # # # # #   ##  # #   #  #  # # ### ### # #   # #   # #  #  #     #   #   # # #   # # #   #      #          #     # #     #  #   #   #  ###          #           #   #   #   #    #      #  # #  #  #   #   ###",
			"# # ###  ## ### ### #   ### # # ### ##  # # ### # # # # ##  #    ## # # ##   #   ##  #  ### # # ### ### ### ### ### ###   # ### ###   # ###   #  #  #        #   #   #  ##   ##     #     #                      #   ## ##    # #    #  ###  #  ### # #     # # # #"
		], colorMap);

		// Special chars
		coloredSpecialCharsCanvases[i] = utils.createCanvasFromAscii([
			"####### # # # # #     #  #####  #   #     #       ###    ## ##    ###     ###     ###    #####  #######    ###   #####     #             #####     #     #####   #####                   #####  ####### # # # # ",
			"#######  # # #  ####### ##   ##   #   #   ####   ### #   #####   ## ##    ###    #####  ###  ## # ### #    #    ##   ##   ###           ##  ###   ###     ###   ### ### # #     #   #   ## # ##         # # # # ",
			"####### # # # # # ### # ##   ## #   #     ###    #####   #####  ### ###  #####  ####### ##   ## #######    #    ## # ##  #####  # # # # ##   ## #######    #    ##   ##  #  # #  # # #  ### ### ####### # # # # ",
			"#######  # # #  # ### # ### ###   #   #  ####    #####    ###    ## ##    ###    # # #  ###  ## #     #  ###    ##   ##   ###           ##  ###  #####    ###   ##   ##      #    #   # ## # ##         # # # # ",
			"####### # # # #  #####   #####  #   #       #     ###      #      ###     # #    # ###   #####  #######  ###     #####     #             #####   #   #   #####   #####                   #####  ####### # # # # "
		], colorMap);
	}
}

exports.draw = function(ctx, text, x, y, col){
	if(dirty){
		redrawCanvases();
		dirty = false;
	}

	var position = 0;
	for(var i=0; i<text.length; i++){
		var index = chars.indexOf(text[i]);
		if(index !== -1){
			ctx.drawImage(
				coloredFontCanvases[col],
				index * fontX, 0,
				fontX, fontY,
				x + fontX * position, y,
				fontX, fontY
			);
		} else if((index = specialChars.indexOf(text[i])) !== -1){
			ctx.drawImage(
				coloredSpecialCharsCanvases[col],
				index * fontX * 2, 0,
				fontX * 2, fontY,
				x + fontX * position, y,
				fontX * 2, fontY
			);
			position++;
		}
		position++;
	}
};

},{"./utils":14}],7:[function(require,module,exports){
var input = require('./input');
var mouse = require('./mouse');
var utils = require('./utils');
var font = require('./font');
var math = require('./math');
var colors = require('./colors');
var sfx = require('./sfx');
var pixelops = require('./pixelops');
var code = require('./code');
var music = require('./music');
var Rectangle = require('./Rectangle');

var cellsizeX = 8; // pixels
var cellsizeY = 8; // pixels
var screensizeX = 128; // pixels
var screensizeY = 128; // pixels
var mapSizeX = 128; // cells
var mapSizeY = 32; // cells
var spriteSheetSizeX = 16; // sprites
var spriteSheetSizeY = 16; // sprites
var paletteSize = 16; // colors

// Clip state
var clipRect = new Rectangle(0,0,screensizeX,screensizeY);

// DOM elements
var container;
var canvases = [];

var mapData = utils.zeros(mapSizeX * mapSizeY);
var mapDataDirty = utils.zeros(mapSizeX * mapSizeY); // dirtiness per cell
var mapDirty = true; // is all of the map dirty?
var mapCacheCanvas;
var mapCacheContext;
var spriteSheetCanvas;
var spriteSheetContext;
var spriteSheetDirtyRect = new Rectangle();
var spriteFlags;
var spriteSheetPixels;
var ctx;
var _time = 0;
var _startTime = 0;
var camX = 0;
var camY = 0;
var palette;
var paletteHex;
var defaultColor = 0;
var transparentColors = utils.zeros(paletteSize).map(function(){ return false; });
transparentColors[0] = true;
var loaded = false; // Loaded state
var _alpha = 0;
var pixelPerfectMode = 0;
var autoFit = false;
var responsive = false;
var responsiveRect = new Rectangle(0,0,128,128);
var gameTitle = 'game';
var soundFixed = false;

exports.cartridge = function(options){
	autoFit = options.autoFit !== undefined ? options.autoFit : true;
	responsive = options.responsive !== undefined ? options.responsive : false;
	pixelPerfectMode = options.pixelPerfect !== undefined ? options.pixelPerfect : 0;
	var numCanvases = options.layers !== undefined ? options.layers : 1;
	container = options.containerId ? document.getElementById(options.containerId) : null;
	var html = '';
	for(var i=0; i<numCanvases; i++){
		html += '<canvas class="cartridgeCanvas" id="cartridgeCanvas'+i+'" width="' + screensizeX + '" height="' + screensizeY + '"' + (i === 0 ? ' moz-opaque' : '') + '></canvas>';
	}
	container.innerHTML = html;

	for(var i=0; i<numCanvases; i++){
		var c = document.getElementById('cartridgeCanvas' + i);
		c.oncontextmenu = function(){
			return false;
		};
		canvases.push(c);
		if(i !== 0){
			c.style.pointerEvents = 'none';
		}
		c.style.position = 'absolute';
		utils.disableImageSmoothing(c.getContext('2d'));
	}

	setCellSize(cellsizeX, cellsizeY, spriteSheetSizeX, spriteSheetSizeY);
	setPalette(options.palette || colors.defaultPalette());

	// Add style tag
	var style = document.createElement('style');
	style.innerHTML = [
		".cartridgeCanvas {",
		"image-rendering: -moz-crisp-edges;",
		"image-rendering: -webkit-crisp-edges;",
		"image-rendering: pixelated;",
		"}"
	].join('\n');
	document.getElementsByTagName('head')[0].appendChild(style);

	// Set main canvas
	canvas(0);

	input.init(canvases);
	mouse.init(canvases);
	pixelops.init(canvases[0]); // todo: support multiple

	if(autoFit){
		// Resize (fit) the canvas when the container changes size
		var resizeHandler = function(){
			fit(pixelPerfectMode, responsive);
		};
		resizeHandler();
		window.addEventListener('resize', resizeHandler);
		window.addEventListener('mozfullscreenchange', resizeHandler);
	}

	// Start render loop
	var currentTime = 0;
	var t0 = 0;
	var t1 = 0;
	var dt0 = Math.floor(1 / 30 * 1000);
	var dt1 = Math.floor(1 / 60 * 1000);
	var accumulator0 = 0;
	var accumulator1 = 0;
	function render(newTime){
		if (currentTime) {
			var frameTime = newTime - currentTime;
			if ( frameTime > 250 )
				frameTime = 250;
			accumulator0 += frameTime;
			while ( accumulator0 >= dt0 ){
				_time = t0;
				t0 += dt0;
				accumulator0 -= dt0;
				_alpha = accumulator0 / dt0;
				if(loaded && typeof(_update) === 'function'){
					runUserFunction(_update);
				}
			}
			accumulator1 += frameTime;
			while ( accumulator1 >= dt1 ){
				_time = t1;
				t1 += dt1;
				accumulator1 -= dt1;
				_alpha = accumulator1 / dt1;
				if(loaded && typeof(_update60) === 'function'){
					runUserFunction(_update60);
				}
			}
		}
		if(_startTime === -1){
			_startTime = newTime;
		}
		_time = newTime - _startTime;
		if(loaded && typeof(_draw) === 'function'){
			runUserFunction(_draw);
		}

		// Flush any remaining pixelops
		pixelops.flush();

		currentTime = newTime;
		input.update();
		music.update();
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);

	// Init font
	font.init(paletteHex);

	utils.iosAudioFix(canvases[0], function(){
		// restart sound nodes here
		sfx.iosFix();
		music.iosFix();
		soundFixed = true;

		if(loaded && typeof(_sound) === 'function'){
			runUserFunction(_sound);
		}
	});
};

exports.run = function(){
	if(loaded){
		runKill();
	}
	_startTime = -1;
	try {
		code.run();
	} catch(err){
		if(typeof(_error) === 'function'){
			_error(utils.getErrorInfo(err));
		}
	}
	runInit();
};

function runInit(){
	loaded = true;
	if(typeof(_init) === 'function'){
		runUserFunction(_init);
	}
	if(soundFixed){
		if(loaded && typeof(_sound) === 'function'){
			runUserFunction(_sound);
		}
	}
}
function runKill(){
	loaded = false;
	if(typeof(_kill) === 'function'){
		runUserFunction(_kill);
	}
}

function setCellSize(
	newCellWidth,
	newCellHeight,
	newSpriteSheetWidth,
	newSpriteSheetHeight
){
	newCellWidth = newCellWidth | 0;
	newCellHeight = newCellHeight | 0;
	newSpriteSheetWidth = newSpriteSheetWidth | 0;
	newSpriteSheetHeight = newSpriteSheetHeight | 0;

	var newSpriteSheetPixels = utils.zeros(newSpriteSheetWidth * newSpriteSheetHeight * newCellWidth * newCellHeight);
	if(spriteSheetPixels){
		// Copy pixel data to new dimensions
		var minWidth = Math.min(spriteSheetSizeX*cellsizeX, newSpriteSheetWidth*newCellWidth);
		var minHeight = Math.min(spriteSheetSizeY*cellsizeY, newSpriteSheetHeight*newCellHeight);
		for(var i=0; i<minWidth; i++){
			for(var j=0; j<minHeight; j++){
				newSpriteSheetPixels[i+j*newSpriteSheetWidth*newCellWidth] = spriteSheetPixels[i+j*spriteSheetSizeX*cellsizeX];
			}
		}
	}
	spriteSheetPixels = newSpriteSheetPixels;

	// Map references sprites, which are now wrong. Need to fix!
	for(var i=0; i<mapSizeX; i++){
		for(var j=0; j<mapSizeY; j++){
			var oldSpriteIndex = mget(i, j);
			var oldX = ssx(oldSpriteIndex);
			var oldY = ssy(oldSpriteIndex);
			var newSpriteIndex = oldX + oldY * newSpriteSheetWidth;
			if(newSpriteIndex >= newSpriteSheetWidth * newSpriteSheetHeight) continue;
			mset(i, j, newSpriteIndex);
		}
	}

	cellsizeX = newCellWidth;
	cellsizeY = newCellHeight;

	spriteSheetSizeX = newSpriteSheetWidth;
	spriteSheetSizeY = newSpriteSheetHeight;

	var maxSprites = spriteSheetSizeX * spriteSheetSizeY;
	if(!spriteFlags) spriteFlags = utils.zeros(maxSprites);
	while(spriteFlags.length < maxSprites) spriteFlags.push(0);
	while(spriteFlags.length > maxSprites) spriteFlags.pop();

	// (re)init spritesheet canvas
	spriteSheetCanvas = utils.createCanvas(spriteSheetSizeX * cellsizeX, spriteSheetSizeY * cellsizeY);
	spriteSheetContext = spriteSheetCanvas.getContext('2d');

	// (re)init map cache
	mapCacheCanvas = utils.createCanvas(mapSizeX * cellsizeX, mapSizeY * cellsizeY);
	mapCacheContext = mapCacheCanvas.getContext('2d');

	spriteSheetDirtyRect.set(0,0,spriteSheetCanvas.width,spriteSheetCanvas.height);
	mapDirty = true;
}

// Redraw the whole spritesheet
function flushSpriteSheet(){
	if(!spriteSheetDirtyRect.area) return;

	var w = spriteSheetSizeX*cellsizeX;
	var h = spriteSheetSizeY*cellsizeY;
	spriteSheetContext.clearRect(spriteSheetDirtyRect.x0, spriteSheetDirtyRect.y0, spriteSheetDirtyRect.w, spriteSheetDirtyRect.h);
	var imageData = spriteSheetContext.createImageData(spriteSheetDirtyRect.w, spriteSheetDirtyRect.h);
	for(var i=0; i<spriteSheetDirtyRect.w; i++){
		for(var j=0; j<spriteSheetDirtyRect.h; j++){
			var col = spriteSheetPixels[(j+spriteSheetDirtyRect.y0) * w + (i+spriteSheetDirtyRect.x0)];
			var dec = palette[col];
			var r = utils.decToR(dec);
			var g = utils.decToG(dec);
			var b = utils.decToB(dec);
			var p = 4 * (j * spriteSheetDirtyRect.w + i);
			imageData.data[p + 0] = utils.decToR(dec);
			imageData.data[p + 1] = utils.decToG(dec);
			imageData.data[p + 2] = utils.decToB(dec);
			imageData.data[p + 3] = transparentColors[col] ? 0 : 255;
		}
	}
	spriteSheetContext.putImageData(imageData, spriteSheetDirtyRect.x0, spriteSheetDirtyRect.y0);
	spriteSheetDirtyRect.set();
}

function setPalette(p){
	palette = p.slice(0);
	paletteHex = palette.map(colors.int2hex);
	mapDirty = true;
	font.changePalette(paletteHex);

	// Check spritesheet for invalid colors
	for(var i=0; i<spriteSheetSizeX*cellsizeX; i++){
		for(var j=0; j<spriteSheetSizeY*cellsizeY; j++){
			if(sget(i,j) >= p.length){
				sset(i,j,0); // Just set it to empty
			}
		}
	}
	spriteSheetDirtyRect.set(0,0,spriteSheetCanvas.width,spriteSheetCanvas.height);
}

exports.palset = function(n, hexColor){
	var newPalette = palette.slice(0);

	if(hexColor === undefined){
		newPalette[n] = colors.defaultPalette()[n] || 0;
	} else if(hexColor === -1){
		// Clamp the palette
		newPalette = newPalette.slice(0,n);
	} else {
		while(newPalette.length < n) newPalette.push(0x000000);
		newPalette[n] = hexColor;
	}

	setPalette(newPalette);
};

exports.palget = function(n){
	return palette[n];
};

function resizeCanvases(){
	for(var i=0; i < canvases.length; i++){
		canvases[i].width = screensizeX;
		canvases[i].height = screensizeY;
	}
	if(autoFit){
		fit(pixelPerfectMode, responsive);
	}
	pixelops.resize(canvases[0]);

	// Reset clip state
	clip();
}

exports.alpha = function(){ return _alpha; }; // for interpolation

// TODO: rename to wget/set() ?
exports.width = function(newWidth){
	if(newWidth !== undefined){
		newWidth = newWidth | 0;
		if(screensizeX === newWidth){
			// unchanged
			return;
		}
		screensizeX = newWidth;
		resizeCanvases();
	}
	return screensizeX;
};

// TODO: rename to hget/set() ?
exports.height = function(newHeight){
	if(newHeight !== undefined){
		newHeight = newHeight | 0;
		if(screensizeY === newHeight){
			// unchanged
			return;
		}
		screensizeY = newHeight;
		resizeCanvases();
	}
	return screensizeY;
};

// TODO: rename to cwget/set() ?
exports.cellwidth = function(newCellWidth){
	if(newCellWidth !== undefined){
		if(newCellWidth === cellsizeX){
			// unchanged
			return;
		}
		setCellSize(newCellWidth, cellsizeY, spriteSheetSizeX, spriteSheetSizeY);
	} else {
		return cellsizeX;
	}
};

// TODO: rename to chget/set() ?
exports.cellheight = function(newCellHeight){
	if(newCellHeight !== undefined){
		if(newCellHeight === cellsizeY){
			// unchanged
			return;
		}
		setCellSize(cellsizeX, newCellHeight, spriteSheetSizeX, spriteSheetSizeY);
	} else {
		return cellsizeY;
	}
};

exports.cls = function(){
	pixelops.beforeChange();
	ctx.clearRect(-camX,-camY,screensizeX,screensizeY);
};

exports.time = function(){
	return _time / 1000;
};

exports.color = function(col){
	defaultColor = col;
};

exports.palt = function(col, t){
	if(t !== undefined){
		transparentColors[col] = t;
	} else {
		return transparentColors[col];
	}
};

exports.rectfill = function rectfill(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;

	// Full clip
	if(clipRect.excludesRect(x0,y0,x1,y1)){
		return;
	}

	// Reduce it to the clip area
	x0 = Math.max(x0, clipRect.x0);
	y0 = Math.max(y0, clipRect.y0);
	x1 = Math.min(x1, clipRect.x1);
	y1 = Math.min(y1, clipRect.y1);

	var w = x1 - x0 + 1;
	var h = y1 - y0 + 1;

	if(w > 0 && h > 0){
		pixelops.beforeChange();
		ctx.fillStyle = paletteHex[col];
		ctx.fillRect(x0, y0, w, h);
	}
};

exports.rect = function rect(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;

	// full clip
	if(clipRect.excludesRect(x0,y0,x1,y1)){
		return;
	}

	for(var x=x0; x<=x1; x++){
		exports.pset(x,y0,col);
		exports.pset(x,y1,col);
	}

	for(var y=y0; y<=y1; y++){
		exports.pset(x0,y,col);
		exports.pset(x1,y,col);
	}
};

exports.clip = function(x,y,w,h){
	if(x === undefined){
		x = y = 0;
		w = screensizeX;
		h = screensizeY;
	}
	x = x | 0;
	y = y | 0;
	w = w | 0;
	h = h | 0;

	clipRect.set(x,y,w,h);
};

exports.canvas = function canvas(n){
	ctx = canvases[n].getContext('2d');
};

exports.camera = function camera(x, y){
	x = x | 0;
	y = y | 0;
	if(camX === x && camY === y) return;

	pixelops.beforeChange();
	ctx.translate(x - camX, y - camY);
	camX = x;
	camY = y;
};

exports.map = function map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer){
	pixelops.beforeChange();
	layer = layer === undefined ? 0 : layer;

	cel_x = cel_x | 0;
	cel_y = cel_y | 0;
	sx = sx | 0;
	sy = sy | 0;
	cel_w = cel_w | 0;
	cel_h = cel_h | 0;

	var i,j;

	var x0 = sx;
	var x1 = sx + cel_w * cellwidth();
	var y0 = sy;
	var y1 = sy + cel_h * cellheight();
	if(clipRect.excludesRect(x0,y0,x1,y1)){
		return; // fully outside the clip area
	}

	if(layer === 0){
		// Update invalidated map cache
		if(mapDirty){
			clearMapCacheCanvas();
			for(i=0; i<mapSizeX; i++){
				for(j=0; j<mapSizeY; j++){
					updateMapCacheCanvas(i,j,false);
				}
			}
			mapDirty = false;
		}
		for(i=0; i<mapSizeX; i++){
			for(j=0; j<mapSizeY; j++){
				if(mapDataDirty[j * mapSizeX + i]){
					updateMapCacheCanvas(i,j,true);
					mapDataDirty[j * mapSizeX + i] = 0;
				}
			}
		}

		var _sx = cel_x * cellsizeX; // Clip start
		var _sy = cel_y * cellsizeY;
		var _x = sx; // Draw position
		var _y = sy;
		var _swidth = cel_w * cellsizeX; // Clip end
		var _sheight = cel_h * cellsizeY;
		var _width = _swidth; // Width on target canvas
		var _height = _sheight;
		ctx.drawImage(mapCacheCanvas,_sx,_sy,_swidth,_sheight,_x,_y,_width,_height);
	} else {
		// Draw only matching sprites
		for(i=0; i<cel_w; i++){
			for(j=0; j<cel_h; j++){
				var spriteNumber = mget(i, j);
				var flags = fget(spriteNumber);
				if((layer & flags) === layer){
					spr(spriteNumber, sx + i * cellsizeX, sy + j * cellsizeY);
				}
			}
		}
	}
};

// Returns the sprite X position in the spritesheet
function ssx(n){
	return n % spriteSheetSizeX;
}

// Returns the sprite Y position in the spritesheet
function ssy(n){
	return Math.floor(n / spriteSheetSizeX) % (spriteSheetSizeX * spriteSheetSizeY);
}

// Render a sprite at position X,Y in the sprite sheet
exports.spr2 = function(nx, ny, x, y, w, h, flip_x, flip_y){
	var n = ny * spriteSheetSizeX + nx;
	return spr(n, x, y, w, h, flip_x, flip_y);
};

// Render a sprite given its id
exports.spr = function spr(n, x, y, w, h, flip_x, flip_y){
	pixelops.beforeChange();
	flushSpriteSheet();

	w = w !== undefined ? w : 1;
	h = h !== undefined ? h : 1;
	flip_x = flip_x !== undefined ? flip_x : false;
	flip_y = flip_y !== undefined ? flip_y : false;

	x = x | 0;
	y = y | 0;
	w = w | 0;
	h = h | 0;

	var sourceSizeX = cellsizeX * w;
	var sourceSizeY = cellsizeY * h;
	var destSizeX = sourceSizeX;
	var destSizeY = sourceSizeY;
	var destX = x;
	var destY = y;

	var sourceX = ssx(n) * cellsizeX;
	var sourceY = ssy(n) * cellsizeY;

	// Clip lower
	if(destX < clipRect.x0){
		sourceX = sourceX + clipRect.x0 - destX;
		destX = clipRect.x0;
	}
	if(destY < clipRect.y0){
		sourceY = sourceY + clipRect.y0 - destY;
		destY = clipRect.y0;
	}

	// TODO: clip upper

	ctx.save();
	ctx.translate(
		destX + (flip_x ? sourceSizeX : 0),
		destY + (flip_y ? sourceSizeY : 0)
	);
	ctx.scale(flip_x ? -1 : 1, flip_y ? -1 : 1);
	ctx.drawImage(
		spriteSheetCanvas,
		sourceX, sourceY,
		sourceSizeX, sourceSizeY,
		0, 0,
		destSizeX, destSizeY
	);
	ctx.restore();
};

// Get sprite flags
exports.fget = function(n,bitPosition){
	var flags = spriteFlags[n];
	if(bitPosition !== undefined){
		return !!(flags & (1 << bitPosition));
	}
	return flags;
};

// Set sprite flags
exports.fset = function(n, flags, t){
	var newFlags;
	if(t !== undefined){
		newFlags = spriteFlags[n];
		var bit = (1 << flags);
		if(t){
			newFlags |= bit;
		} else {
			newFlags &= (~bit);
		}
	} else {
		newFlags = flags;
	}
	spriteFlags[n] = newFlags;
};

exports.assert = function(condition, message){
	if(!condition){
		message = message !== undefined ? message : "Assertion failed";
		throw new Error(message);
	}
};

// Get pixel color
exports.pget = (function(){
	var data = new Uint8Array(3);
	return function(x, y){
		x = x | 0;
		y = y | 0;
		pixelops.pget(x,y,data);
		var col = utils.rgbToDec(data[0], data[1], data[2]);
		var result = palette.indexOf(col);
		return result === -1 ? 0 : result;
	};
})();

// Set pixel color
exports.pset = function(x, y, col){
	x = x | 0;
	y = y | 0;
	col = col | 0;

	if(clipRect.excludesPoint(x,y)) return;

	// new style
	var dec = palette[col];
	var r = utils.decToR(dec);
	var g = utils.decToG(dec);
	var b = utils.decToB(dec);
	pixelops.pset(x,y,r,g,b);
};

// Get spritesheet pixel color
exports.sget = function(x, y){
	x = x | 0;
	y = y | 0;
	var w = spriteSheetSizeX * cellsizeX;
	return spriteSheetPixels[y * w + x];
};

// Set spritesheet size
exports.ssset = function(n){
	setCellSize(cellsizeX, cellsizeY, n, n);
};

// Get spritesheet size
exports.ssget = function(){
	return spriteSheetSizeX;
};

// Set spritesheet pixel color
exports.sset = function(x, y, col){
	x = x | 0;
	y = y | 0;
	col = col !== undefined ? col : defaultColor;

	var w = spriteSheetSizeX * cellsizeX;
	spriteSheetPixels[y * w + x] = col;
	if(spriteSheetDirtyRect.area){
		spriteSheetDirtyRect.expandToPoint(x,y);
	} else {
		spriteSheetDirtyRect.set(x,y,1,1);
	}

	mapDirty = true; // TODO: Only invalidate matching map positions
};

// Game title
exports.title = function(newTitle){
	if(newTitle !== undefined){
		gameTitle = newTitle;
	}
	return gameTitle;
};

exports.fullscreen = function fullscreen(){
	utils.fullscreen(container);
};

// Is x defined?
exports.def = function(x){
	return x !== undefined;
};

// Console log
exports.log = function(){
	console.log.apply(null, arguments);
};

exports.print = function(text, x, y, col){
	pixelops.beforeChange();
	if(Array.isArray(text)){
		for(var i=0; i<text.length; i++){
			exports.print(text[i], x, y + 8*i, col);
		}
		return;
	}
	x = x !== undefined ? x : 0;
	y = y !== undefined ? y : 0;
	col = col !== undefined ? col : defaultColor;

	x = x | 0;
	y = y | 0;

	font.draw(ctx, text.toString().toUpperCase(), x, y, col);
};

exports.fit = function fit(stretchMode, responsive){
	if(responsive){
		var rect = container.getBoundingClientRect();
		var aspect = rect.width / rect.height;
		var responsiveAspect = responsiveRect.w / responsiveRect.h;
		var newWidth = responsiveRect.w;
		var newHeight = responsiveRect.h;
		if(aspect > responsiveAspect){
			// Increase width
			newWidth *= aspect / responsiveAspect;
		} else {
			newHeight *= responsiveAspect / aspect;
		}
		width(newWidth);
		height(newHeight);
	}

	stretchMode = stretchMode !== undefined ? stretchMode : 0;
	var pixelPerfect = (stretchMode === 0);
	var i = canvases.length;
	while(i--){
		utils.scaleToFit(canvases[i], container, pixelPerfect);
	}
};

exports.mget = function mget(x, y){
	x = x | 0;
	y = y | 0;
	return mapData[y * mapSizeX + x];
};

exports.mset = function mset(x, y, i){
	if(mget(x,y) === i) return;

	i = i | 0;
	x = x | 0;
	y = y | 0;

	mapData[y * mapSizeX + x] = i;
	mapDataDirty[y * mapSizeX + x] = 1;
};

exports.save = function(key){
	key = key || 'save';
	var data = toJSON();

	var idx = key.indexOf('.json');
	if(idx !== -1){
		download(key.substr(0,idx));
	} else {
		localStorage.setItem(key, JSON.stringify(data));
	}
};

exports.json = function(){
	return toJSON();
};

exports.load = function(key){
	if(typeof(key) === 'object'){
		loadJSON(key);
	} else {
		key = key || 'save';
		if(key.indexOf('.json') !== -1){
			utils.loadJsonFromUrl(key,function(err,json){
				if(json){
					loadJSON(json);
				}
			});
		} else {
			try {
				var data = JSON.parse(localStorage.getItem(key));
				loadJSON(data);
				return true;
			} catch(err) {
				// localStorage is undefined (iOS private mode) or something else went wrong
				return false;
			}
		}
	}
};

function download(key){
	key = key || 'export';
	var data = toJSON();
	utils.downloadStringAsTextFile(JSON.stringify(data), key + '.json');
}

function toJSON(){
	var i,j;
	var data = {
		version: 9,
		width: width(), // added in v3
		height: height(), // added in v3
		cellwidth: cellwidth(), // added in v4
		cellheight: cellheight(), // added in v4
		spritesheetsize: ssget(), // added in v5
		title: title(), // added in v9
		map: [],
		sprites: [],
		flags: [],
		palette: palette.slice(0),
		sfx: [],
		code: code.codeget(), // added in v2
		trackInfo: [], // added in v6
		tracks: [], // added in v6
		patterns: [] // added in v6
	};
	for(var i=0; i<spriteFlags.length; i++){
		data.flags[i] = fget(i);
	}
	utils.removeTrailingZeros(data.flags);

	// Sprite data
	for(i=0; i<ssget()*cellwidth(); i++){
		for(j=0; j<ssget()*cellheight(); j++){
			data.sprites[j*ssget()*cellwidth()+i] = sget(i,j);
		}
	}
	utils.removeTrailingZeros(data.sprites);

	// Map data
	for(i=0; i<mapSizeX; i++){
		for(j=0; j<mapSizeY; j++){
			data.map[j*mapSizeX+i] = mget(i,j);
		}
	}
	utils.removeTrailingZeros(data.map);

	// SFX data
	for(var n=0; asget(n) !== undefined; n++){
		var sfxData = {
			speed: asget(n),
			volumes: [],
			pitches: [],
			waves: []
		};
		for(var offset=0; offset<32; offset++){
			sfxData.volumes.push(avget(n, offset));
			sfxData.pitches.push(afget(n, offset));
			sfxData.waves.push(awget(n, offset));
		}
		data.sfx.push(sfxData);
	}
	// Remove zero valued sfx data, added in v8
	function isDefaultSfxData(d){
		var onlyZeroVolumes = true;
		for(var i=0;i<d.volumes.length; i++){
			if(d.volumes[i] !== 0){
				onlyZeroVolumes = false;
				break;
			}
		}
		return onlyZeroVolumes;
	}
	while(data.sfx.length && isDefaultSfxData(data.sfx[data.sfx.length-1])){
		data.sfx.pop();
	}

	// trackInfo
	for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
		var speed = gsget(groupIndex);
		var groupFlags = 0; // todo
		data.trackInfo.push(speed, groupFlags);
	}

	// tracks
	for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
		for(var position=0; position<32; position++){
			var pitch = npget(groupIndex, position);
			var octave = noget(groupIndex, position);
			var instrument = niget(groupIndex, position);
			var volume = nvget(groupIndex, position);
			var effect = neget(groupIndex, position);
			data.tracks.push(pitch, octave, instrument, volume, effect);
		}
	}
	utils.removeTrailingZeros(data.tracks);

	// patterns
	for(var patternIndex=0; mfget(patternIndex) !== undefined; patternIndex++){
		var flags = mfget(patternIndex);
		data.patterns.push(flags);
		for(var channelIndex = 0; channelIndex < 4; channelIndex++){
			var track = mgget(patternIndex, channelIndex);
			data.patterns.push(track);
		}
	}
	utils.removeTrailingZeros(data.patterns);

	return data;
}

function loadJSON(data){
	var i,j;
	code.codeset(data.code || '');

	title(data.title || 'game');

	if(data.width !== undefined){
		width(data.width);
	}
	if(data.height !== undefined){
		height(data.height);
	}

	if(data.cellwidth !== undefined){
		cellwidth(data.cellwidth);
	}
	if(data.cellheight !== undefined){
		cellheight(data.cellheight);
	}

	if(data.spritesheetsize !== undefined){
		ssset(data.spritesheetsize);
	}

	for(i=0; i<spriteFlags.length; i++){
		fset(i, data.flags[i] || 0);
	}

	setPalette(data.palette);
	for(i=0; i<spriteSheetSizeX*cellwidth(); i++){
		for(j=0; j<spriteSheetSizeY*cellheight(); j++){
			sset(i,j,data.sprites[j*spriteSheetSizeX*cellwidth()+i] || 0);
		}
	}
	spriteSheetDirtyRect.set(0,0,spriteSheetSizeX*cellwidth(),spriteSheetSizeY*cellheight());

	for(i=0; i<mapSizeX; i++){
		for(j=0; j<mapSizeY; j++){
			mset(i,j,data.map[j*mapSizeX+i] || 0);
		}
	}

	for(var n=0; asget(n) !== undefined; n++){
		var sfxData = data.sfx[n] || {
			speed: 16,
			volumes: [],
			pitches: [],
			waves: []
		};
		asset(n, sfxData.speed);
		for(var offset=0; avget(n, offset) !== undefined; offset++){
			avset(n, offset, sfxData.volumes[offset] || 0);
			afset(n, offset, sfxData.pitches[offset] || 0);
			awset(n, offset, sfxData.waves[offset] || 0);
		}
	}

	// trackInfo
	if(data.trackInfo){
		for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
			var speed = data.trackInfo[groupIndex*2];
			var flags = data.trackInfo[groupIndex*2+1];
			gsset(groupIndex, speed);
		}
	}

	// tracks
	if(data.tracks){
		for(var groupIndex=0; gsget(groupIndex) !== undefined; groupIndex++){
			for(var position=0; position<32; position++){
				var p = groupIndex * 32 * 5 + position * 5;

				var pitch = data.tracks[p + 0] || 0;
				var octave = data.tracks[p + 1] || 0;
				var instrument = data.tracks[p + 2] || 0;
				var volume = data.tracks[p + 3] || 0;
				var effect = data.tracks[p + 4] || 0;

				if(data.version <= 6){
					// in v7, all octaves were lowered by 1.
					octave++;
				}

				npset(groupIndex, position, pitch);
				noset(groupIndex, position, octave);
				niset(groupIndex, position, instrument);
				nvset(groupIndex, position, volume);
				neset(groupIndex, position, effect);
			}
		}
	}

	// patterns
	if(data.patterns){
		for(var patternIndex=0; mfget(patternIndex) !== undefined; patternIndex++){
			var flags = data.patterns[patternIndex * 5] || 0;
			mfset(patternIndex, flags);
			for(var channelIndex = 0; channelIndex < 4; channelIndex++){
				var track = data.patterns[patternIndex * 5 + channelIndex + 1] || 0;
				mgset(patternIndex, channelIndex, track);
			}
		}
	}

	if(typeof(_load) === 'function'){
		runUserFunction(_load);
	}
}

function runUserFunction(func){
	if(typeof(func) === 'function'){
		try {
			func();
		} catch(err){
			if(typeof(_error) === 'function'){
				_error(utils.getErrorInfo(err));
			}
			console.error(err);
		}
	}
}

function clearMapCacheCanvas(){
	mapCacheContext.clearRect(0, 0, cellsizeX*mapSizeX, cellsizeY*mapSizeY);
}

function updateMapCacheCanvas(x,y,doClear){
	if(doClear){
		mapCacheContext.clearRect(x * cellsizeX, y * cellsizeY, cellsizeX, cellsizeY);
	}
	var n = mget(x, y);
	if(n === 0){
		// Sprite 0 is empty
		return;
	}
	flushSpriteSheet();
	mapCacheContext.drawImage(
		spriteSheetCanvas,
		ssx(n) * cellsizeX, ssy(n) * cellsizeY,
		cellsizeX, cellsizeY,
		cellsizeX * x, cellsizeY * y,
		cellsizeX, cellsizeY
	);
}

exports.mousex = function(){
	return Math.floor(mouse.mousexNormalized() * (screensizeX-1));
};

exports.mousey = function(){
	return Math.floor(mouse.mouseyNormalized() * (screensizeY-1));
};

exports.touchx = function(id){
	return Math.floor(mouse.touchxNormalized(id) * (screensizeX-1));
};

exports.touchy = function(id){
	return Math.floor(mouse.touchyNormalized(id) * (screensizeY-1));
};

exports.mobile = function(){
	return utils.isMobile();
};

utils.makeGlobal(music);
utils.makeGlobal(math);
utils.makeGlobal(sfx.global);
utils.makeGlobal(code);
utils.makeGlobal(exports);
utils.makeGlobal(input.global);
utils.makeGlobal(mouse.global);

},{"./Rectangle":3,"./code":4,"./colors":5,"./font":6,"./input":8,"./math":9,"./mouse":10,"./music":11,"./pixelops":12,"./sfx":13,"./utils":14}],8:[function(require,module,exports){
var math = require('./math');
var utils = require('./utils');

var maxPlayers = 6; // 0-1 keyboard, 2-5 gamepad
var maxButtons = 5;
var buttonStates = utils.zeros(maxPlayers * maxButtons);
var prevButtonStates = utils.zeros(maxPlayers * maxButtons);
var buttonMap = { // Maps keycodes to button index

	// Player 0
	37: 0, // left
	39: 1, // right
	38: 2, // up
	40: 3, // down
	90: 4, // z
	88: 5, // x

	// Player 1
	83: 6, // S
	70: 7, // F
	69: 8, // E
	68: 9, // D
	65: 10, // A
	81: 11  // Q
};

var stickSensitivity = 0.1;

exports.btn = function btn(i, player){
	i = i !== undefined ? i : 0;
	player = player !== undefined ? player : 0;
	return buttonStates[player * maxPlayers + i];
};

// TODO: need to support multiple "prev" button states, so it can work in _update, _draw, etc
exports.btnp = function btnp(i, player){
	i = i !== undefined ? i : 0;
	player = player !== undefined ? player : 0;
	return prevButtonStates[player * maxPlayers + i];
};

exports.update = function (){
	updateGamepadInputs();
	for(var i=0; i<buttonStates.length; i++){
		prevButtonStates[i] = buttonStates[i];
	}
};

exports.init = function(canvases){
	addInputListeners(canvases);
};

function addInputListeners(canvases){
	bodyListeners = {
		keydown: function(e){
			buttonStates[buttonMap[e.keyCode]] = 1;
		},
		keyup: function(e){
			buttonStates[buttonMap[e.keyCode]] = 0;
		}
	};
	for(var key in bodyListeners){
		document.body.addEventListener(key, bodyListeners[key]);
	}
}

function removeInputListeners(canvases){
	var key;
	for(key in canvasListeners){
		canvases[0].removeEventListener(key, canvasListeners[key]);
	}
	for(key in bodyListeners){
		document.body.removeEventListener(key, bodyListeners[key]);
	}
}

function buttonPressed(b) {
	if (typeof(b) == "object") {
		return b.pressed;
	}
	return b == 1.0;
}

function updateGamepadInputs() {
	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

	for(var i=0; i<gamepads.length && i < maxPlayers; i++){
		if(!gamepads[i]) continue;
		var p = 2 + maxPlayers * i;
		buttonStates[p + 0] = gamepads[i].axes[0] < -stickSensitivity;
		buttonStates[p + 1] = gamepads[i].axes[0] > stickSensitivity;
		buttonStates[p + 2] = gamepads[i].axes[1] < -stickSensitivity;
		buttonStates[p + 3] = gamepads[i].axes[1] > stickSensitivity;
		buttonStates[p + 4] = buttonPressed(gamepads[i].buttons[0]);
		buttonStates[p + 5] = buttonPressed(gamepads[i].buttons[1]);
	}
}

exports.global = {
	btn: exports.btn,
	btnp: exports.btnp
};

},{"./math":9,"./utils":14}],9:[function(require,module,exports){
var tau = 2 * Math.PI;

module.exports = {
	// trigonometric functions use normalized angles!
	sin: function(radians){ return Math.sin(radians * tau); },
	cos: function(radians){ return Math.cos(radians * tau); },
	atan2: function(y,x){ return Math.atan2(y,x) / tau; },

	flr: Math.floor,
	ceil: Math.ceil,
	rnd: function (x){ return Math.random() * x; },
	abs: Math.abs,
	max: Math.max,
	min: Math.min,
	nan: isNaN,
	inf: Infinity,
	mix: function(a,b,alpha){
		return a * alpha + b * ( 1.0 - alpha );
	},
	sgn: Math.sign, // sgn(x) -- returns argument sign: -1, 1; sgn(0) = 1,
	sqrt: Math.sqrt,
	mid: function(x,y,z){
		var m = z;
		if(x >= y && x <= z){
			m = x;
		} else if(y >= x && y <= z){
			m = y;
		} else if(z >= x && z <= y){
			m = z;
		}
		return m;
	},
	clamp: function(x,min,max){
		return Math.min(Math.max(x,min), max);
	}
};
},{}],10:[function(require,module,exports){
var math = require('./math');
var utils = require('./utils');

var _mousex = 0;
var _mousey = 0;
var _mousescroll = 0;
var _mousebtns = {};

exports.init = function(canvases){
	addListeners(canvases);
};

exports.mousex = function mousex(){ return _mousex; };
exports.mousey = function mousey(){ return _mousey; };
exports.mousescroll = function mousescroll(){ return _mousescroll; };

exports.mousebtn = function mousebtn(i){
	return !!_mousebtns[i];
};

var _touches = {};
exports.touchn = function touchn(){ return Object.keys(_touches).length; };
exports.touchid = function touchn(i){
	var key = Object.keys(_touches)[i];
	return _touches[ key ].identifier;
};
exports.touchdown = function touchdown(id){
	return !!_touches[id];
};
exports.touchxNormalized = function touchxNormalized(id){
	var clientX = _touches[id].clientX;
	var rect = _touches[id].target.getBoundingClientRect(); // cache this?
	return math.clamp((clientX - rect.left) / rect.width, 0, 1);
};
exports.touchyNormalized = function touchyNormalized(id){
	var clientY = _touches[id].clientY;
	var rect = _touches[id].target.getBoundingClientRect(); // cache this?
	var y = math.clamp((clientY - rect.top) / rect.height, 0, 1);
	return y;
};

function addListeners(canvases){
	canvasListeners = {
		click: function(evt){
			if(typeof(_click) !== 'undefined'){
				updateMouseCoords(evt, canvases);
				_mousebtns[evt.which] = true;
				_click();
				_mousebtns[evt.which] = false;
			}
		},
		mousedown: function(evt){
			_mousebtns[evt.which] = true;
			updateMouseCoords(evt, canvases);
		},
		mouseup: function(evt){
			_mousebtns[evt.which] = false;
			updateMouseCoords(evt, canvases);
		},
		mouseleave: function(evt){
			_mousebtns[evt.which] = false;
			updateMouseCoords(evt, canvases);
		},
		mousewheel: function(evt){
			var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
			_mousescroll += delta;
		},
		touchstart: function(evt){
			evt.preventDefault();
			for(var i=0; i<evt.changedTouches.length; i++){
				_touches[evt.changedTouches[i].identifier] = evt.changedTouches[i];
			}
		},
		touchmove: function(evt){
			evt.preventDefault();
			for(var i=0; i<evt.changedTouches.length; i++){
				_touches[evt.changedTouches[i].identifier] = evt.changedTouches[i];
			}
		},
		touchend: function(evt){
			evt.preventDefault();
			for(var i=0; i<evt.changedTouches.length; i++){
				delete _touches[evt.changedTouches[i].identifier];
			}
		}
	};
	canvasListeners.DOMMouseScroll = canvasListeners.mousewheel;

	var key;
	for(key in canvasListeners){
		canvases[0].addEventListener(key, canvasListeners[key]);
	}

	bodyListeners = {
		mousemove: function(evt){
			updateMouseCoords(evt, canvases);
		}
	};
	for(key in bodyListeners){
		document.body.addEventListener(key, bodyListeners[key]);
	}
}

function removeListeners(canvases){
	var key;
	for(key in canvasListeners){
		canvases[0].removeEventListener(key, canvasListeners[key]);
	}
	for(key in bodyListeners){
		document.body.removeEventListener(key, bodyListeners[key]);
	}
}

function updateMouseCoords(evt, canvases){
	if(canvases.indexOf(evt.target) === -1) return;

	var rect = evt.target.getBoundingClientRect(); // cache this?
	var parentRect = evt.target.parentNode.getBoundingClientRect(); // cache this?
	var subx = 0;
	var suby = 0;
	var clientX = evt.clientX;
	var clientY = evt.clientY;
	if(evt.changedTouches){
		clientX = evt.changedTouches[0].clientX;
		clientY = evt.changedTouches[0].clientY;
	}
	_mousex = math.clamp((clientX - rect.left - subx) / rect.width, 0, 1);
	_mousey = math.clamp((clientY - rect.top - suby) / rect.height, 0, 1);
}

exports.mousexNormalized = function(){ return _mousex; };
exports.mouseyNormalized = function(){ return _mousey; };

exports.global = {
	mousebtn: exports.mousebtn,
	click: exports.click,
	mousescroll: exports.mousescroll,
	touchn: exports.touchn,
	touchid: exports.touchid,
	touchdown: exports.touchdown
};

},{"./math":9,"./utils":14}],11:[function(require,module,exports){
var utils = require('./utils');
var sfx = require('./sfx');
var aWeight = require('a-weighting/a');

/**
 * Equal Temperament Tuning
 * Source: http://www.phy.mtu.edu/~suits/notefreqs.html
 */
var frequencies = [
	130.81,  138.59,  138.59,  146.83,  155.56,  155.56,  164.81,  174.61,  185.00,  185.00,  196.00,  207.65,  207.65,  220.00,  233.08,  233.08,  246.94,
	261.63,  277.18,  277.18,  293.66,  311.13,  311.13,  329.63,  349.23,  369.99,  369.99,  392.00,  415.30,  415.30,  440.00,  466.16,  466.16,  493.88,
	523.25,  554.37,  554.37,  587.33,  622.25,  622.25,  659.26,  698.46,  739.99,  739.99,  783.99,  830.61,  830.61,  880.00,  932.33,  932.33,  987.77,
	1046.50, 1108.73, 1108.73, 1174.66, 1244.51, 1244.51, 1318.51, 1396.91, 1479.98, 1479.98, 1567.98, 1661.22, 1661.22, 1760.00, 1864.66, 1864.66, 1975.53,
	2093.00, 2217.46, 2217.46, 2349.32, 2489.02, 2489.02, 2637.02, 2793.83, 2959.96, 2959.96, 3135.96, 3322.44, 3322.44, 3520.00, 3729.31, 3729.31, 3951.07, 4186.01];
var noteNames = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B".split(' ');
var PatternFlags = {
	CONTINUE: 1,
	JUMP: 2,
	STOP: 4
};

// pitch: 0-16. Octave: 0-8
function getFrequency(pitch, octave){
	return frequencies[octave * noteNames.length + pitch];
}

var groups = [];
var maxPatterns = 64;
var maxGroups = 64;
var patterns = utils.zeros(maxPatterns * (4 + 1)); // 4 channels (pointing to groups), 1 bitfield/flags

var playState = {
	pattern: -1,
	nextPattern: -1,
	bufferedUntil: 0,
	bufferedUntilLowRes: 0, // Use low res timer if possible, because context.currentTime is slow on some devices
	patternLength: 0,
	startTime: 0,
	startTimeLowRes: 0
};

while(groups.length < maxGroups){
	var group = {
		speed: 16,
		notes: utils.zeros(5 * 8 * 4) // pitch, octave, instrument, volume, effect
	};
	groups.push(group);
}

exports.gsset = function(group, speed){
	speed = speed !== undefined ? speed : 16;
	groups[group].speed = speed;
};

exports.gsget = function(group){
	if(group >= groups.length) return;
	return groups[group].speed;
};

exports.npset = function(group, position, pitch){
	pitch = pitch !== undefined ? pitch : 0;
	if(pitch < 0 || pitch > noteNames.length) throw new Error('Pitch out of range');
	groups[group].notes[5 * position + 0] = pitch;
};

exports.npget = function(group, position){
	return groups[group].notes[5 * position + 0];
};

exports.nnget = function(note){
	return noteNames[note % 17];
};

// Octave is the "pitch multiplier", from 0 to 8 (more limits?)
exports.noset = function(group, position, octave){
	octave = octave !== undefined ? octave : 0;
	if(octave < 0 || octave > 8) throw new Error('Octave out of range');
	groups[group].notes[5 * position + 1] = octave;
};

exports.noget = function(group, position){
	return groups[group].notes[5 * position + 1];
};

// volume for a note
exports.nvset = function(group, position, volume){
	volume = volume !== undefined ? volume : 0;
	groups[group].notes[5 * position + 3] = volume;

	// If volume is zero, set the other data to zero
	if(volume === 0){
		exports.npset(group, position, 0);
		exports.noset(group, position, 0);
		exports.niset(group, position, 0);
	}
};

exports.nvget = function(group, position){
	return groups[group].notes[5 * position + 3];
};

// instrument for a note
exports.niset = function(group, position, instrument){
	instrument = instrument !== undefined ? instrument : 0;
	groups[group].notes[5 * position + 2] = instrument;
};

exports.niget = function(group, position){
	return groups[group].notes[5 * position + 2];
};

// effect for a note
exports.neset = function(group, position, effect){
	effect = effect !== undefined ? effect : 0;
	groups[group].notes[5 * position + 4] = effect;
};

exports.neget = function(group, position){
	return groups[group].notes[5 * position + 4];
};

// Set a group to be played in a channel in a pattern.
exports.mgset = function(pattern, channel, group){
	group = group !== undefined ? group : 0;
	channel = channel !== undefined ? channel : 0;
	patterns[pattern * 5 + 1 + channel] = group;
};

exports.mgget = function(pattern, channel){
	return patterns[pattern * 5 + 1 + channel];
};

// Set flags for a pattern
exports.mfset = function(pattern, flags){
	flags = flags !== undefined ? flags : 0;
	patterns[pattern * 5 + 0] = flags;
};

// Get flags
exports.mfget = function(pattern){
	return patterns[pattern * 5 + 0];
};

var channels = [];
var allTypes = sfx.getAllOscillatorTypes();
var oscillatorTypes = sfx.getOscillatorTypes();

// Create audio stuff
function initChannels(){
	// TODO: share with sfx - create a class?
	var context = sfx.getContext();
	var masterGain = sfx.getMasterGain();
	var cTime = context.currentTime;
	for(var j=0; j<4; j++){ // one for each channel in the music
		var channel = {
			instruments: {},
			gains: {},
			volumeMultipliers: {}
		};
		channels.push(channel);

		// add 4 basic instruments and gains to channel
		for(var i=0; i<oscillatorTypes.length; i++){
			var osc = context.createOscillator();
			var type = oscillatorTypes[i];
			osc.type = type;

			var gain = context.createGain();
			gain.gain.value = 0;
			gain.connect(masterGain);

			osc.connect(gain);
			channel.instruments[type] = osc;
			channel.gains[type] = gain;
			channel.volumeMultipliers[type] = 1 / sfx.rms[type];
		}

		// Add square25 / pulse
		var gain = context.createGain();
		gain.gain.value = 0;
		gain.connect(masterGain);
		var square25 = sfx.createPulse(gain);
		channel.instruments.square25 = square25;
		channel.gains.square25 = gain;
		channel.volumeMultipliers.square25 = 1 / sfx.rms.square25;

		// Add white noise
		gain = context.createGain();
		gain.gain.value = 0;
		gain.connect(masterGain);
		var whiteNoise = sfx.createWhiteNoise(gain);
		channel.instruments.white = whiteNoise;
		channel.gains.white = gain;
		channel.volumeMultipliers.white = 1 / sfx.rms.white;
	}
}

function startChannels(time){
	channels.forEach(function(channel){
		for(var instrumentName in channel.instruments){
			var oscillator = channel.instruments[instrumentName];
			oscillator.start(time);
		}
	});
}

exports.iosFix = function(){
	initChannels();
	var time = sfx.getContext().currentTime;
	try {
		startChannels(time);
	} catch(err){
		console.error(err);
	}
};

// preview play a group
exports.group = function(groupIndex, channelIndex){
	scheduleGroup(groupIndex, channelIndex||0, sfx.getContext().currentTime);
};

function scheduleGroup(groupIndex, channelIndex, time){
	var i,j;
	var group = groups[groupIndex];
	var channel = channels[channelIndex];
	var speed = group.speed;
	for(i=0; i < 32; i++){ // all rows in the group
		var volume = nvget(groupIndex, i);
		var pitch = npget(groupIndex, i);
		var octave = noget(groupIndex, i);
		var instrument = niget(groupIndex, i);
		var effect = neget(groupIndex, i);
		if(volume === 0){
			continue;
		}
		var startPosition = i;
		var endPosition = i+1;

		/*
		while(
			nvget(groupIndex, endPosition) === volume &&
			niget(groupIndex, endPosition) === instrument &&
			npget(groupIndex, endPosition) === pitch &&
			noget(groupIndex, endPosition) === octave &&
			neget(groupIndex, endPosition) === 0 &&
			endPosition < 32
		){
			endPosition++;
		}
		*/

		var startTime = time + startPosition / speed;
		var endTime = time + endPosition / speed;

		if(effect === 1){
			// make note slightly shorter
			startTime = time + (startPosition + 0.0) / speed;
			endTime = time + (endPosition - 0.25) / speed;
		}

		var osc = channel.instruments[allTypes[instrument]];
		var gain = channel.gains[allTypes[instrument]];
		var volumeMultiplier = channel.volumeMultipliers[allTypes[instrument]];

		if(osc.frequency){ // noise doesn't have frequency
			var frequency = getFrequency(pitch, octave);

			if(effect === 2 && startPosition !== 0){
				// slide frequency
				osc.frequency.linearRampToValueAtTime(frequency, startTime);
			} else {
				osc.frequency.setValueAtTime(frequency, startTime);
			}
			//if(frequency !== 0) volumeMultiplier /= aWeight(frequency);
		}
		gain.gain.setValueAtTime(volumeMultiplier * volume / 7, startTime);
		gain.gain.setValueAtTime(0, endTime-0.000001);

		i = endPosition - 1;
	}
}

// Play or stop music
exports.music = function(patternIndex, fade, channelmask){
	fade = fade !== undefined ? fade : 0;
	channelmask = channelmask !== undefined ? channelmask : 0;
	if(patternIndex === -1){
		stop(fade);
		return;
	}

	var startTime = sfx.getContext().currentTime;

	playState.pattern = patternIndex;
	playState.nextPattern = getNextPattern(patternIndex);
	playState.patternLength = getPatternLength(patternIndex);
	playState.startTime = startTime;
	playState.startTimeLowRes = Date.now()/1000;
	playState.bufferedUntil = startTime + playState.patternLength;
	playState.bufferedUntilLowRes = Date.now()/1000 + playState.patternLength;

	// schedule groups in all channels
	for(var channelIndex=0; channelIndex < channels.length; channelIndex++){
		var groupIndex = mgget(patternIndex, channelIndex);
		scheduleGroup(groupIndex, channelIndex, startTime);
	}
};

// TODO: fade
function stop(fade){
	fade = fade !== undefined ? fade : 0;

	playState.pattern = -1;
	playState.nextPattern = -1;

	var currentTime = sfx.getContext().currentTime;
	for(var channelIndex=0; channelIndex<channels.length; channelIndex++){
		var channel = channels[channelIndex];
		for(var i=0; i<allTypes.length; i++){
			var instrument = channel.instruments[allTypes[i]];
			var gain = channel.gains[allTypes[i]];
			if(instrument.frequency){
				instrument.frequency.cancelScheduledValues(currentTime + fade);
			}
			gain.gain.cancelScheduledValues(currentTime + fade);
			gain.gain.linearRampToValueAtTime(0, currentTime + fade);
		}
	}
}

exports.update = function(){
	if(playState.pattern === -1){
		// Not playing
		return;
	}

	if(playState.nextPattern === -1){
		// No next pattern to buffer
		return;
	}

	var currentTime = Date.now()/1000;

	if(currentTime < playState.bufferedUntilLowRes - playState.patternLength * 0.5){
		// Already buffered enough
		return;
	}

	// schedule groups in all channels for the next 32 notes
	for(var channelIndex=0; channelIndex < channels.length; channelIndex++){
		var groupIndex = mgget(playState.nextPattern, channelIndex);
		scheduleGroup(groupIndex, channelIndex, playState.startTime + playState.patternLength);
	}

	// Update playState, set next pattern as current
	var prevPatternLength = playState.patternLength;
	playState.pattern = playState.nextPattern;
	playState.patternLength = getPatternLength(playState.pattern);
	playState.startTime += prevPatternLength;
	playState.startTimeLowRes += prevPatternLength;
	playState.bufferedUntil = playState.startTime + playState.patternLength;
	playState.bufferedUntilLowRes = playState.startTimeLowRes + playState.patternLength;
	playState.nextPattern = getNextPattern(playState.pattern);
};

function getNextPattern(currentPattern){
	var nextPattern = (currentPattern + 1) % maxPatterns;
	var flags = mfget(currentPattern);
	if(flags & PatternFlags.JUMP){
		var i = currentPattern-1;
		while(!(mfget(i) & PatternFlags.CONTINUE)){
			i--;
		}
		nextPattern = Math.max(0,i);
	} else if(flags & PatternFlags.STOP){
		nextPattern = -1;
	} else if(playState.nextPattern !== -1 && getPatternLength(playState.nextPattern) === 0){
		nextPattern = -1;
	}
	return nextPattern;
}

function getPatternLength(patternIndex){
	var totalLength = 0;
	for(var channelIndex=0; channelIndex < channels.length; channelIndex++){
		var groupIndex = mgget(patternIndex, channelIndex);
		if(groupIndex === 0) continue;
		var speed = gsget(groupIndex);
		totalLength = Math.max(totalLength, 32/speed);
	}
	return totalLength;
}

},{"./sfx":13,"./utils":14,"a-weighting/a":1}],12:[function(require,module,exports){
var ctx;
var writeData = null;
var readData = null;
var width;
var height;
var pixelsQueued = 0;
var tempCanvas = null;
var tempCanvasContext = null;

exports.init = function(canvas){
	ctx = canvas.getContext('2d');
	writeData = ctx.createImageData(canvas.width, canvas.height);
	width = canvas.width;
	height = canvas.height;

	tempCanvas = document.createElement('canvas');
	tempCanvas.width = width;
	tempCanvas.height = height;
	tempCanvasContext = tempCanvas.getContext('2d');
};

exports.resize = function(canvas){
	exports.init(canvas);
};

// Call if you're going to write to the canvas.
exports.beforeChange = function(){
	readData = null;
	if(pixelsQueued !== 0){
		exports.flush();
	}
};

exports.pset = function(x,y,r,g,b){
	if(x >= width || y >= height) throw new Error("Pixel coordinate out of bounds.");
	var p = (y * width + x) * 4;
	var data = writeData.data;
	data[p + 0] = r;
	data[p + 1] = g;
	data[p + 2] = b;
	data[p + 3] = 255;
	pixelsQueued++;
};

exports.pget = function(x,y,out){
	var p = (y * width + x) * 4;
	if(writeData.data[p + 3] === 255){
		out[0] = writeData.data[p + 0];
		out[1] = writeData.data[p + 1];
		out[2] = writeData.data[p + 2];
	} else {
		if(!readData){
			readData = ctx.getImageData(0, 0, width, height);
		}
		out[0] = readData.data[p + 0];
		out[1] = readData.data[p + 1];
		out[2] = readData.data[p + 2];
	}
};

// call to flush all stored pixels to canvas
exports.flush = function(){
	if(pixelsQueued === 0) return;

	// write all the writeData to canvas
	var sourceX = 0;
	var sourceY = 0;
	var destX = 0;
	var destY = 0;
	tempCanvasContext.putImageData(writeData, sourceX, sourceY, destX, destY, width, height);
	ctx.drawImage(tempCanvas,0,0);

	pixelsQueued = 0;
	exports.beforeChange();

	// Reset the writeData until next time
	var data = writeData.data;
	for(var i=0; i<width; i++){
		for(var j=0; j<height; j++){
			data[(j*width + i)*4 + 3] = 0; // set alpha to zero
		}
	}
};
},{}],13:[function(require,module,exports){
var utils = require('./utils');
var DFT = require('dsp.js/dsp').DFT;
var aWeight = require('a-weighting/a');

var context, masterGain;

var defaultSpeed = 16;
var minFrequency = 0;
var maxFrequency = 1000;
var maxEffects = 64;
var channels = [];
var effects = [];

var getContext = exports.getContext = function(){
	if(!context){
		context = new createAudioContext();
		masterGain = context.createGain();
		masterGain.gain.value = 0.1;
		masterGain.connect(context.destination);
	}
	return context;
};

exports.getMasterGain = function(){
	if(!masterGain){
		getContext();
	}
	return masterGain;
};

var oscillatorTypes = [
	'sine',
	'square',
	'triangle',
	'sawtooth'
];

exports.rms = {
	sine: 1 / Math.sqrt(2),
	square: 1,
	triangle: 1 / Math.sqrt(3),
	sawtooth: 1 / Math.sqrt(3),
	square25: 1 * Math.sqrt(0.25),
	white: 1 // ?
};

var allTypes = oscillatorTypes.concat([
	'square25',
	'white'
]);

exports.getOscillatorTypes = function(){
	return oscillatorTypes;
};

exports.getAllOscillatorTypes = function(){
	return allTypes;
};

function createAudioContext(desiredSampleRate) {
	var AudioCtor = window.AudioContext || window.webkitAudioContext;
	desiredSampleRate = typeof desiredSampleRate === 'number' ? desiredSampleRate : 44100;
	var context = new AudioCtor();
	// Check if hack is necessary. Only occurs in iOS6+ devices
	// and only when you first boot the iPhone, or play a audio/video
	// with a different sample rate
	if (/(iPhone|iPad)/i.test(navigator.userAgent) && context.sampleRate !== desiredSampleRate) {
		var buffer = context.createBuffer(1, 1, desiredSampleRate);
		var dummy = context.createBufferSource();
		dummy.buffer = buffer;
		dummy.connect(context.destination);
		dummy.start(0);
		dummy.disconnect();
		context.close();
		// dispose old context
		context = new AudioCtor();
	}
	return context;
}

function play(channel, types, frequencies, volumes, speed, offset){
	var i,j;

	// Get the length by looking at the volume values
	var endPosition = 0;
	for(i=0; i<volumes.length; i++){
		if(volumes[i] > 0){
			endPosition = i + 1;
		}
	}
	if(endPosition === 0) return;

	var currentTime = getContext().currentTime;

	var prevType = null;
	for(j=offset; j<endPosition; j++){
		var type = allTypes[types[j]];
		var gain = channel.gains[type];
		var osc = channel.oscillators[type];
		var startTime = currentTime + j / speed;

		if(prevType !== type && prevType !== null){
			channel.gains[prevType].gain.setTargetAtTime(0, startTime, 0.00001);
		}

		var vol = volumes[j] / 255 * (1 / exports.rms[type]);

		if(osc.frequency){ // noise doesn't have frequency
			var frequency = frequencies[j] / 255 * (maxFrequency - minFrequency) + minFrequency;
			osc.frequency.setValueAtTime(frequency, startTime);
			//if(frequency !== 0) vol /= aWeight(frequency);
		}

		gain.gain.setValueAtTime(vol, startTime);

		prevType = type;
	}

	// Set the volume at the end to zero
	if(prevType !== null){
		var len = (endPosition - offset) / speed;
		var endTime = currentTime + len;
		channel.gains[prevType].gain.setTargetAtTime(0, endTime, 0.00001);
	}

	channel.occupiedUntil = endTime;
}

// Speed is 0 to 255
exports.asset = function(n, speed){
	effects[n].speed = (speed === undefined ? defaultSpeed : speed);
};
exports.asget = function(n){
	return effects[n] && effects[n].speed;
};

// volume is 0 to 255
exports.avset = function(n, offset, volume){ effects[n].volumes[offset] = (volume !== undefined ? volume : 0); };
exports.avget = function(n, offset){ return effects[n] && effects[n].volumes[offset]; };

// frequency is 0 to 255
exports.afset = function(n, offset, frequency){ effects[n].frequencies[offset] = (frequency !== undefined ? frequency : 0); };
exports.afget = function(n, offset){ return effects[n] && effects[n].frequencies[offset]; };

// wave is 0,1,2,3,4
exports.awset = function(n, offset, waveform){ effects[n].types[offset] = (waveform !== undefined ? waveform : 0); };
exports.awget = function(n, offset){ return effects[n] && effects[n].types[offset]; };

exports.sfx = function(n, channelIndex, offset){
	channelIndex = channelIndex !== undefined ? channelIndex : -1;
	offset = offset !== undefined ? offset : 0;

	var effect = effects[n];
	if(!effect){
		return false;
	}

	var contextTime = getContext().currentTime;
	if(channelIndex === -1){
		// Find good channel
		for(var i=0; i<channels.length; i++){
			var candidateIndex = i;
			if(channels[candidateIndex].occupiedUntil < contextTime){
				channelIndex = candidateIndex;
				break;
			}
		}
	} else if(!channels[channelIndex] || channels[channelIndex].occupiedUntil >= contextTime){
		return false;
	}

	if(!channels[channelIndex]){
		return false;
	}

	play(channels[channelIndex], effect.types, effect.frequencies, effect.volumes, effect.speed, offset);

	return true;
};

var whiteNoiseData = null;
exports.createWhiteNoise = function(destination) {
	var ctx = getContext();
	var bufferSize = 2 * ctx.sampleRate,
		noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate),
		output = noiseBuffer.getChannelData(0);

	if(!whiteNoiseData){
		whiteNoiseData = new Float32Array(bufferSize);
		for (var i = 0; i < bufferSize; i++) {
			whiteNoiseData[i] = Math.random() * 2 - 1;
		}
	}

	output.set(whiteNoiseData);

	var whiteNoise = ctx.createBufferSource();
	whiteNoise.buffer = noiseBuffer;
	whiteNoise.loop = true;

	whiteNoise.connect(destination);

	return whiteNoise;
};

var dft = null;
var pulseWave = null;
exports.createPulse = function(destination){
	var ctx = getContext();
	if(!dft){
		var count = 128;
		var vals2 = [];
		for (var i = 0; i < count; i++) {
			var x = i / count;
			var val = x < 0.25 ? -1 : 1;
			vals2.push(val);
		}

		dft = new DFT(vals2.length);
		dft.forward(vals2);

		// DFT outputs Float64Array but only Float32Arrays are allowed in createPeriodicWave
		pulseWave = ctx.createPeriodicWave(
			new Float32Array(dft.real),
			new Float32Array(dft.imag)
		);
	}

	var osc = ctx.createOscillator();
	osc.setPeriodicWave(pulseWave);
	osc.connect(destination);

	return osc;
};

function initChannels(){
	var ctx = getContext();

	for(var j=0; j<4; j++){
		var channel = {
			oscillators: {},
			gains: {},
			occupiedUntil: -1
		};
		channels.push(channel);

		// add 4 basic oscillators and gains to channel
		for(var i=0; i<oscillatorTypes.length; i++){
			var osc = ctx.createOscillator();
			var type = oscillatorTypes[i];
			osc.type = type;

			var gain = ctx.createGain();
			gain.gain.value = 0.0001;
			gain.connect(masterGain);

			osc.connect(gain);
			channel.oscillators[type] = osc;
			channel.gains[type] = gain;
		}

		// Add square25 / pulse
		var gain = ctx.createGain();
		gain.gain.value = 0.0001;
		gain.connect(masterGain);
		var square25 = exports.createPulse(gain);
		channel.oscillators.square25 = square25;
		channel.gains.square25 = gain;

		// Add white noise
		gain = ctx.createGain();
		gain.gain.value = 0.0001;
		gain.connect(masterGain);
		var whiteNoise = exports.createWhiteNoise(gain);
		channel.oscillators.white = whiteNoise;
		channel.gains.white = gain;
	}
}

function startChannels(time){
	channels.forEach(function(channel){
		for(var instrumentName in channel.oscillators){
			var oscillator = channel.oscillators[instrumentName];
			oscillator.start(time);
		}
	});
}

exports.iosFix = function(){
	initChannels();
	var time = getContext().currentTime;
	try {
		startChannels(time);
	} catch(err){
		console.error(err);
	}
};

for(var i=0; i<maxEffects; i++){
	effects.push({
		types: utils.zeros(maxEffects),
		frequencies: utils.zeros(maxEffects),
		volumes: utils.zeros(maxEffects),
		speed: defaultSpeed
	});
}

exports.global = {
	asset: exports.asset,
	asget: exports.asget,
	avset: exports.avset,
	avget: exports.avget,
	afset: exports.afset,
	afget: exports.afget,
	awset: exports.awset,
	awget: exports.awget,
	sfx: exports.sfx
};
},{"./utils":14,"a-weighting/a":1,"dsp.js/dsp":2}],14:[function(require,module,exports){
exports.disableImageSmoothing = function(ctx) {
	if(ctx.imageSmoothingEnabled !== undefined){
		ctx.imageSmoothingEnabled = false;
	} else if(ctx.mozImageSmoothingEnabled !== undefined){
		ctx.mozImageSmoothingEnabled = false;
	} else if(ctx.webkitImageSmoothingEnabled !== undefined){
		ctx.webkitImageSmoothingEnabled = false;
	} else if(ctx.msImageSmoothingEnabled !== undefined){
		ctx.msImageSmoothingEnabled = false;
	}
};

exports.hexToRgb = function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return [
		parseInt(result[1], 16),
		parseInt(result[2], 16),
		parseInt(result[3], 16)
	];
};

exports.rgbToDec = function(r, g, b){
	var c = r * (256*256) + g * 256 + b;
	return c;
};

exports.decToR = function(c){
	return Math.floor(c / (256*256));
};

exports.decToG = function(c){
	return Math.floor(c / 256) % 256;
};

exports.decToB = function(c){
	return c % 256;
};

function isSafari(){
	return navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1;
}

exports.isMac = function(){
	return navigator.platform.match("Mac");
};

exports.makeGlobal = function(obj){
	for(var key in obj){
		window[key] = obj[key];
	}
};

exports.scaleToFit = function scaleToFit(element, containerElement, pixelPerfectMode){
	var containerWidth = window.innerWidth;
	var containerHeight = window.innerHeight;
	if(containerElement){
		var rect = containerElement.getBoundingClientRect();
		containerWidth = rect.width;
		containerHeight = rect.height;
	}
	var scaleX = containerWidth / element.width;
	var scaleY = containerHeight / element.height;
	var scale = Math.min(scaleX, scaleY);

	var dpr = window.devicePixelRatio || 1;

	if(pixelPerfectMode){
		scale = (Math.floor(scale * dpr)/dpr) || (1/dpr);
	}

	var offsetX = (containerWidth - element.width * scale) * 0.5;
	var offsetY = (containerHeight - element.height * scale) * 0.5;

	if(pixelPerfectMode){
		offsetX = Math.floor(offsetX * dpr) / dpr;
		offsetY = Math.floor(offsetY * dpr) / dpr;
	}

	// Safari doesn't have nearest neighbor rendering when using CSS3 scaling
	if (isSafari()){
		element.style.width = (element.width * scale) + "px";
		element.style.height = (element.height * scale) + "px";
		element.style.marginLeft = offsetX + 'px';
		element.style.marginTop = offsetY + 'px';
	} else {
		element.style.transformOrigin = "0 0"; //scale from top left
		element.style.transform = "translate(" + offsetX + "px, " + offsetY + "px) scale(" + scale + ")";
	}
};

exports.fullscreen = function(element) {
	if(document.fullscreenElement) return false;

	// Use the specification method before using prefixed versions
	if (element.requestFullscreen) {
		element.requestFullscreen();
	} else if (element.msRequestFullscreen) {
		element.msRequestFullscreen();
	} else if (element.mozRequestFullScreen) {
		element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
		element.webkitRequestFullscreen();
	} else {
		return false;
	}

	return true;
};

exports.zeros = function(n, reusableArray){
	if(reusableArray === undefined){
		var a = [];
		while(n--){
			a.push(0);
		}
		return a;
	} else {
		for(var i=0; i<reusableArray.length; i++){
			reusableArray[0] = 0;
		}
		while(reusableArray.length < n) reusableArray.push(0);
		return reusableArray;
	}
};

exports.createCanvas = function(w,h,pixelSmoothing){
	pixelSmoothing = pixelSmoothing === undefined ? true : pixelSmoothing;

	var canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	if(pixelSmoothing){
		exports.disableImageSmoothing(canvas.getContext('2d'));
	}

	return canvas;
}

exports.createCanvasFromAscii = function(asciiArray, charToColorMap){
	var width = asciiArray[0].length;
	var height = asciiArray.length;
	var canvas = exports.createCanvas(width, height);
	var ctx = canvas.getContext('2d');
	var imageData = ctx.createImageData(width, height);
	for(var i=0; i<height; i++){
		for(var j=0; j<width; j++){
			var p = 4 * (i * width + j);
			var rgba = charToColorMap[asciiArray[i][j]];
			imageData.data[p+0] = rgba[0];
			imageData.data[p+1] = rgba[1];
			imageData.data[p+2] = rgba[2];
			imageData.data[p+3] = rgba[3];
		}
	}
	ctx.putImageData(imageData, 0, 0);
	return canvas;
};

// Get the line and column of an error. Works in all major browsers.
exports.getErrorInfo = function(err) {
	var line = -1;
	var column = -1;
	if(err.lineNumber!==undefined && err.columnNumber!==undefined){
		line = err.lineNumber;
		column = err.columnNumber;
	} else if(err.line!==undefined && err.column!==undefined){
		line = err.line;
		column = err.column;
	}
	var stack = err.stack;
	var m = stack.match(/:(\d+):(\d+)/mg);
	if(m){
		var nums = m[1].split(':');
		line = parseInt(nums[1]);
		column = parseInt(nums[2]);
	}
	return {
		message: err.message,
		line: line,
		column: column,
		originalError: err
	};
};

exports.loadJsonFromUrl = function(url, callback){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				callback(null, JSON.parse(xhr.responseText));
			} else {
				callback(xhr);
			}
		}
	};
	xhr.open("GET", url, true);
	xhr.send();
};

exports.removeTrailingZeros = function(arr){
	while(arr[arr.length-1] === 0){
		arr.pop();
	}
};

// iOS audio fix, to allow playing sounds from the first touch
exports.iosAudioFix = function(element, callback){
	var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	if(iOS){
		var isUnlocked = false;
		element.ontouchend = function(){
			console.log('ontouchend')
			if(isUnlocked) return;

			isUnlocked = true;
			if(callback) callback();
		};
	} else {
		if(callback) callback();
	}
};

exports.values = function(obj){
	var vals = [];
	for(var key in obj) {
		vals.push(obj[key]);
	}
	return vals;
};

// Parse query vars
// "search" is window.location.search
exports.parseQueryVariables = function(search,variables) {
	var query = search.substring(1);
	var vars = query.split('&');
	var result = {};
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=');
		var varName = decodeURIComponent(pair[0]);
		var type = variables[varName];
		if (type === undefined) continue;

		var value = decodeURIComponent(pair[1]);
		var ok = false;
		switch(type){
			case 'i':
				value = parseInt(value, 10);
				ok = !isNaN(value);
				break;
			case 'b':
				value = (value === "1");
				ok = true;
				break;
			case 's':
				ok = true;
				break;
		}
		if(ok){
			result[varName] = value;
		}
	}
	return result;
};

exports.floodfill = function(get, set, x, y, target, replace, xmin, xmax, ymin, ymax){
	if(target === replace) return;
	if(get(x,y) !== target) return;
	var q = [];
	q.push(x,y);
	while(q.length){
		var nx = q.shift();
		var ny = q.shift();
		if(get(nx,ny) === target){
			set(nx,ny,replace);
			if(nx > xmin && get(nx-1,ny) === target) q.push(nx-1,ny);
			if(nx < xmax && get(nx+1,ny) === target) q.push(nx+1,ny);
			if(ny < ymax && get(nx,ny+1) === target) q.push(nx,ny+1);
			if(ny > ymin && get(nx,ny-1) === target) q.push(nx,ny-1);
		}
	}
};

// Reliable modulo
exports.mod = function(a,b) {
	return ((a%b)+b)%b;
};

var input = null;
exports.opentextfile = function(callback){
	if(!input){
		input = document.createElement('input');
		input.style.display = 'none';
		input.type = 'file';
		input.value = null;
		document.body.appendChild(input);
	}
	input.onchange = function(e) {
		var file = e.target.files[0];
		if (!file) {
			return callback(new Error('No file.'));
		}
		var reader = new FileReader();
		reader.onload = function(e) {
			callback(null, e.target.result);
		};
		reader.onerror = function(e) {
			callback(new Erorr('Could not open file.'));
		};
		reader.readAsText(file);
		this.value = null;
	};

	input.click();
};

exports.inrect = function(x,y,rx,ry,rw,rh){
	return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
};

exports.isMobile = function() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
};

exports.downloadStringAsTextFile = function(str, filename){
	var url = URL.createObjectURL(new Blob([str]));
	var a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};
},{}]},{},[7]);
