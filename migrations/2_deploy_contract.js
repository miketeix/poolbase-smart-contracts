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

  const receipt = await factoryInstance.create(...params, {
      from: coinbaseAccount
  });
  const poolAddress = receipt.logs[0].address;
  console.log('poolAddress', poolAddress);
  
  // const isAdminFeeInWei = await poolInstance.isAdminFeeInWei();
  // console.log('isAdminFeeInWei', isAdminFeeInWei);

  // console.log('poolInstance.maxAllocation', poolInstance.maxAllocation);
};
