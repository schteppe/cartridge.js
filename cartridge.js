(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
var utils = require('./utils');

var fontImages = [];
var fontX = 4;
var fontY = 5;
var paletteHex = [];
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,^?()[]:/\\="a+-!{}<>;_|&*~';

exports.init = function(fontImage, palette){
	for(var i=0; i<palette.length; i++){
		paletteHex[i] = palette[i].toString(16);
		// left pad
		while(paletteHex[i].length < 6){
			paletteHex[i] = "0" + paletteHex[i];
		}
		paletteHex[i] = '#' + paletteHex[i];
	}

	// Make a canvas for each palette color for the font
	var fontImageAsCanvas = document.createElement('canvas');
	fontImageAsCanvas.width = fontImage.width;
	fontImageAsCanvas.height = fontImage.height;
	fontImageAsCanvas.getContext('2d').drawImage(fontImage, 0, 0, fontImage.width, fontImage.height);
	var fontImageData = fontImageAsCanvas.getContext('2d').getImageData(0, 0, fontImage.width, fontImage.height);
	for(var i=0; i<paletteHex.length; i++){
		var coloredFontCanvas = document.createElement('canvas');
		// Replace color
		var data = fontImageData.data;
		for(var j=0; j<data.length/4; j++){
			if(!(
				data[4 * j + 0] === 0 &&
				data[4 * j + 1] === 0 &&
				data[4 * j + 2] === 0 &&
				data[4 * j + 3] === 0
			)){
				var rgb = utils.hexToRgb(paletteHex[i]);
				data[4 * j + 0] = rgb[0];
				data[4 * j + 1] = rgb[1];
				data[4 * j + 2] = rgb[2];
			}
		}
		coloredFontCanvas.getContext('2d').putImageData(fontImageData, 0, 0);
		fontImages.push(coloredFontCanvas);
	}
};

exports.draw = function(ctx, text, x, y, col){
	for(var i=0; i<text.length; i++){
		var index = chars.indexOf(text[i]);
		if(index !== -1){
			ctx.drawImage(
				fontImages[col],
				index * (fontX), 0,
				fontX, fontY,
				x + (fontX) * i, y,
				fontX, fontY
			);
		}
	}
};

exports.load = function(callback){
	var im = new Image();
	im.onload = function(){
		callback(im);
	};
	// To decode, use e.g. http://codebeautify.org/base64-to-image-converter
	// To encode, use e.g. https://www.base64-image.de/
	im.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAP8AAAAFAgMAAAD3b9ImAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAJUExURQAAAAAAAAQAAIRqQRwAAAABdFJOUwBA5thmAAAAsUlEQVQY0zWQsRUEIQhECQgunMACDK8MgimAYAra8ErZMm/w7YI+RYX5EtJqT0os9RK0xDHJ51RJioCAXpEVhKPV3sX+/iKCLFYVARc4mYWzJJHpqyT9KssOwDIIjGXsa38i1MXuGoUaXbamgCU5MFIOQawp4ExvJZwg9r7vl4CHYOSbiflPGqrSDPZw3ksQEzwEv325wMgYXm11di02lkl1LGckalLcg9GNpwfQvt2DP44jOjkDqW8fAAAAAElFTkSuQmCC";
};
},{"./utils":9}],4:[function(require,module,exports){
exports.hello = function(){
	console.log([
		'CARTRIDGE.JS',
		'JavaScript retro game engine.',
		'',
		'For help, run help().'
	].join('\n'));
};

exports.print = function(){
	console.log([
		'fullscreen()      Enable full screen.',
		'help()            Print this message.',
		'load("name")      Load sprites and map from localStorage.',
		'save("name")      Save sprites and map to localStorage.',
		'save("name.json") Download the contents to a JSON file.'
	].join('\n'));
};
},{}],5:[function(require,module,exports){
var help = require('./help');
var input = require('./input');
var utils = require('./utils');
var font = require('./font');
var math = require('./math');
var colors = require('./colors');
var sfx = require('./sfx');

// Constants
var cellsizeX = 8; // pixels
var cellsizeY = 8; // pixels
var screensizeX = 128; // pixels
var screensizeY = 128; // pixels
var mapSizeX = 128; // cells
var mapSizeY = 32; // cells
var spriteSheetSizeX = 16; // sprites
var spriteSheetSizeY = 16; // sprites

var maxSprites = spriteSheetSizeX * spriteSheetSizeY; // sprites

// DOM elements
var container;
var canvases = [];

// Listeners/callbacks
var canvasListeners;
var bodyListeners;

var mapData = utils.zeros(mapSizeX * mapSizeY);
var mapDataDirty = utils.zeros(mapSizeX * mapSizeY); // dirtiness per cell
var mapDirty = true; // is all of the map dirty?
var mapCacheCanvas;
var mapCacheContext;
var spriteSheetCanvas;
var spriteSheetContext;
var spriteFlags = utils.zeros(maxSprites);
var ctx;
var _time = 0;
var camX = 0;
var camY = 0;
var palette;
var paletteHex;
var defaultColor = 0;
var transparentColors = utils.zeros(16).map(function(){ return false; });
transparentColors[0] = true;
var loaded = false; // Loaded state
var _alpha = 0;
var code = '';

exports.cartridge = function(options){
	screensizeX = options.width !== undefined ? options.width : 128;
	screensizeY = options.height !== undefined ? options.height : 128;
	cellsizeX = options.cellwidth !== undefined ? options.cellwidth : 8;
	cellsizeY = options.cellheight !== undefined ? options.cellheight : 8;

	var numCanvases = options.layers !== undefined ? options.layers : 1;
	container = options.containerId ? document.getElementById(options.containerId) : null;
	container.innerHTML = '';
	for(var i=0; i<numCanvases; i++){
		container.innerHTML += '<canvas class="cartridgeCanvas" id="cartridgeCanvas'+i+'" width="' + screensizeX + '" height="' + screensizeY + '"' + (i === 0 ? ' moz-opaque' : '') + '></canvas>';
	}

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

	if(options.palette){
		setPalette(options.palette);
	} else {
		setPalette(colors.defaultPalette());
	}

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

	// Init spritesheet canvas
	spriteSheetCanvas = utils.createCanvas(spriteSheetSizeX * cellsizeX, spriteSheetSizeY * cellsizeY);
	spriteSheetContext = spriteSheetCanvas.getContext('2d');

	// Init map cache
	mapCacheCanvas = utils.createCanvas(mapSizeX * cellsizeX, mapSizeY * cellsizeY);
	mapCacheContext = mapCacheCanvas.getContext('2d');

	// Set main canvas
	canvas(0);

	input.init(canvases);
	fit();

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
				if(loaded && typeof(_update) !== 'undefined'){
					try {
						_update();
					} catch(err){
						console.error(err);
					}
				}
			}
			accumulator1 += frameTime;
			while ( accumulator1 >= dt1 ){
				_time = t1;
				t1 += dt1;
				accumulator1 -= dt1;
				_alpha = accumulator1 / dt1;
				if(loaded && typeof(_update60) !== 'undefined'){
					try {
						_update60();
					} catch(err){
						console.error(err);
					}
				}
			}
		}
		_time = newTime;
		if(loaded && typeof(_draw) !== 'undefined'){
			try {
				_draw();
			} catch(err){
				console.error(err);
			}
		}
		currentTime = newTime;
		input.update();
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);

	// Init font
	font.load(function(image){
		font.init(image, palette);

		if(code){
			// Run code. If there's an error, let it throw.
			eval.call(null, code);
		}

		// Run the _load function
		if(typeof(_load) !== 'undefined'){
			try {
				_load(postLoad);
			} catch(err){
				console.error(err);
				postLoad(err);
			}
		} else {
			postLoad();
		}
	});
};

function postLoad(err){
	loaded = true;
	if(typeof(_init) !== 'undefined'){
		try {
			_init();
		} catch(err){
			console.error(err);
		}
	}
}

function setPalette(p){
	palette = p.slice(0);
	paletteHex = palette.map(colors.int2hex);
	mapDirty = true;
}

function resizeCanvases(){
	sgetData = null;
	for(var i=0; i < canvases.length; i++){
		canvases[i].width = screensizeX;
		canvases[i].height = screensizeY;
	}
	fit();
}

exports.alpha = function(){ return _alpha; }; // for interpolation
exports.width = function(newWidth){
	if(newWidth !== undefined){
		screensizeX = newWidth;
		resizeCanvases();
	}
	return screensizeX;
};
exports.height = function(newHeight){
	if(newHeight !== undefined){
		screensizeY = newHeight;
		resizeCanvases();
	}
	return screensizeY;
};
exports.cellwidth = function(){ return cellsizeX; };
exports.cellheight = function(){ return cellsizeY; };

exports.cls = function(){
	ctx.clearRect(-camX,-camY,screensizeX,screensizeY);
};

exports.time = function(){
	return _time / 1000;
};

exports.color = function(col){
	defaultColor = col;
};

exports.palt = function(col, t){
	transparentColors[col] = t;
};

exports.rectfill = function rectfill(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;

	var w = x1 - x0 + 1;
	var h = y1 - y0 + 1;
	ctx.fillStyle = paletteHex[col];
	ctx.fillRect(x0, y0, w, h);
};

exports.rect = function rect(x0, y0, x1, y1, col){
	// Floor coords
	x0 = x0 | 0;
	y0 = y0 | 0;
	x1 = x1 | 0;
	y1 = y1 | 0;
	col = col !== undefined ? col : defaultColor;

	var w = x1 - x0;
	var h = y1 - y0;
	ctx.fillStyle = paletteHex[col];
	ctx.fillRect(x0, y0, w, 1);
	ctx.fillRect(x0, y0, 1, h);
	ctx.fillRect(x1, y0, 1, h+1);
	ctx.fillRect(x0, y1, w+1, 1);
};

exports.clip = function(x,y,w,h){
	x = x | 0;
	y = y | 0;
	w = w | 0;
	h = h | 0;

	ctx.rect(x,y,w,h);
	ctx.clip();
};

exports.canvas = function canvas(n){
	ctx = canvases[n].getContext('2d');
};

exports.camera = function camera(x, y){
	x = x | 0;
	y = y | 0;
	if(camX === x && camY === y) return;

	ctx.translate(x - camX, y - camY);
	camX = x;
	camY = y;
};

exports.map = function map(cel_x, cel_y, sx, sy, cel_w, cel_h, layer){
	layer = layer === undefined ? 0 : layer;

	var i,j;

	if(layer === 0){
		// Update invalidated map cache
		if(mapDirty){
			for(i=0; i<mapSizeX; i++){
				for(j=0; j<mapSizeY; j++){
					updateMapCacheCanvas(i,j);
				}
			}
			mapDirty = false;
		}
		for(i=0; i<mapSizeX; i++){
			for(j=0; j<mapSizeY; j++){
				if(mapDataDirty[j * mapSizeX + i]){
					updateMapCacheCanvas(i,j);
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

// Returns the sprite X position in the 16x16 spritesheet
function ssx(n){
	return n % 16;
}

// Returns the sprite Y position in the 16x16 spritesheet
function ssy(n){
	return Math.floor(n / 16) % (16 * 16);
}

exports.spr = function spr(n, x, y, w, h, flip_x, flip_y){
	w = w !== undefined ? w : 1;
	h = h !== undefined ? h : 1;
	flip_x = flip_x !== undefined ? flip_x : false;
	flip_y = flip_y !== undefined ? flip_y : false;
	var sizex = cellsizeX * w;
	var sizey = cellsizeY * h;
	ctx.save();
	ctx.translate(
		x + (flip_x ? sizex : 0),
		y + (flip_y ? sizey : 0)
	);
	ctx.scale(flip_x ? -1 : 1, flip_y ? -1 : 1);
	ctx.drawImage(
		spriteSheetCanvas,
		ssx(n) * cellsizeX, ssy(n) * cellsizeY,
		sizex, sizey,
		0, 0,
		sizex, sizey
	);
	ctx.restore();
};

// Get sprite flags
exports.fget = function(n){
	return spriteFlags[n];
};

// Set sprite flags
exports.fset = function(n, flags){
	spriteFlags[n] = flags;
};

// Get pixel color
exports.pget = function(x, y){
	var data = ctx.getImageData(x, y, x+1, y+1).data;
	var col = utils.rgbToDec(data[0], data[1], data[2]);
	return palette.indexOf(col);
};

// Set pixel color
// TODO: draw to a separate canvas and "flush" it when another command is executed
exports.pset = function(x, y, col){
	rectfill(x,y,x+1,y+1,col);
};

// Get spritesheet pixel color
var sgetData = null;
exports.sget = function(x, y){
	if(!sgetData){
		sgetData = spriteSheetContext.getImageData(0, 0, screensizeX, screensizeY).data;
	}
	var p = screensizeX * 4 * y + x * 4;
	var col = utils.rgbToDec(
		sgetData[p + 0],
		sgetData[p + 1],
		sgetData[p + 2]
	);
	return palette.indexOf(col);
};

// Set spritesheet pixel color
exports.sset = function(x, y, col){
	col = col !== undefined ? col : defaultColor;
	if(transparentColors[col]){
		spriteSheetContext.clearRect(x, y, 1, 1);
	} else {
		spriteSheetContext.fillStyle = paletteHex[col % palette.length];
		spriteSheetContext.fillRect(x, y, 1, 1);
	}
	mapDirty = true; // TODO: Only invalidate matching map positions
	sgetData = null;
};

exports.fullscreen = function fullscreen(){
	utils.fullscreen(container);
};

exports.print = function(text, x, y, col){
	if(Array.isArray(text)){
		for(var i=0; i<text.length; i++){
			exports.print(text[i], x, y + 8*i, col);
		}
		return;
	}
	x = x !== undefined ? x : 0;
	y = y !== undefined ? y : 0;
	col = col !== undefined ? col : defaultColor;
	font.draw(ctx, text.toUpperCase(), x, y, col);
};

exports.fit = function fit(){
	var i = canvases.length;
	while(i--){
		utils.scaleToFit(canvases[i], container);
	}
};

exports.mget = function mget(x, y){
	return mapData[y * mapSizeX + x];
};

exports.mset = function mset(x, y, i){
	if(mget(x,y) === i) return;

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

exports.load = function(key){
	key = key || 'save';
	try{
		var data = JSON.parse(localStorage.getItem(key));
		loadJSON(data);
		return true;
	} catch(err) {
		return false;
	}
};

exports.codeset = function(codeString){
	code = codeString;
};

exports.codeget = function(){
	return code;
};

function download(key){
	key = key || 'export';
	var data = toJSON();
	var url = URL.createObjectURL(new Blob([JSON.stringify(data)]));
	var a = document.createElement('a');
	a.href = url;
	a.download = key + '.json';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function toJSON(){
	var data = {
		version: 3,
		width: screensizeX, // added in v3
		height: screensizeY, // added in v3
		map: [],
		sprites: [],
		flags: [],
		palette: palette.slice(0),
		sfx: [],
		code: codeget() // added in v2
	};
	for(var i=0; i<spriteFlags.length; i++){
		data.flags[i] = fget(i);
	}
	for(var i=0; i<spriteSheetSizeX*cellwidth(); i++){
		for(var j=0; j<spriteSheetSizeY*cellheight(); j++){
			data.sprites[j*spriteSheetSizeX*cellwidth()+i] = sget(i,j);
		}
	}
	for(var i=0; i<mapSizeX; i++){
		for(var j=0; j<mapSizeY; j++){
			data.map[j*mapSizeX+i] = mget(i,j);
		}
	}

	for(var n=0; n<64; n++){
		data.sfx[n] = {
			speed: asget(n),
			volumes: [],
			pitches: [],
			waves: []
		};
		for(var offset=0; offset<32; offset++){
			data.sfx[n].volumes.push(avget(n, offset));
			data.sfx[n].pitches.push(afget(n, offset));
			data.sfx[n].waves.push(awget(n, offset));
		}
	}

	return data;
}

function loadJSON(data){
	codeset(data.code || '');
	if(data.width !== undefined){
		width(data.width);
	}
	if(data.height !== undefined){
		height(data.height);
	}
	for(var i=0; i<spriteFlags.length; i++){
		fset(i, data.flags[i]);
	}
	for(var i=0; i<spriteSheetSizeX*cellwidth(); i++){
		for(var j=0; j<spriteSheetSizeY*cellheight(); j++){
			sset(i,j,data.sprites[j*spriteSheetSizeX*cellwidth()+i]);
		}
	}
	for(var i=0; i<mapSizeX; i++){
		for(var j=0; j<mapSizeY; j++){
			mset(i,j,data.map[j*mapSizeX+i]);
		}
	}
	setPalette(data.palette);

	for(var n=0; n<data.sfx.length; n++){
		asset(n, data.sfx[n].speed);
		for(var offset=0; offset<data.sfx[n].volumes.length; offset++){
			avset(n, offset, data.sfx[n].volumes[offset]);
			afset(n, offset, data.sfx[n].pitches[offset]);
			awset(n, offset, data.sfx[n].waves[offset]);
		}
	}
};

exports.loadjson = loadJSON;

function updateMapCacheCanvas(x,y){
	var n = mget(x, y);
	mapCacheContext.clearRect(x * cellsizeX, y * cellsizeY, cellsizeX, cellsizeY);
	mapCacheContext.drawImage(
		spriteSheetCanvas,
		ssx(n) * cellsizeX, ssy(n) * cellsizeY,
		cellsizeX, cellsizeY,
		cellsizeX * x, cellsizeY * y,
		cellsizeX, cellsizeY
	);
}

exports.help = function(){
	help.print();
};

exports.mousex = function(){
	return Math.floor(input.mousexNormalized() * screensizeX);
};

exports.mousey = function(){
	return Math.floor(input.mouseyNormalized() * screensizeY);
};

utils.makeGlobal(math);
utils.makeGlobal(sfx);
utils.makeGlobal(exports);
utils.makeGlobal(input.global);

help.hello();
help.print();
},{"./colors":2,"./font":3,"./help":4,"./input":6,"./math":7,"./sfx":8,"./utils":9}],6:[function(require,module,exports){
var math = require('./math');

function defaultKeyMap(player){
	if(player === 1){
		return {
			0: 37, // left
			2: 38, // up
			1: 39, // right
			3: 40, // down
			4: 90, // z
			5: 88 // x
		};
	} else if(player === 2){
		return {
			0: 83, // S
			2: 69, // E
			1: 70, // F
			3: 68, // D
			4: 65, // A
			5: 81 // Q
		};
	}

	return null;
}

var keyboardStates = {};
var keyboardStatesPrev = {};
var keyMap0 = defaultKeyMap(1);
var keyMap1 = defaultKeyMap(2);
var _mousex = 0;
var _mousey = 0;
var _mousebtns = {};
var gamepads = [];
var stickSensitivity = 0.1;

function buttonPressed(b) {
  if (typeof(b) == "object") {
    return b.pressed;
  }
  return b == 1.0;
}

exports.btn = function btn(i, player){
	player = player !== undefined ? player : 1;
	var keyCode = 0;

	if(player === 1 || player === 2){
		if(player === 1){
			keyCode = keyMap0[i];
		} else if(player === 2){
			keyCode = keyMap1[i];
		}
		return !!keyboardStates[keyCode];
	} else if(player === 3){
		if(gamepads[0]){
			if(i === 4) return buttonPressed(gamepads[0].buttons[0]);
			else if(i === 5) return buttonPressed(gamepads[0].buttons[1]);
			else if(i === 0) return gamepads[0].axes[0] < -stickSensitivity;
			else if(i === 1) return gamepads[0].axes[0] > stickSensitivity;
			else if(i === 2) return gamepads[0].axes[1] < -stickSensitivity;
			else if(i === 3) return gamepads[0].axes[1] > stickSensitivity;
		}
	}
};

exports.btnp = function btnp(i, player){
	player = player !== undefined ? player : 1;
	var keyCode = 0;

	if(player === 1 || player === 2){
		if(player === 1){
			keyCode = keyMap0[i];
		} else if(player === 2){
			keyCode = keyMap1[i];
		}
		return !!keyboardStatesPrev[keyCode];
	} else if(player === 3){
		// TODO
		return false;
	}
};

exports.update = function (){
	var keys = Object.keys(keyboardStates);
	for(var i=0; i<keys.length; i++){
		keyboardStatesPrev[keys[i]] = keyboardStates[keys[i]];
	}
	updateGamepads();
};

exports.init = function(canvases){
	addInputListeners(canvases);
};

exports.mousex = function mousex(){
	return _mousex;
};

exports.mousey = function mousey(){
	return _mousey;
};

exports.mousebtn = function mousebtn(i){
	return !!_mousebtns[i];
};

var clickListener = null;
exports.click = function(callback){
	clickListener = callback || null;
};

function addInputListeners(canvases){
	canvasListeners = {
		click: function(evt){
			if(clickListener !== null){
				updateMouseCoords(evt, canvases);
				_mousebtns[evt.which] = true;
				clickListener();
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
		}
	};
	for(var key in canvasListeners){
		canvases[0].addEventListener(key, canvasListeners[key]);
	}

	bodyListeners = {
		keydown: function(e){
			keyboardStates[e.keyCode] = 1;
		},
		keyup: function(e){
			keyboardStates[e.keyCode] = 0;
		},
		mousemove: function(evt){
			updateMouseCoords(evt, canvases);
		}
	};
	for(var key in bodyListeners){
		document.body.addEventListener(key, bodyListeners[key]);
	}
}

function removeInputListeners(canvases){
	for(var key in canvasListeners){
		canvases[0].removeEventListener(key, canvasListeners[key]);
	}
	for(var key in bodyListeners){
		document.body.removeEventListener(key, bodyListeners[key]);
	}
}

function updateMouseCoords(evt, canvases){
	if(canvases.indexOf(evt.target) === -1) return;

	var rect = evt.target.getBoundingClientRect(); // cache this?
	var parentRect = evt.target.parentNode.getBoundingClientRect(); // cache this?
	var subx = 0;
	var suby = 0;
	/*if(rect.width / rect.height > parentRect.width / parentRect.height){
		subx = (parentRect.width - rect.width) * 0.5;
	} else {
		suby = (parentRect.height - rect.height) * 0.5;
	}*/
	_mousex = (evt.clientX - rect.left - subx) / rect.width;
	_mousey = (evt.clientY - rect.top - suby) / rect.height;
}

function updateGamepads() {
  gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
}

exports.mousexNormalized = function(){
	return _mousex;
};

exports.mouseyNormalized = function(){
	return _mousey;
};

exports.global = {
	btn: exports.btn,
	btnp: exports.btnp,
	mousebtn: exports.mousebtn,
	click: exports.click
};

},{"./math":7}],7:[function(require,module,exports){
module.exports = {
	sin: Math.sin,
	cos: Math.cos,
	flr: Math.floor,
	ceil: Math.ceil,
	rnd: function (x){ return Math.random() * x; },
	abs: Math.abs,
	atan2: Math.atan2,
	max: Math.max,
	min: Math.min,
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
},{}],8:[function(require,module,exports){
var utils = require('./utils');
var DFT = require('dsp.js/dsp').DFT;
var minFrequency = 0;
var maxFrequency = 1000;

var context = new createAudioContext();
var masterGain = context.createGain();
masterGain.gain.value = 1;
masterGain.connect(context.destination);

var oscillatorTypes = [
	'sine',
	'square',
	'triangle',
	'sawtooth'
];

var allTypes = oscillatorTypes.concat([
	'square25',
	'white'
]);

var channels = [];
for(var j=0; j<4; j++){
	var channel = {
		oscillators: {},
		gains: {},
		occupiedUntil: -1
	};
	channels.push(channel);

	// add 4 basic oscillators and gains to channel
	for(var i=0; i<oscillatorTypes.length; i++){
		var osc = context.createOscillator();
		var type = oscillatorTypes[i];
		osc.type = type;

		var gain = context.createGain();
		gain.gain.value = 0;
		gain.connect(masterGain);

		osc.connect(gain);
		channel.oscillators[type] = osc;
		channel.gains[type] = gain;
		osc.start(context.currentTime);
	}

	// Add square25 / pulse
	var gain = context.createGain();
	gain.gain.value = 0;
	gain.connect(masterGain);
	var square25 = createPulse(gain);
	channel.oscillators.square25 = square25;
	channel.gains.square25 = gain;
	square25.start(context.currentTime);

	// Add white noise
	gain = context.createGain();
	gain.gain.value = 0;
	gain.connect(masterGain);
	var whiteNoise = createWhiteNoise(gain);
	channel.oscillators.white = whiteNoise;
	channel.gains.white = gain;
	whiteNoise.start(context.currentTime);
}

var maxEffects = 64;
var effects = [];
for(var i=0; i<maxEffects; i++){
	effects.push({
		types: utils.zeros(maxEffects),
		frequencies: utils.zeros(maxEffects),
		volumes: utils.zeros(maxEffects),
		speed: 16
	});
}

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
	var osc = channel.oscillators[allTypes[types[offset+0]]];
	var gain = channel.gains[allTypes[types[offset+0]]];
	gain.gain.value = volumes[offset+0] / 255;
	if(osc.frequency){ // noises dont have frequency
		osc.frequency.value = frequencies[offset+0] / 255 * (maxFrequency - minFrequency) + minFrequency;
	}

	// Get the length by looking at the volume values
	var endPosition = 0;
	for(i=0; i<volumes.length; i++){
		if(volumes[i]){
			endPosition = i + 1;
		}
	}
	if(endPosition === 0) return;

	var currentTime = context.currentTime;
	for(i=offset; i<endPosition; i++){
		var type = allTypes[types[i]];
		osc = channel.oscillators[type];

		var startTime = currentTime + i / speed;

		for(j=0; j<allTypes.length; j++){ // todo: do one type at a time !
			gain = channel.gains[allTypes[j]];

			// Set other gains to zero
			if(allTypes[j] !== type){
				gain.gain.setValueAtTime(0, startTime);
			} else {
				if(osc.frequency){ // noise doesn't have frequency
					osc.frequency.setValueAtTime(frequencies[i] / 255 * (maxFrequency - minFrequency) + minFrequency, startTime);
				}
				var vol = volumes[i] / 255;
				gain.gain.setValueAtTime(vol, startTime);
			}
		}
	}

	// Set the volume at the end to zero
	var len = (endPosition-offset) / speed;
	var endTime = currentTime + len;
	for(j=0; j<allTypes.length; j++){
		gain = channel.gains[allTypes[j]];
		gain.gain.setValueAtTime(0, endTime);
	}

	channel.occupiedUntil = endTime;
}

// Speed is 0 to 255
exports.asset = function(n, speed){ effects[n].speed = speed; };
exports.asget = function(n){ return effects[n].speed; };

// volume is 0 to 255
exports.avset = function(n, offset, volume){ effects[n].volumes[offset] = volume; };
exports.avget = function(n, offset){ return effects[n].volumes[offset]; };

// frequency is 0 to 255
exports.afset = function(n, offset, frequency){ effects[n].frequencies[offset] = frequency; };
exports.afget = function(n, offset){ return effects[n].frequencies[offset]; };

// wave is 0,1,2,3,4
exports.awset = function(n, offset, waveform){ effects[n].types[offset] = waveform; };
exports.awget = function(n, offset){ return effects[n].types[offset]; };

exports.sfx = function(n, channelIndex, offset){
	channelIndex = channelIndex !== undefined ? channelIndex : -1;
	offset = offset !== undefined ? offset : 0;

	var effect = effects[n];
	if(!effect){
		return false;
	}

	var contextTime = context.currentTime;
	if(channelIndex === -1){
		// Find good channel
		for(var i=0; i<channels.length; i++){
			var candidateIndex = i;
			if(channels[candidateIndex].occupiedUntil < contextTime){
				channelIndex = candidateIndex;
				break;
			}
		}
	} else if(channels[channelIndex].occupiedUntil >= contextTime){
		return false;
	}

	if(!channels[channelIndex]){
		return false;
	}

	play(channels[channelIndex], effect.types, effect.frequencies, effect.volumes, effect.speed, offset);

	return true;
};

function createWhiteNoise(destination) {
	var bufferSize = 2 * context.sampleRate,
		noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate),
		output = noiseBuffer.getChannelData(0);
	for (var i = 0; i < bufferSize; i++) {
		output[i] = Math.random() * 2 - 1;
	}

	var whiteNoise = context.createBufferSource();
	whiteNoise.buffer = noiseBuffer;
	whiteNoise.loop = true;

	whiteNoise.connect(destination);

	return whiteNoise;
}

function createPulse(destination){
	var count = 128;
	var vals2 = [];
	for (var i = 0; i < count; i++) {
		var x = i / count;
		var val = x < 0.25 ? -1 : 1;
		vals2.push(val);
	}

 	var a = new DFT(vals2.length);
	a.forward(vals2);
	var hornTable = context.createPeriodicWave(
		new Float32Array(a.real), // DFT outputs Float64Array but only Float32Arrays are allowed in createPeriodicWave
		new Float32Array(a.imag)
	);

	osc = context.createOscillator();
	osc.setPeriodicWave(hornTable);
	osc.connect(destination);

	return osc;
}

},{"./utils":9,"dsp.js/dsp":1}],9:[function(require,module,exports){
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
};

exports.makeGlobal = function(obj){
	for(var key in obj){
		window[key] = obj[key];
	}
};

exports.scaleToFit = function scaleToFit(element, containerElement){
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

	// "Pixel perfect" mode
	scale = Math.floor(scale);

	var offsetX = (containerWidth - element.width * scale) * 0.5;
	var offsetY = (containerHeight - element.height * scale) * 0.5;

	// Safari doesn't have nearest neighbor rendering when using CSS3 scaling
	if (isSafari()){
		element.style.width = element.style.height = Math.min(containerWidth, containerHeight) + "px";
		element.style.marginLeft = offsetX + 'px';
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

exports.zeros = function(n){
	var a = [];
	while(n--){
		a.push(0);
	}
	return a;
};

exports.createCanvas = function(w,h){
	var canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	return canvas;
}
},{}]},{},[5]);
