/**
 * Polyfill for crypto.subtle on non-secure origins (http:// IP addresses).
 * Web Crypto's SubtleCrypto is only available on localhost, https:, and file:
 * in most browsers. vinext's RSC prefetch setup calls crypto.subtle.digest,
 * so we provide a minimal SHA-256-style 32-byte deterministic hash fallback.
 */

(function () {
  if (typeof globalThis === "undefined") {
    if (typeof window !== "undefined") window.globalThis = window;
    else if (typeof self !== "undefined") self.globalThis = self;
  }

  var cryptoObj = globalThis.crypto;
  if (!cryptoObj || cryptoObj.subtle) {
    // Nothing to do: crypto missing or already has subtle (secure origin).
    return;
  }

  // Simple deterministic 32-byte hash. Not cryptographically secure,
  // but sufficient for RSC prefetch URL cache keys.
  function mixHash(dataView) {
    var bytes = new Uint8Array(dataView);
    var hash = new Uint8Array(32);
    var state = new Uint32Array(8);
    // Initial 256-bit state: first 8 sqrt/prime fractional bits.
    state[0] = 0x6a09e667;
    state[1] = 0xbb67ae85;
    state[2] = 0x3c6ef372;
    state[3] = 0xa54ff53a;
    state[4] = 0x510e527f;
    state[5] = 0x9b05688c;
    state[6] = 0x1f83d9ab;
    state[7] = 0x5be0cd19;

    for (var i = 0; i < bytes.length; i++) {
      state[i % 8] =
        Math.imul(state[i % 8] ^ bytes[i], 0x85ebca77) + (state[i % 8] << 13);
      if (i % 8 === 7) {
        for (var r = 0; r < 8; r++) {
          state[r] = (state[r] ^ state[(r + 1) % 8]) + state[(r + 4) % 8];
        }
      }
    }

    var out = new DataView(hash.buffer);
    for (var j = 0; j < 8; j++) {
      out.setUint32(j * 4, state[j], false);
    }
    return hash.buffer;
  }

  function normalizeData(data) {
    if (data instanceof ArrayBuffer) return data;
    if (data.buffer instanceof ArrayBuffer && data.byteLength !== undefined) {
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    if (typeof data === "string") {
      var enc = new TextEncoder();
      return enc.encode(data).buffer;
    }
    throw new Error("Unsupported data type for crypto.subtle.digest");
  }

  var subtlePolyfill = {
    digest: function (algorithm, data) {
      var name = (algorithm && (typeof algorithm === "string" ? algorithm : algorithm.name)) || "SHA-256";
      if (name !== "SHA-256" && name !== "SHA-1" && name !== "SHA-384" && name !== "SHA-512") {
        return Promise.reject(new DOMException("Unsupported algorithm: " + name, "NotSupportedError"));
      }
      try {
        return Promise.resolve(mixHash(normalizeData(data)));
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };

  try {
    cryptoObj.subtle = subtlePolyfill;
  } catch (e) {
    try {
      Object.defineProperty(cryptoObj, "subtle", {
        value: subtlePolyfill,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch (e2) {
      // Cannot patch crypto. Provide a global fallback for code that checks it.
      globalThis.__subtleCryptoPolyfill = subtlePolyfill;
    }
  }
})();
