var fs = require('fs');
var path = require('path');

const PoolbaseFactory = artifacts.require('./PoolbaseFactory');
const PoolbaseEventEmitter = artifacts.require('./PoolbaseEventEmitter');
const PoolContract = artifacts.require('./Poolbase');
const addressesPath = path.join(__dirname, '../addresses');

module.exports = async function(
    deployer,
    network,
    [coinbaseAccount, poolAdmin]
) {
    await deployer.deploy(PoolbaseFactory);
    await deployer.deploy(PoolbaseEventEmitter);

    writeAddressFile(PoolbaseFactory, 'poolbaseFactory');
    writeAddressFile(PoolbaseEventEmitter, 'poolbaseEventEmitter');

    const poolParams = {
        superBouncers: [coinbaseAccount],
        maxAllocation: 200e18,
        adminPoolFee: [5, 1000],
        poolbaseFee: [5, 1000],
        isAdminFeeInWei: true,
        payoutWallet: coinbaseAccount,
        adminPayoutWallet: poolAdmin,
        poolbasePayoutWallet: coinbaseAccount,
        eventEmitterContract: PoolbaseEventEmitter.address,
        admins: [poolAdmin]
    };

    const factoryInstance = PoolbaseFactory.at(PoolbaseFactory.address);
    const params = [...Object.values(poolParams)];

    await factoryInstance.create(...params, {
        from: coinbaseAccount
    });

    const poolAddress = await factoryInstance.instantiations.call(
        coinbaseAccount,
        0
    );

    const poolInstance = PoolContract.at(poolAddress);
};

const writeAddressFile = (contract, filename) => {
    fs.writeFile(`${addressesPath}/${filename}`, contract.address, function(
        err
    ) {
        if (err) {
            return console.log(err);
        }
        console.log('The filename file was saved!');
    });
};
