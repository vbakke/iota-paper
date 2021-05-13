const iota = require('@iota/iota.js');

const prefix = 'iota'; // nodeInfo.bech32HRP;


function generateAddresses(seed, count) {
    count = count || 1;

// let  randomMnemonic = iota.Bip39.randomMnemonic();
// randomMnemonic = 'useless job abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon check';
// console.log("\tMnemonic:", randomMnemonic)
// let entropy = iota.Bip39.mnemonicToEntropy(seed);
// console.log("\tEntropy:", entropy)

    // Generate the seed from the Mnemonic
    let  baseSeed = iota.Ed25519Seed.fromMnemonic(seed);
    console.log("\tSeed", iota.Converter.bytesToHex(baseSeed.toBytes()));

    // Generate the next addresses for your account.
    console.log();
    console.log("Generated Addresses using Bip44 Format");
    const addressGeneratorAccountState = {
        accountIndex: 0,
        addressIndex: 0,
        isInternal: false
    };
    let addresses = [];
    for (let i = 0; i < count; i++) {
        const path = iota.generateBip44Address(addressGeneratorAccountState, i === 0);

        console.log(`Wallet Index ${path}`);

        const addressSeed = baseSeed.generateSeedFromPath(new iota.Bip32Path(path));
        const addressKeyPair = addressSeed.keyPair();

        console.log("\tPrivate Key", iota.Converter.bytesToHex(addressKeyPair.privateKey));
        console.log("\tPublic Key", iota.Converter.bytesToHex(addressKeyPair.publicKey));

        const indexEd25519Address = new iota.Ed25519Address(addressKeyPair.publicKey);
        const indexPublicKeyAddress = indexEd25519Address.toAddress();
        console.log("\tAddress Ed25519", iota.Converter.bytesToHex(indexPublicKeyAddress));
        console.log("\tAddress Bech32", iota.Bech32Helper.toBech32(iota.ED25519_ADDRESS_TYPE, indexPublicKeyAddress, prefix));
        console.log();
        let address = iota.Bech32Helper.toBech32(iota.ED25519_ADDRESS_TYPE, indexPublicKeyAddress, prefix);
        addresses.push(address);
    }

    return addresses;
}



module.exports = {
    generateAddresses,
}