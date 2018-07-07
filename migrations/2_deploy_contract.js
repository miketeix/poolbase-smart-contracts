const PoolbaseFactory = artifacts.require('./PoolbaseFactory');
const PoolbaseEventEmitter = artifacts.require('./PoolbaseEventEmitter');
const PoolContract = artifacts.require('./Poolbase');

module.exports = async function(
    deployer,
    network,
    [coinbaseAccount, poolAdmin]
) {
    await deployer.deploy(PoolbaseFactory);
    await deployer.deploy(PoolbaseEventEmitter);

    const poolParams = {
        superBouncers: [coinbaseAccount],
        maxAllocation: 200e18,
        adminPoolFee: [5, 1000],
        poolbaseFee: [5, 1000],
        isAdminFeeInWei: true,
        payoutWallet: coinbaseAccount,
        adminPayoutWallet: coinbaseAccount,
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
    console.log('poolAddress', poolAddress);

    const poolInstance = PoolContract.at(poolAddress);

    const isAdminFeeInWei = await poolInstance.isAdminFeeInWei();
    console.log('isAdminFeeInWei', isAdminFeeInWei);

    const maxAllocation = await poolInstance.maxAllocation();
    console.log('poolInstance.maxAllocation', maxAllocation);
};
