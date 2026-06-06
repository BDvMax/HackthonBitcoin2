"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var secp256k1 = __importStar(require("@bitcoinerlab/secp256k1"));
var descriptors_1 = require("@bitcoinerlab/descriptors");
var Output = (0, descriptors_1.DescriptorsFactory)(secp256k1).Output;
// Testnet xpubs!
var tpub1 = "tpubD6NzVbkrYhZ4XvtwtJAAVNFzGVq1K889Na8wnLddjVFgRmTXroMotMvMNmL2ddAXoEMcSox9Jr5uzqu8vvGPMq8UfQ9xXpVZKRwadPJWVZD";
var tpub2 = "tpubD6NzVbkrYhZ4Xq2ArdoixK1nWTiY7jmXA5nYPCosK7mAE5YThnejXwa7wE1pmMzFBc75Rm55EAFdcwXnCmWiNafeBtYy1MRnczRUcWjpK3Z";
function testDesc(desc) {
    try {
        var out = new Output({ descriptor: desc, network: require('bitcoinjs-lib').networks.testnet, index: 0 });
        console.log("SUCCESS:", desc);
    }
    catch (e) {
        console.error("FAIL:", desc, "\n  Error:", e.message);
    }
}
// Correctly constructed with and_v(v:multi)
testDesc("wsh(or_d(sortedmulti(2,".concat(tpub1, "/0/*,").concat(tpub2, "/0/*),and_v(v:multi(1,").concat(tpub1, "/0/*,").concat(tpub2, "/0/*),older(144))))"));
testDesc("wsh(or_d(multi(2,".concat(tpub1, "/0/*,").concat(tpub2, "/0/*),and_v(v:multi(1,").concat(tpub1, "/0/*,").concat(tpub2, "/0/*),older(144))))"));
