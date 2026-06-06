import * as secp256k1 from '@bitcoinerlab/secp256k1';
import { DescriptorsFactory } from '@bitcoinerlab/descriptors';

const { Output } = DescriptorsFactory(secp256k1);

const tpub1 = "tpubD6NzVbkrYhZ4XvtwtJAAVNFzGVq1K889Na8wnLddjVFgRmTXroMotMvMNmL2ddAXoEMcSox9Jr5uzqu8vvGPMq8UfQ9xXpVZKRwadPJWVZD";
const tpub2 = "tpubD6NzVbkrYhZ4Xq2ArdoixK1nWTiY7jmXA5nYPCosK7mAE5YThnejXwa7wE1pmMzFBc75Rm55EAFdcwXnCmWiNafeBtYy1MRnczRUcWjpK3Z";

function testDesc(desc: string) {
  try {
    const out = new Output({ descriptor: desc, network: require('bitcoinjs-lib').networks.testnet, index: 0 });
    console.log("SUCCESS:", desc);
  } catch (e: any) {
    console.error("FAIL:", desc, "\n  Error:", e.message);
  }
}

testDesc(`wsh(thresh(2,pk(${tpub1}/0/*),s:pk(${tpub2}/0/*),sdv:older(144)))`);
